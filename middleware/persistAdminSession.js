/**
 * ADMIN SESSION PERSISTENCE MIDDLEWARE
 * Core middleware that prevents admin users from losing their sessions
 * Especially during course updates and other admin operations
 */

const { db } = require('../prisma/database');

// Store active admin sessions
const activeAdmins = new Map();

// Middleware to maintain admin sessions at all costs
const persistAdminSession = async (req, res, next) => {
    // Skip for static resources
    if (req.path.match(/\.(css|js|jpg|png|ico|svg)$/)) {
        return next();
    }
    
    // For course edit routes specifically, take extreme measures
    const isCourseEditRoute = req.originalUrl.includes('/courses/') && 
                           (req.originalUrl.includes('/edit') || req.method === 'POST');
    
    // If this is a course edit operation, add special handling
    if (isCourseEditRoute) {
        // Log only for course edit routes
        console.log('⚡ Course edit route detected:', req.originalUrl);
        
        // If admin user exists in request, save their info
        if (req.user && req.user.role === 'admin') {
            // Console log removed
            
            // Store in memory
            activeAdmins.set(req.sessionID, {
                user: req.user,
                time: Date.now(),
                ip: req.ip
            });
            
            // Store in app locals for extra safety
            req.app.locals.lastActiveAdmin = {
                id: req.user.id,
                user: req.user,
                sessionID: req.sessionID,
                time: Date.now()
            };
            
            // Store admin info in cookie as backup
            res.cookie('admin_preserve', JSON.stringify({
                id: req.user.id,
                role: req.user.role,
                time: Date.now()
            }), { 
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
                path: '/'
            });
        }
        
        // Intercept end of response to ensure session is always saved
        const originalEnd = res.end;
        res.end = function() {
            if (req.session && req.user && req.user.role === 'admin') {
                // Console log removed
                
                // Extra insurance: renew the session
                req.session.touch();
                req.session.adminTracking = {
                    lastAccess: Date.now(),
                    path: req.originalUrl
                };
                
                // Force session save
                req.session.save(err => {
                    if (err) console.error('⚠️ Session save error:', err);
                    originalEnd.apply(this, arguments);
                });
                return;
            }
            return originalEnd.apply(this, arguments);
        };
    }
    
    // For all routes, attempt admin recovery if session was lost
    if (!req.user && req.session) {
        // Check if this is a known admin session that lost its user
        const adminSession = activeAdmins.get(req.sessionID);
        
        // Check cookie backup
        const adminCookie = req.cookies && req.cookies.admin_preserve ? 
            JSON.parse(req.cookies.admin_preserve) : null;
        
        // Check app locals backup
        const appLocalsAdmin = req.app.locals.lastActiveAdmin;
        
        if (adminSession && Date.now() - adminSession.time < 4 * 60 * 60 * 1000) {
            console.log('🚨 Recovering admin session from memory cache');
            req.user = adminSession.user;
            
            if (req.session.passport) {
                req.session.passport.user = adminSession.user.id;
            } else {
                req.session.passport = { user: adminSession.user.id };
            }
        }
        // Try cookie recovery
        else if (adminCookie && Date.now() - adminCookie.time < 24 * 60 * 60 * 1000) {
            console.log('🍪 Recovering admin session from cookie');
            
            try {
                const user = await db.user.findUnique({
                    where: { id: Number(adminCookie.id) }
                });
                
                if (user && user.role === 'admin') {
                    // Console log removed
                    req.user = user;
                    
                    if (req.session) {
                        req.session.passport = { user: user.id };
                    }
                }
            } catch (err) {
                console.error('Failed to recover from cookie:', err);
            }
        }
        // Try app locals recovery as last resort
        else if (appLocalsAdmin && Date.now() - appLocalsAdmin.time < 60 * 60 * 1000) {
            console.log('🏠 Recovering admin session from app locals');
            req.user = appLocalsAdmin.user;
            
            if (req.session) {
                req.session.passport = { user: appLocalsAdmin.user.id };
            }
        }
    }
    
    // Clean up old entries
    for (const [sessionId, data] of activeAdmins.entries()) {
        if (Date.now() - data.time > 4 * 60 * 60 * 1000) { // 4 hours
            activeAdmins.delete(sessionId);
        }
    }
    
    next();
};

module.exports = persistAdminSession;
