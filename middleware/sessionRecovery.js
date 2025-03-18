/**
 * Session recovery middleware
 * This middleware helps recover from session issues by restoring lost session data
 */

const { db } = require('../prisma/database');

/**
 * Middleware to monitor and recover from session issues
 */
const sessionRecovery = async (req, res, next) => {
    // Check for session issues (user expected but not found)
    if (req.session && req.session.passport && req.session.passport.user && !req.user) {
        console.log('Detected session issue - attempting recovery for user ID:', req.session.passport.user);
        
        try {
            // Attempt to recover the user data
            const userId = req.session.passport.user;
            const user = await db.user.findUnique({
                where: { id: Number(userId) }
            });
            
            if (user) {
                console.log('Session recovery successful for user:', user.username || user.email);
                req.user = user;
                // Force session update
                req.session.touch();
                req.session.recovered = true;
                req.session.recoveredAt = new Date().toISOString();
            } else {
                console.log('Session recovery failed - user not found');
            }
        } catch (error) {
            console.error('Session recovery error:', error);
        }
    }
    
    next();
};

module.exports = sessionRecovery;
