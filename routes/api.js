const express = require('express');
const router = express.Router();
const { db } = require('../prisma/database');

// Session ping endpoint to keep sessions alive
router.get('/session-ping', (req, res) => {
    console.log('Session ping received:', req.sessionID);
    
    if (!req.user) {
        return res.json({ status: 'unauthenticated' });
    }
    
    // Touch the session
    req.session.lastPing = Date.now();
    req.session.touch();
    
    // Save session and return response
    req.session.save((err) => {
        if (err) {
            console.error('Error saving session during ping:', err);
            return res.status(500).json({ status: 'error', message: err.message });
        }
        
        return res.json({ 
            status: 'active',
            user: req.user.username || req.user.email,
            role: req.user.role
        });
    });
});

// Session recovery endpoint for admin users
router.post('/recover-session', async (req, res) => {
    try {
        // This endpoint should be called if a user suspects their session is lost
        const { adminId, token } = req.body;
        
        // Verify the admin user exists
        const user = await db.user.findUnique({
            where: { id: Number(adminId) }
        });
        
        if (user && user.role === 'admin') {
            console.log('Manually recovering session for admin:', user.username || user.email);
            
            // Restore the user to the session
            req.user = user;
            req.session.passport = { user: user.id };
            
            // Force save session
            req.session.save((err) => {
                if (err) {
                    console.error('Error saving recovered session:', err);
                    return res.status(500).json({ success: false, error: err.message });
                }
                
                return res.json({ 
                    success: true, 
                    message: 'Session recovered successfully',
                    user: { 
                        username: user.username || user.email,
                        role: user.role
                    }
                });
            });
        } else {
            return res.status(404).json({ success: false, error: 'Admin user not found' });
        }
    } catch (error) {
        console.error('Error in session recovery endpoint:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
