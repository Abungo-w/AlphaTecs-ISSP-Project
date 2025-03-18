/**
 * Authentication Persistence Middleware
 * Provides a fallback mechanism to keep users logged in even if session is lost
 */
const { db } = require('../prisma/database');

// Store admin tokens for emergency recovery
let adminTokens = {};

const authPersistence = async (req, res, next) => {
    try {
        // If user is already authenticated, set a recovery cookie
        if (req.user && req.user.role === 'admin') {
            // Create a secure token that can be used to recover the session
            const token = Math.random().toString(36).substring(2, 15) + 
                          Math.random().toString(36).substring(2, 15);
            
            // Store token with user ID mapping (with 30 min expiry)
            adminTokens[token] = {
                userId: req.user.id,
                expires: Date.now() + (30 * 60 * 1000)
            };
            
            // Clean expired tokens
            Object.keys(adminTokens).forEach(key => {
                if (adminTokens[key].expires < Date.now()) {
                    delete adminTokens[key];
                }
            });
            
            // Set a secure cookie with the token
            res.cookie('auth_recovery', token, {
                httpOnly: true,
                maxAge: 30 * 60 * 1000, // 30 minutes
                sameSite: 'lax',
                path: '/'
            });
        }
        
        // If not authenticated but we have a recovery cookie, try to recover
        if (!req.user && req.cookies && req.cookies.auth_recovery) {
            const token = req.cookies.auth_recovery;
            
            // Check if token is valid and not expired
            if (adminTokens[token] && adminTokens[token].expires > Date.now()) {
                const userId = adminTokens[token].userId;
                
                // Get user from database
                try {
                    const user = await db.user.findUnique({
                        where: { id: Number(userId) }
                    });
                    
                    if (user && user.role === 'admin') {
                        console.log('🔐 Recovered admin session from cookie token');
                        
                        // Restore user to session
                        req.user = user;
                        req.session.passport = { user: user.id };
                        
                        // Ensure session is saved
                        req.session.save();
                    }
                } catch (dbError) {
                    console.error('Database error during token recovery:', dbError);
                }
            }
        }
        
        next();
    } catch (error) {
        console.error('Auth persistence error:', error);
        next();
    }
};

module.exports = authPersistence;
