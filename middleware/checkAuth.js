module.exports = {
  ensureAuthenticated: function (req, res, next) {
    console.log('Check auth - is authenticated:', !!req.isAuthenticated());
    console.log('Session ID:', req.sessionID);
    if (req.user) {
      console.log('User in session:', req.user.username, '(ID:', req.user.id, ')');
    } else {
      console.log('No user in session');
    }
    
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
    console.log('Admin check - is authenticated:', !!req.isAuthenticated());
    console.log('Admin check - user role:', req.user?.role);
    
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
