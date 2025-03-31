module.exports = {
  ensureAuthenticated: function (req, res, next) {
    // All console logs removed
    
    if (req.isAuthenticated()) {
      return next();
    }
    
    // Store the requested URL to redirect after login
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'Please log in to view this resource');
    res.redirect('/login');
  },
  
  forwardAuthenticated: function (req, res, next) {
    if (!req.isAuthenticated()) {
      return next();
    }
    res.redirect("/home");
  },

  ensureAdmin: function (req, res, next) {
    // All console logs removed
    
    if (req.isAuthenticated() && req.user.role === "admin") {
      // Touch the session to keep it fresh
      req.session.touch();
      return next();
    }
    
    if (req.isAuthenticated()) {
      return res.status(403).send("Access denied. Admin privileges required.");
    }
    
    req.flash('error', 'Please log in as an administrator to access this resource');
    res.redirect("/login");
  }
};
