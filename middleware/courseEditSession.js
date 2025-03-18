/**
 * Special middleware to ensure session persistence for course edit operations
 * This addresses the specific issue of session loss during course updates
 */

const courseEditSession = (req, res, next) => {
    // Only apply to course edit routes
    if (req.path.includes('/courses/') && req.path.includes('/edit')) {
        console.log('Course edit session protection middleware activated');
        
        // Store the original redirect method
        const originalRedirect = res.redirect;
        
        // Override the redirect method
        res.redirect = function(statusOrPath, path) {
            // Handle both forms of redirect: res.redirect(path) and res.redirect(status, path)
            const status = typeof statusOrPath === 'number' ? statusOrPath : 302;
            const redirectPath = typeof statusOrPath === 'string' ? statusOrPath : path;
            
            console.log(`Course edit override: Saving session before redirect to ${redirectPath}`);
            
            if (req.session) {
                // Save the session first, then redirect
                req.session.save((err) => {
                    if (err) {
                        console.error('Error saving session before course edit redirect:', err);
                    }
                    // Call the original redirect method
                    if (typeof statusOrPath === 'number') {
                        originalRedirect.call(res, status, redirectPath);
                    } else {
                        originalRedirect.call(res, redirectPath);
                    }
                });
            } else {
                // If no session, just call the original redirect
                if (typeof statusOrPath === 'number') {
                    originalRedirect.call(res, status, redirectPath);
                } else {
                    originalRedirect.call(res, redirectPath);
                }
            }
        };
    }
    
    next();
};

module.exports = courseEditSession;
