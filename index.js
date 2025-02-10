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

// Initialize courses array at the top level
let courses = [];

// Basic middleware setup
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "modules")));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Session configuration
const sessionConfig = {
    name: 'sessionId',
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
    }
};

app.use(session(sessionConfig));

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

// Update home route to include courses
app.get("/home", ensureAuthenticated, (req, res) => {
    const sortedCourses = [...courses].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    res.render("home", {
        user: req.user,
        courses: sortedCourses,
        featuredCourses: sortedCourses.slice(0, 3)
    });
});

app.get("/admin", ensureAdmin, Controller.admin);
app.get("/admin/revoke/:id", ensureAdmin, Controller.revoke);

app.get("/course", ensureAdmin, Controller.course);

app.get("/profile", ensureAuthenticated, Controller.profile);
app.post("/updateprofile", uploadprofileimage.single('profilePicture') ,Controller.updateprofile);

// Update the modules route to use the new list view
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
            moduleCode: content.moduleCode,
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
    
    res.render("modules/list", { 
      modules,
      user: req.user
    });
  });
});

// Add DELETE route for modules
app.delete('/modules/:moduleCode', ensureAdmin, (req, res) => {
    const moduleCode = req.params.moduleCode;
    const moduleFile = path.join(__dirname, 'modules', `${moduleCode}.json`);
    
    try {
        if (fs.existsSync(moduleFile)) {
            fs.unlinkSync(moduleFile);
            res.status(200).send('Module deleted');
        } else {
            res.status(404).send('Module not found');
        }
    } catch (error) {
        console.error('Error deleting module:', error);
        res.status(500).send('Error deleting module');
    }
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

app.get('/courses/create_course', ensureAdmin, (req, res) => {
  res.render('courses/create_course', { additionalCSS: '/css/create_course' });
});

// Add a new route to get all modules for the datalist
app.get('/api/modules', ensureAuthenticated, (req, res) => {
    try {
        const moduleDir = path.join(__dirname, 'modules');
        const files = fs.readdirSync(moduleDir);
        
        const modules = files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const content = JSON.parse(fs.readFileSync(path.join(moduleDir, file), 'utf-8'));
                return {
                    code: content.moduleCode,
                    title: content.title
                };
            });
        
        res.json(modules);
    } catch (error) {
        console.error('Error fetching modules:', error);
        res.status(500).json({ error: 'Error fetching modules' });
    }
});

// Updated course creation endpoint
app.post('/courses', ensureAdmin, async (req, res) => {
    try {
        // Basic validation
        if (!req.body.courseCode || !req.body.title || !req.body.intro) {
            req.flash('error', 'All fields are required');
            return res.redirect('/courses/create_course');
        }

        // Handle module codes properly
        const rawModuleCodes = req.body.moduleCodes;
        const moduleCodes = Array.isArray(rawModuleCodes) ? rawModuleCodes : [rawModuleCodes];
        const validModuleCodes = moduleCodes.filter(Boolean).map(code => code.trim());

        if (validModuleCodes.length === 0) {
            req.flash('error', 'At least one valid module code is required');
            return res.redirect('/courses/create_course');
        }

        // Create new course
        const courseId = Date.now().toString();
        const newCourse = {
            id: courseId,
            courseCode: req.body.courseCode,
            title: req.body.title,
            description: req.body.intro,
            modules: [],
            createdAt: new Date().toISOString()
        };

        // Add modules to course using async/await
        const moduleDir = path.join(__dirname, 'modules');
        for (const code of validModuleCodes) {
            try {
                const moduleFile = path.join(moduleDir, `${code}.json`);
                const moduleContent = await fsPromises.readFile(moduleFile, 'utf-8');
                const moduleData = JSON.parse(moduleContent);
                
                newCourse.modules.push({
                    moduleCode: moduleData.moduleCode,
                    title: moduleData.title,
                    description: moduleData.description,
                    difficulty: moduleData.difficulty,
                    duration: moduleData.duration
                });
            } catch (error) {
                req.flash('error', `Module not found: ${code}`);
                return res.redirect('/courses/create_course');
            }
        }

        // Save the course and redirect to view page
        courses.push(newCourse);
        req.flash('success', 'Course created successfully!');
        return res.redirect(`/courses/${courseId}`);
    } catch (error) {
        console.error('Error creating course:', error);
        req.flash('error', 'Failed to create course: ' + error.message);
        return res.redirect('/courses/create_course');
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

// Update courses list route
app.get('/courses', ensureAuthenticated, (req, res) => {
    const sortedCourses = [...courses].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.render('courses/list', { 
        courses: sortedCourses,
        user: req.user,
        layout: true,
        messages: req.flash()
    });
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

app.get('/module',(req, res) => {
  res.render("module.ejs");
});

app.get("/quiz_form", (req, res) => {
  res.render("quiz_form.ejs")
})

app.post('/add_question', (req, res) => {
  const { question, option1, option2, option3, option4, correct_option } = req.body;
  
  console.log({
      question,
      options: { option1, option2, option3, option4 },
      correct_option
  });

  res.send("Question submitted successfully!");
});

app.listen(port, function () {
  console.log(
    "Server running. Visit: localhost:3000 in your browser 🚀"
  );
});