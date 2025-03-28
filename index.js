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

// Update session configuration
const sessionConfig = {
    name: 'sessionId',
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,  // Set to true only in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000,  // 24 hours
        sameSite: 'strict'
    },
    rolling: true  // Reset maxAge on every response
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

(async () => {
    try {
        await initializeDataFolders();
    } catch (error) {
        console.error('Failed to initialize data folders:', error);
    }
})();

app.get("/", Controller.index);

app.get("/register", Controller.register);
app.post("/register", Controller.registerSubmit);

app.get("/login", forwardAuthenticated ,Controller.login);
app.post("/login", passport.authenticate("local", {
  successRedirect: "/home",
  failureRedirect: "/login",
}));

app.get("/logout", Controller.logout);

// Update home route to include courses and set currentPage
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
        currentPage: 'home'  // Add currentPage for navbar active state
    });
});

app.get("/admin", ensureAdmin, (req, res) => {
    Controller.admin(req, res, 'admin'); // Pass currentPage
});

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
            // Strip HTML tags from description
            description: content.description.replace(/<[^>]*>/g, ''),
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
      user: req.user,
      currentPage: 'modules'  // Add currentPage for navbar active state
    });
  });
});

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
            // Strip HTML tags from description
            description: content.description.replace(/<[^>]*>/g, ''),
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

// Update DELETE route for modules
app.delete('/modules/:moduleCode', ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        const moduleCode = req.params.moduleCode;
        const moduleFile = path.join(__dirname, 'modules', `${moduleCode}.json`);
        
        if (!fs.existsSync(moduleFile)) {
            return res.status(404).json({ success: false, error: 'Module not found' });
        }

        await fsPromises.unlink(moduleFile);
        
        // Save session before sending response
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ success: false, error: 'Session error' });
            }
            res.json({ success: true, message: 'Module deleted successfully' });
        });

    } catch (error) {
        console.error('Error deleting module:', error);
        res.status(500).json({ success: false, error: 'Failed to delete module' });
    }
});

// Move this route BEFORE the /modules/:id route
app.get('/modules/create', ensureAdmin, (req, res) => {
    try {
        res.render('modules/create_module', { 
            title: 'Create New Module',
            user: req.user,
            layout: true  // Changed from false to true
        });
    } catch (error) {
        console.error('Error rendering create module page:', error);
        res.status(500).send('Error loading create module page: ' + error.message);
    }
});

// Add this route BEFORE the /modules/:id route
app.get('/modules/:moduleCode/edit', ensureAdmin, (req, res) => {
    try {
        const moduleCode = req.params.moduleCode;
        const moduleFile = path.join(__dirname, 'modules', `${moduleCode}.json`);
        
        if (!fs.existsSync(moduleFile)) {
            return res.status(404).send('Module not found');
        }

        const moduleData = JSON.parse(fs.readFileSync(moduleFile, 'utf-8'));
        
        res.render('modules/edit_module', { 
            module: moduleData,
            user: req.user
        });
    } catch (error) {
        console.error('Error loading module for editing:', error);
        res.status(500).send('Error loading module for editing');
    }
});

// Add PUT route to handle module updates
app.put('/modules/:moduleCode', ensureAdmin, async (req, res) => {
    try {
        const moduleCode = req.params.moduleCode;
        const moduleFile = path.join(__dirname, 'modules', `${moduleCode}.json`);
        
        if (!fs.existsSync(moduleFile)) {
            return res.status(404).json({ error: 'Module not found' });
        }

        // Get existing module data
        const existingModule = JSON.parse(await fsPromises.readFile(moduleFile, 'utf-8'));

        const updatedModule = {
            ...existingModule,
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        await fsPromises.writeFile(moduleFile, JSON.stringify(updatedModule, null, 2));
        
        res.json({ success: true, message: 'Module updated successfully' });
    } catch (error) {
        console.error('Error updating module:', error);
        res.status(500).json({ error: 'Failed to update module' });
    }
});

// Update the module detail route to handle content properly
app.get("/modules/:id", ensureAuthenticated, (req, res) => {
    const moduleId = req.params.id;
    const moduleFile = path.join(__dirname, 'modules', `${moduleId}.json`);
    
    if (!fs.existsSync(moduleFile)) {
        return res.status(404).send('Module not found');
    }

    try {
        const moduleContent = JSON.parse(fs.readFileSync(moduleFile, 'utf-8'));
        // Structure the module data and strip HTML from description
        const moduleData = {
            ...moduleContent,
            description: moduleContent.description.replace(/<[^>]*>/g, ''),
            caseStudy: moduleContent.caseStudy,
            quiz: moduleContent.quiz || [],
            hasCaseStudy: moduleContent.hasCaseStudy,
            hasQuiz: moduleContent.hasQuiz
        };

        res.render("module-detail", { 
            module: moduleData,
            user: req.user,
            layout: false
        });
    } catch (error) {
        console.error('Error loading module:', error);
        res.status(500).send('Error loading module: ' + error.message);
    }
});

// Make sure this line appears before other routes that might conflict
const courseRoutes = require('./routes/courses');
const { title } = require("process");
app.use('/courses', courseRoutes);

// Add a new route to get all modules for the datalist
app.get('/api/modules', (req, res) => {
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

// Update the module info endpoint to read actual module files
app.get('/api/modules/:moduleCode', (req, res) => {
    try {
        const moduleCode = req.params.moduleCode;
        const moduleFile = path.join(__dirname, 'modules', `${moduleCode}.json`);
        
        if (!fs.existsSync(moduleFile)) {
            return res.status(404).json({ 
                error: 'Module not found',
                moduleCode: moduleCode 
            });
        }

        const moduleData = JSON.parse(fs.readFileSync(moduleFile, 'utf-8'));
        res.json(moduleData);
    } catch (error) {
        console.error('Error loading module:', error);
        res.status(500).json({ 
            error: 'Error loading module',
            moduleCode: req.params.moduleCode
        });
    }
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
        console.log(req.body);
        // Process case study data
        const caseStudyData = Array.isArray(req.body.caseStudies) ?
            req.body.caseStudies.map(cs => ({
            title: cs.title || '',
            content: cs.content || '',
            questions: Array.isArray(cs.questions) ? 
                cs.questions.map(q => ({
                    question: q.question || '',
                    answer: q.answer || ''
                })).filter(q => q.question && q.answer) : []
        })).filter(cs => cs.content || cs.questions.length > 0) : [];
        console.log(caseStudyData);
        // Process quiz data
        const quizData = Array.isArray(req.body.quiz) ? 
            req.body.quiz.map(q => ({
                question: q.question || '',
                options: q.options || [],
                correct: q.correctAnswer || ''
            })).filter(q => q.question && q.options.length > 0 && q.correct) : [];
        console.log(quizData);
        const moduleData = {
            moduleCode: req.body.moduleCode,
            title: req.body.title,
            description: req.body.description || '',
            difficulty: req.body.difficulty || 'Beginner',
            duration: parseInt(req.body.duration) || 30,
            content: req.body.content,
            // Structured data
            caseStudy: caseStudyData,
            quiz: quizData,
            createdAt: new Date().toISOString(),
            // Add flags
            hasCaseStudy: Boolean(caseStudyData.length),
            hasQuiz: Boolean(quizData.length)
        };


        const moduleFile = path.join(moduleDir, `${moduleData.moduleCode}.json`);
        fs.writeFileSync(moduleFile, JSON.stringify(moduleData, null, 2));

        res.status(200).json({ message: 'Module created successfully', success: true, moduleCode: moduleData.moduleCode });
    } catch (error) {
        console.error('Error creating module:', error);
        res.status(500).send('Error creating module: ' + error.message);
    }
});

// Quiz route - update to handle source parameters
app.get('/modules/:moduleCode/quiz', ensureAuthenticated, (req, res) => {
    try {
        const moduleCode = req.params.moduleCode;
        const moduleFile = path.join(__dirname, 'modules', `${moduleCode}.json`);
        
        // Get source information from query parameters
        const sourceInfo = {
            source: req.query.source || null,
            courseCode: req.query.courseCode || null
        };

        console.log("Quiz source info:", sourceInfo); // Add debug logging
        
        if (!fs.existsSync(moduleFile)) {
            return res.status(404).send('Module not found');
        }

        const moduleContent = JSON.parse(fs.readFileSync(moduleFile, 'utf-8'));
        
        // Check if quiz exists
        if (!moduleContent.quiz || moduleContent.quiz.length === 0) {
            return res.redirect(`/modules/${moduleCode}`);
        }

        res.render('modules/quiz_view', {
            module: moduleContent,
            user: req.user,
            sourceInfo: sourceInfo  // Pass source info to the template
        });

    } catch (error) {
        console.error('Error loading quiz:', error);
        res.status(500).send('Error loading quiz: ' + error.message);
    }
});

// Update the quiz submission route
app.post('/modules/:moduleCode/quiz', ensureAuthenticated, (req, res) => {
    try {
        const moduleCode = req.params.moduleCode;
        const moduleFile = path.join(__dirname, 'modules', `${moduleCode}.json`);
        const userAnswers = req.body.answers;

        if (!fs.existsSync(moduleFile)) {
            return res.status(404).json({ error: 'Module not found' });
        }

        const moduleContent = JSON.parse(fs.readFileSync(moduleFile, 'utf-8'));
        
        // Initialize score
        let score = 0;
        const total = moduleContent.quiz.length;

        // Compare answers
        moduleContent.quiz.forEach((question, index) => {
            if (userAnswers[index] && userAnswers[index] === question.correct) {
                score++;
            }
            console.log(`Question ${index + 1}:`, {
                userAnswer: userAnswers[index],
                correctAnswer: question.correct,
                isCorrect: userAnswers[index] === question.correct
            });
        });

        // Calculate percentage
        const percentage = Math.round((score / total) * 100);

        // Send response
        res.json({
            score,
            total,
            percentage
        });

    } catch (error) {
        console.error('Error processing quiz submission:', error);
        res.status(500).json({ error: 'Error processing quiz submission' });
    }
});

app.listen(port, function () {
  console.log(
    "Server running. Visit: localhost:3000 in your browser 🚀"
  );
});