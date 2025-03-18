/**
 * Session Stabilizer Middleware
 * Specially created to handle session issues with form submissions
 * and AJAX requests that might lose sessions in Express
 */

const sessionStabilizer = (req, res, next) => {
    // Add a helper to easily check if a request is AJAX
    req.isAjaxRequest = () => {
        return req.xhr || (req.headers && req.headers['x-requested-with'] === 'XMLHttpRequest');
    };
    
    // Override the json method to keep sessions stable
    const originalJson = res.json;
    res.json = function(data) {
        // If the user is authenticated, ensure the session is saved before returning JSON
        if (req.user && req.session) {
            console.log('JSON response with authenticated user - forcing session save');
            
            return req.session.save((err) => {
                if (err) console.error('Session save error in JSON response:', err);
                return originalJson.call(this, data);
            });
        }
        
        return originalJson.call(this, data);
    };
    
    next();
};

module.exports = sessionStabilizer;
