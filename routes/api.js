/**
 * API Routes for session handling and recovery
 */

const express = require('express');
const router = express.Router();
const { db } = require('../prisma/database');
const fs = require('fs');
const path = require('path');

// Session ping endpoint to keep sessions alive
router.get('/session-ping', (req, res) => {
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
            console.log('Manually recovering session for admin user');
            
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

// Debug endpoint to check modules directory
router.get('/debug/modules', (req, res) => {
    try {
        const moduleDir = path.join(__dirname, '..', 'modules');
        
        // Check if directory exists
        if (!fs.existsSync(moduleDir)) {
            return res.json({
                error: 'Modules directory not found',
                path: moduleDir
            });
        }
        
        // Get directory contents
        const files = fs.readdirSync(moduleDir);
        
        res.json({
            directory: moduleDir,
            exists: true,
            fileCount: files.length,
            files: files,
            jsonFiles: files.filter(file => file.endsWith('.json'))
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Add a modules endpoint to fetch all available modules
router.get('/modules', (req, res) => {
    try {
        const moduleDir = path.join(__dirname, '..', 'modules');
        
        // Check if directory exists
        if (!fs.existsSync(moduleDir)) {
            console.log('Modules directory not found:', moduleDir);
            return res.json([]);
        }
        
        // Read all module files
        const files = fs.readdirSync(moduleDir);
        
        // Process JSON files
        const modules = files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                try {
                    const content = JSON.parse(fs.readFileSync(path.join(moduleDir, file), 'utf-8'));
                    return {
                        code: content.moduleCode,
                        title: content.title
                    };
                } catch (error) {
                    console.error('Error reading module file:', file, error);
                    return null;
                }
            })
            .filter(Boolean);
            
        console.log(`Returning ${modules.length} modules`);
        res.json(modules);
    } catch (error) {
        console.error('Error fetching modules:', error);
        res.status(500).json({ error: 'Error fetching modules' });
    }
});

// Add module content endpoint
router.get('/modules/:moduleCode', (req, res) => {
    try {
        const moduleFile = path.join(__dirname, '..', 'modules', `${req.params.moduleCode}.json`);
        
        if (!fs.existsSync(moduleFile)) {
            return res.status(404).json({ 
                error: `Module ${req.params.moduleCode} not found` 
            });
        }
        
        const moduleContent = JSON.parse(fs.readFileSync(moduleFile, 'utf8'));
        res.json(moduleContent);
    } catch (error) {
        console.error('Error loading module:', error);
        res.status(500).json({ error: 'Error loading module content' });
    }
});

module.exports = router;
