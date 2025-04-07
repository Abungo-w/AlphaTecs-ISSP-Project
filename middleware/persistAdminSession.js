/**
 * ADMIN SESSION PERSISTENCE MIDDLEWARE
 * Core middleware that prevents admin users from losing their sessions
 * Especially during course updates and other admin operations
 */

const { db } = require('../prisma/database');

// Store active admin sessions
const activeAdmins = new Map();

function cleanupAdminSession(sessionID) {
    // Remove from active admins map
    activeAdmins.delete(sessionID);
}

// Middleware to maintain admin sessions at all costs
const persistAdminSession = async (req, res, next) => {
    // Add logout path check at the beginning
    if (req.path === '/logout') {
        if (req.user?.role === 'admin') {
            cleanupAdminSession(req.sessionID);
        }
        return next();
    }
    
    // Skip for static resources and non-admin users
    if (req.path.match(/\.(css|js|jpg|png|ico|svg)$/) || !req.user?.role === 'admin') {
        return next();
    }
    
    // For course edit routes specifically, take extreme measures
    const isCourseEditRoute = req.originalUrl.includes('/courses/') && 
                           (req.originalUrl.includes('/edit') || req.method === 'POST');
    
    // Add module route detection alongside course routes
    const isModuleEditRoute = req.originalUrl.includes('/modules/') && 
                           (req.originalUrl.includes('/edit') || 
                            req.method === 'POST' || 
                            req.method === 'PUT' ||
                            req.method === 'DELETE');

    if (isModuleEditRoute || isCourseEditRoute) {
        // Log only for edit routes
        console.log('⚡ Protected route detected:', req.originalUrl);
        
        if (req.user && req.user.role === 'admin') {
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
    
    // Force session touch for any admin route
    if (req.user?.role === 'admin') {
        req.session.touch();
        req.session.adminLastActivity = Date.now();
        
        // Store admin info in res.locals for views
        res.locals.adminInfo = {
            id: req.user.id,
            role: req.user.role
        };
    }

    // Preserve admin session headers
    if (req.user?.role === 'admin') {
        res.setHeader('X-Admin-Session-Preserved', 'true');
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
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

module.exports = { persistAdminSession, cleanupAdminSession };
