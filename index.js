const express = require("express");
const app = express();
const path = require("path");
const ejsLayouts = require("express-ejs-layouts");
const { Controller } = require("./controller/controller.js");
const { ensureAdmin, forwardAuthenticated, ensureAuthenticated } = require("./middleware/checkAuth.js");
const session = require("express-session");
const passport = require("./middleware/passport");
const flash = require('connect-flash');
const { uploadprofileimage } = require("./upload_module.js");
const fs = require('fs');
const fsPromises = require('fs').promises;
const initializeDataFolders = require('./utils/initDataFolders');

// Import core session utilities
const { debugSession } = require('./utils/sessionHandler');
const cookieParser = require('cookie-parser');

// Import our primary session protection middleware
const { persistAdminSession } = require('./middleware/persistAdminSession');
const disableCache = require('./middleware/disableCache');

// Import API routes
const apiRoutes = require('./routes/api');

// Add handler for session reset events to maintain login state during development    
let cachedUserSessions = new Map(); // Define this before using it

// Initialize courses array at the top level
let courses = [];

// Function to load courses from JSON file
function loadCourses() {
    try {
        const coursesFile = path.join(__dirname, 'data', 'courses.json');
        if (fs.existsSync(coursesFile)) {
            const coursesData = fs.readFileSync(coursesFile, 'utf8');
            courses = JSON.parse(coursesData);
            console.log(`Loaded ${courses.length} courses from file`);
        } else {
            console.log('No courses file found, initializing empty courses array');
            courses = [];
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        courses = [];
    }
}

// Load courses when server starts
loadCourses();

// Basic middleware setup
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "modules")));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser()); // Add cookie parser
app.use(disableCache); // Apply cache disabling middleware globally

// Enhanced session configuration - CRITICAL FOR SESSION PERSISTENCE
const sessionConfig = {
    name: 'app.sid',
    secret: "supersecret-session-key-that-is-very-secure",
    resave: true,
    saveUninitialized: true,
    store: null,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'strict',
        path: '/'
    },
    rolling: true
};

// Session setup
app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Add session destroy override AFTER session initialization
app.use((req, res, next) => {
    if (req.session) {
        const originalDestroy = req.session.destroy;
        req.session.destroy = (callback) => {
            if (req.user?.role === 'admin') {
                console.log('Admin user logging out, cleaning up session data...');
                delete req.app.locals.lastActiveAdmin;
                res.clearCookie('admin_preserve');
            }
            return originalDestroy.call(req.session, callback);
        };
    }
    next();
});

// Apply admin session persistence middleware - the most important one
app.use(persistAdminSession);

// Cache sessions before restart/modification
app.use((req, res, next) => {
    if (req.session && req.user) {
        // Store user session data for recovery
        cachedUserSessions.set(req.sessionID, {
            userId: req.user.id,
            username: req.user.username || req.user.email,
            role: req.user.role,
            timestamp: Date.now()
        });
        
        // Clean old entries (older than 30 minutes)
        const thirtyMinutes = 30 * 60 * 1000;
        for (const [sessionId, data] of cachedUserSessions.entries()) {
            if (Date.now() - data.timestamp > thirtyMinutes) {
                cachedUserSessions.delete(sessionId);
            }
        }
    }
    next();
});

// Add middleware to track views and help recover sessions
app.use((req, res, next) => {
    // If user is authenticated, log page view and session state
    if (req.user) {
        app.locals.lastActiveUser = {
            id: req.user.id,
            username: req.user.username || req.user.email,
            role: req.user.role,
            time: Date.now(),
            path: req.path
        };
    }
    
    // Emergency recovery from app.locals if needed
    if (!req.user && req.session && req.session.passport && req.session.passport.user) {
        if (app.locals.lastActiveUser && 
            app.locals.lastActiveUser.id === req.session.passport.user && 
            Date.now() - app.locals.lastActiveUser.time < 30 * 60 * 1000) { // 30 minutes
            console.log('🚑 Emergency session recovery from app.locals');
            req.user = {
                id: app.locals.lastActiveUser.id,
                username: app.locals.lastActiveUser.username,
                role: app.locals.lastActiveUser.role
            };
        }
    }

    next();
});

// Add middleware to handle session consistency for redirects
app.use((req, res, next) => {
    // Wrap redirect method to ensure session is saved before redirecting
    const originalRedirect = res.redirect;
    
    res.redirect = function(url) {
        if (req.session && !req.session.save) {
            console.warn('Session object does not have save method');
            return originalRedirect.apply(this, arguments);
        }
        
        if (req.session && req.user) {
            req.session.touch();
            
            req.session.save((err) => {
                if (err) console.error('Session save error before redirect:', err);
                return originalRedirect.apply(res, arguments);
            });
        } else {
            return originalRedirect.apply(this, arguments);
        }
    };
    next();
});

// Reduce debug middleware to only log critical issues
app.use((req, res, next) => {
    const originalEnd = res.end;
    res.end = function() {
        // Only log POST requests to /courses for debugging
        if (req.originalUrl.includes('/courses') && req.method === 'POST') {
            console.log('POST to /courses route - session debug:');
            debugSession(req);
        }
        // Remove other route logging
        return originalEnd.apply(this, arguments);
    };
    next();
});

// Initialize view engine
app.set("view engine", "ejs");
app.use(ejsLayouts);
app.use(flash());
app.use(Controller.flaskmessage);
app.use(Controller.user);

// Initialize data folders
(async () => {
    try {
        await initializeDataFolders();
    } catch (error) {
        console.error('Failed to initialize data folders:', error);
    }
})();

// Routes
app.get("/", (req, res) => {
    res.redirect('/login');
});
app.get("/register", Controller.register);
app.post("/register", Controller.registerSubmit);
app.get("/login", forwardAuthenticated, Controller.login);
app.post("/login", passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/login",
}));
app.get("/logout", Controller.logout);

// Home route
app.get("/home", ensureAuthenticated, (req, res) => {
    // Ensure courses are loaded
    if (courses.length === 0) {
        loadCourses();
    }
    
    const sortedCourses = [...courses].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    res.render("home", {
        user: req.user,
        courses: sortedCourses,
        layout: true,
        currentPage: 'home'
    });
});

// Admin routes
app.get("/admin", ensureAdmin, (req, res) => {
    Controller.admin(req, res, 'admin');
});
app.get("/admin/revoke/:id", ensureAdmin, Controller.revoke);
app.get("/course", ensureAdmin, Controller.course);

// User routes
app.get("/profile", ensureAuthenticated, Controller.profile);
app.post("/updateprofile", uploadprofileimage.single('profilePicture'), Controller.updateprofile);

// Register API routes
app.use('/api', apiRoutes);

// Create module routes
const moduleRoutes = require('./routes/modules');
app.use('/modules', moduleRoutes);

// Course routes - must appear before other potentially conflicting routes
const courseRoutes = require('./routes/courses');
app.use('/courses', courseRoutes);

// Start the server
const port = 3000;
app.listen(port, function () {
    console.log(
      "Server running. Visit: localhost:3000 in your browser 🚀"
    );
});