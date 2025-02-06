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

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "modules")));

app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

const port = 3000;

app.use(express.static(path.join(__dirname, 'public')))

app.set("view engine", "ejs");
app.use(ejsLayouts);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(Controller.flaskmessage);
app.use(Controller.user);

app.get("/", Controller.index);

app.get("/register", Controller.register);
app.post("/register", Controller.registerSubmit);

app.get("/login", forwardAuthenticated ,Controller.login);
app.post("/login", passport.authenticate("local", {
  successRedirect: "/home",
  failureRedirect: "/login",
}));

app.get("/logout", Controller.logout);

app.get("/home", ensureAuthenticated, Controller.home);

app.get("/admin", ensureAdmin, Controller.admin);
app.get("/admin/revoke/:id", ensureAdmin, Controller.revoke);

app.get("/course", ensureAdmin, Controller.course);

app.get("/profile", ensureAuthenticated, Controller.profile);
app.post("/updateprofile", uploadprofileimage.single('profilePicture') ,Controller.updateprofile);

app.get("/modules", ensureAuthenticated, (req, res) => {
  const moduleDir = path.join(__dirname, 'modules');
  
  fs.readdir(moduleDir, (err, files) => {
    if (err) return res.status(500).send('Error reading modules');
    
    const modules = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(moduleDir, file), 'utf-8'));
          return {
            id: content.moduleCode,
            title: content.title,
            description: content.description,
            difficulty: content.difficulty,
            duration: content.duration,
            createdAt: content.createdAt
          };
        } catch (error) {
          console.error(`Error reading module file ${file}:`, error);
          return null;
        }
      })
      .filter(module => module !== null)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.render("module", { modules });
  });
});

// Move this route BEFORE the /modules/:id route
app.get('/modules/create', ensureAdmin, (req, res) => {
    try {
        res.render('modules/create_module', { 
            title: 'Create New Module',
            layout: false, // Add this line to bypass layout
            user: req.user // Pass user data for admin check in template
        });
    } catch (error) {
        console.error('Error rendering create module page:', error);
        res.status(500).send('Error loading create module page: ' + error.message);
    }
});

app.get("/modules/:id", ensureAuthenticated, (req, res) => {
  const moduleId = req.params.id;
  const moduleFile = path.join(__dirname, 'modules', `${moduleId}.json`);
  
  if (!fs.existsSync(moduleFile)) {
    return res.status(404).send('Module not found');
  }

  try {
    const moduleContent = JSON.parse(fs.readFileSync(moduleFile, 'utf-8'));
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.json(moduleContent);
    } else {
      res.render("module-detail", { module: moduleContent });
    }
  } catch (error) {
    console.error('Error loading module:', error);
    res.status(500).send('Error loading module: ' + error.message);
  }
});

// Temporary data storage (replace with database later)
let courses = [];

app.get('/courses/create_course', ensureAdmin, (req, res) => {
  res.render('courses/create_course', { additionalCSS: '/css/create_course' });
});

app.post('/courses', ensureAdmin, (req, res) => {
    try {
        // Handle moduleCodes as an array
        const moduleCodes = Array.isArray(req.body.moduleCodes) 
            ? req.body.moduleCodes 
            : (req.body.moduleCodes ? [req.body.moduleCodes] : []);
        
        // Filter out empty values and trim whitespace
        const validModuleCodes = moduleCodes.filter(code => code && code.trim());
        
        if (validModuleCodes.length === 0) {
            return res.status(400).send('At least one valid module code is required');
        }

        const newCourse = {
            id: Date.now().toString(),
            courseCode: req.body.courseCode,
            title: req.body.title,
            description: req.body.description,
            intro: req.body.intro,
            content: req.body.content,
            modules: [],
            createdAt: new Date().toISOString()
        };

        // Verify modules exist and add their data
        const moduleDir = path.join(__dirname, 'modules');
        for (const code of validModuleCodes) {
            const moduleFile = path.join(moduleDir, `${code}.json`);
            
            if (!fs.existsSync(moduleFile)) {
                return res.status(400).send(`Module not found: ${code}`);
            }

            try {
                const moduleData = JSON.parse(fs.readFileSync(moduleFile, 'utf-8'));
                newCourse.modules.push({
                    moduleCode: code,
                    title: moduleData.title,
                    status: 'linked'
                });
            } catch (error) {
                console.error(`Error reading module ${code}:`, error);
                return res.status(500).send(`Error processing module ${code}`);
            }
        }

        courses.push(newCourse);
        res.redirect('/courses');
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).send('Error creating course: ' + error.message);
    }
});

// Add endpoint to fetch module info
app.get('/api/modules/:moduleCode', ensureAdmin, (req, res) => {
  const moduleCode = req.params.moduleCode;
  // Here you would typically fetch module info from your database
  // For now, return dummy data
  res.json({
      moduleCode: moduleCode,
      title: `Module ${moduleCode}`,
      description: 'Module description would go here'
  });
});

app.get('/courses', ensureAuthenticated, (req, res) => {
  res.render('courses/list', { courses });
});

// Update course viewing route
app.get('/courses/:id', ensureAuthenticated, (req, res) => {
    const course = courses.find(c => c.id === req.params.id);
    if (!course) return res.status(404).send('Course not found');
    
    res.render('courses/view', { course });
});

// Delete course route (optional)
app.post('/courses/:id/delete', ensureAdmin, (req, res) => {
    courses = courses.filter(c => c.id !== req.params.id);
    res.redirect('/courses');
});

// Module routes
app.get('/modules/create', ensureAdmin, (req, res) => {
    try {
        res.render('modules/create_module', { 
            title: 'Create New Module'
        });
    } catch (error) {
        console.error('Error rendering create module page:', error);
        res.status(500).send('Error loading create module page: ' + error.message);
    }
});

app.get('/courses/:courseId/modules/create', ensureAdmin, (req, res) => {
    const course = courses.find(c => c.id === req.params.courseId);
    if (!course) return res.status(404).send('Course not found');
    res.render('modules/create_module', { 
        course,
        additionalCSS: '/css/module_create'
    });
});

app.post('/courses/:courseId/modules', ensureAdmin, (req, res) => {
    try {
        const course = courses.find(c => c.id === req.params.courseId);
        if (!course) return res.status(404).send('Course not found');

        const newModule = {
            id: Date.now().toString(),
            moduleCode: req.body.moduleCode,
            title: req.body.title,
            content: req.body.content
        };

        // Initialize modules array if it doesn't exist
        if (!Array.isArray(course.modules)) {
            course.modules = [];
        }

        course.modules.push(newModule);
        res.redirect(`/courses/${course.id}`);
    } catch (error) {
        console.error('Error adding module to course:', error);
        res.status(500).send('Error adding module to course: ' + error.message);
    }
});

// Standalone module routes
app.post('/modules/create', ensureAdmin, (req, res) => {
    try {
        const moduleDir = path.join(__dirname, 'modules');
        if (!fs.existsSync(moduleDir)){
            fs.mkdirSync(moduleDir);
        }

        const moduleData = {
            moduleCode: req.body.moduleCode,
            title: req.body.title,
            description: req.body.description || '',
            difficulty: req.body.difficulty || 'Beginner',
            duration: parseInt(req.body.duration) || 30,
            sections: JSON.parse(req.body.sections || '[]'),
            createdAt: new Date().toISOString()
        };

        const moduleFile = path.join(moduleDir, `${moduleData.moduleCode}.json`);
        fs.writeFileSync(moduleFile, JSON.stringify(moduleData, null, 2));

        res.redirect('/modules');
    } catch (error) {
        console.error('Error creating module:', error);
        res.status(500).send('Error creating module: ' + error.message);
    }
});

app.listen(port, function () {
  console.log(
    "Server running. Visit: localhost:3000 in your browser 🚀"
  );
});