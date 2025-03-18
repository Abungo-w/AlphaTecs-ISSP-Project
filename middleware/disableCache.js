/**
 * Middleware to disable caching
 * This helps prevent issues with back/forward cache causing session problems
 */

const disableCache = (req, res, next) => {
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    res.header('Surrogate-Control', 'no-store');
    next();
};

module.exports = disableCache;
