/**
 * Session Preservation Middleware
 * This middleware specifically handles ensuring session persistence
 * during critical operations like course updates
 */

const sessionPreservationMiddleware = (req, res, next) => {
    // Skip for static files
    if (req.path.startsWith('/css/') || 
        req.path.startsWith('/js/') || 
        req.path.startsWith('/img/')) {
        return next();
    }
    
    // Apply to all authenticated requests
    if (req.user) {
        // Store original end method
        const originalEnd = res.end;
        
        // Override end method
        res.end = function() {
            if (req.session) {
                // Force session to be touched
                req.session.touch();
                req.session._lastAccess = Date.now();
                
                // For POST requests, make sure session is saved before ending response
                if (req.method === 'POST') {
                    console.log('POST request detected, ensuring session is saved');
                    req.session.save(err => {
                        if (err) console.error('Session save error in end():', err);
                        originalEnd.apply(this, arguments);
                    });
                    return;
                }
            }
            
            return originalEnd.apply(this, arguments);
        };
    }
    
    next();
};

module.exports = sessionPreservationMiddleware;
