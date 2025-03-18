/**
 * Session Hardener Middleware
 * Ensures session continuity for admin users and provides emergency recovery
 */
const { db } = require('../prisma/database');

// Keep a cache of admin users
const adminCache = new Map();

// Maximum age of cached admin data (4 hours)
const MAX_CACHE_AGE = 4 * 60 * 60 * 1000;

const sessionHardener = async (req, res, next) => {
    try {
        // Store admin data in cache when available
        if (req.user && req.user.role === 'admin') {
            adminCache.set(req.user.id, {
                user: req.user,
                timestamp: Date.now()
            });
            
            // Clean up old entries
            for (const [id, data] of adminCache.entries()) {
                if (Date.now() - data.timestamp > MAX_CACHE_AGE) {
                    adminCache.delete(id);
                }
            }
        }
        
        // Admin session recovery
        if (!req.user && req.session && req.session.passport && req.session.passport.user) {
            const userId = req.session.passport.user;
            
            // Try to recover from cache first (fastest)
            if (adminCache.has(userId)) {
                const cached = adminCache.get(userId);
                if (cached.user.role === 'admin') {
                    console.log('Recovering admin session from cache for user ID:', userId);
                    req.user = cached.user;
                    cached.timestamp = Date.now(); // Update timestamp
                }
            }
            // If not in cache, try database
            else {
                try {
                    const user = await db.user.findUnique({
                        where: { id: Number(userId) }
                    });
                    
                    if (user && user.role === 'admin') {
                        console.log('Emergency session recovery for admin user ID:', userId);
                        req.user = user;
                        
                        // Cache for future recoveries
                        adminCache.set(user.id, {
                            user,
                            timestamp: Date.now()
                        });
                    }
                } catch (dbError) {
                    console.error('Database error during session recovery:', dbError);
                }
            }
        }
        
        // Add a direct access method to the user for views
        res.locals.currentUser = req.user || null;
        
        next();
    } catch (error) {
        console.error('Error in session hardener:', error);
        next();
    }
};

module.exports = sessionHardener;
