const express = require('express');
const router = express.Router();
const courseManager = require('../utils/courseManager');
const { ensureAdmin } = require('../middleware/checkAuth');
const path = require('path');
const fs = require('fs');
const { ensureAuthenticated } = require('../middleware/checkAuth');

// Intercept any destruction of admin sessions
router.use((req, res, next) => {
    const originalEnd = res.end;
    
    // Preserve session for admins
    if (req.user && req.user.role === 'admin') {
        // Save reference for emergency recovery
        req.app.locals.lastAdminUser = req.user;
        req.app.locals.lastAdminTime = Date.now();
        
        // Touch session on each request
        req.session.touch();
    }
    
    // Add this flag for debugging
    res.locals.isAdmin = req?.user?.role === 'admin';
    
    next();
});

// Get courses data
function getCourses() {
    try {
        const coursesFile = path.join(__dirname, '../data', 'courses.json');
        if (fs.existsSync(coursesFile)) {
            return JSON.parse(fs.readFileSync(coursesFile, 'utf8'));
        }
        return [];
    } catch (error) {
        console.error('Error reading courses:', error);
        return [];
    }
}

// Show create form - Admin only
router.get('/create_course', ensureAdmin, (req, res) => {
    try {
        res.render('courses/create_course', { 
            messages: req.flash(),
            user: req.user
        });
    } catch (error) {
        console.error('Error loading create page:', error);
        req.flash('error', 'Error loading create course page');
        res.redirect('/courses');
    }
});

// Get all courses - Public access
router.get('/', async (req, res) => {
    try {
        const courses = await courseManager.getAllCourses();
        res.render('courses/list', { 
            courses,
            user: req.user || null,
            currentPage: 'courses'  // Add currentPage for navbar active state
        });
    } catch (error) {
        res.status(500).send('Error loading courses');
    }
});

// Create new course - Admin only
router.post('/', ensureAdmin, async (req, res) => {
    try {
        console.log('Received course creation request:', req.body);
        console.log('User creating course:', req.user?.username);

        // Ensure moduleCodes is always an array
        const moduleCodes = Array.isArray(req.body['moduleCodes[]']) 
            ? req.body['moduleCodes[]'] 
            : [req.body['moduleCodes[]']];

        const courseData = {
            courseCode: req.body.courseCode,
            title: req.body.title,
            introduction: req.body['hidden-intro'],
            summary: req.body['hidden-summary'],
            moduleCodes: moduleCodes.filter(Boolean) // Remove any null/undefined values
        };

        const course = await courseManager.createCourse(courseData);
        req.flash('success', 'Course created successfully!');
        
        // Save session before sending response
        await new Promise((resolve) => {
            req.session.save(() => resolve());
        });
        
        return res.redirect('/courses');
    } catch (error) {
        console.error('Error creating course:', error);
        req.flash('error', error.message);
        return res.redirect('/courses/create');
    }
});

// Get edit form - Admin only
router.get('/:courseCode/edit', ensureAdmin, async (req, res) => {
    try {
        const course = await courseManager.getCourse(req.params.courseCode);
        if (!course) {
            req.flash('error', 'Course not found');
            return res.redirect('/courses');
        }
        
        res.render('courses/edit_course', { 
            course,
            messages: req.flash(),
            user: req.user,
            // Add a hidden admin recovery token for emergency
            adminToken: req.user?.role === 'admin' ? Date.now().toString() : null
        });
    } catch (error) {
        console.error('Error loading edit page:', error);
        req.flash('error', 'Error loading edit page');
        res.redirect('/courses');
    }
});

// Process edit - Using a simpler, more reliable approach
router.post('/:courseCode/edit', ensureAdmin, async (req, res) => {
    try {
        // Process module codes
        let moduleCodes;
        let title, introduction, summary;
        
        // Handle both traditional form and JSON requests
        if (req.headers['content-type'] === 'application/json') {
            const data = req.body;
            moduleCodes = data['moduleCodes[]'];
            title = data.title;
            introduction = data['hidden-intro'];
            summary = data['hidden-summary'];
        } else {
            moduleCodes = req.body['moduleCodes[]'];
            title = req.body.title;
            introduction = req.body['hidden-intro'];
            summary = req.body['hidden-summary'];
        }
        
        // Normalize module codes
        if (!moduleCodes) {
            moduleCodes = [];
        } else if (!Array.isArray(moduleCodes)) {
            moduleCodes = [moduleCodes];
        }
        
        const courseData = {
            courseCode: req.params.courseCode,
            title: title,
            introduction: introduction,
            summary: summary,
            moduleCodes: moduleCodes.filter(Boolean)
        };
        
        await courseManager.updateCourse(courseData);
        
        // Set a success message that persists
        req.session.courseUpdateSuccess = true;
        req.app.locals.courseUpdateSuccessTime = Date.now();
        
        // Force session save
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) {
                    console.error('Error saving session in course handler:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
        
        // Handle JSON request differently
        if (req.headers['content-type'] === 'application/json') {
            return res.json({
                success: true,
                message: 'Course updated successfully',
                redirectTo: `/courses/${req.params.courseCode}`
            });
        } else {
            // Use 303 See Other to force a GET after POST
            return res.redirect(303, `/courses/${req.params.courseCode}`);
        }
    } catch (error) {
        console.error('Error updating course:', error);
        
        if (req.headers['content-type'] === 'application/json') {
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to update course'
            });
        } else {
            req.flash('error', error.message || 'Failed to update course');
            return res.redirect(`/courses/${req.params.courseCode}/edit`);
        }
    }
});

// Add a session ping endpoint for keeping admin sessions alive
router.get('/api/session-ping', (req, res) => {
    if (!req.user) {
        return res.json({ status: 'unauthenticated' });
    }
    
    // Touch the session
    req.session.lastPing = Date.now();
    req.session.touch();
    
    // For admins, do extra work to ensure session persistence
    if (req.user.role === 'admin') {
        // Store admin state in app locals
        req.app.locals.lastAdminPing = {
            user: req.user,
            time: Date.now()
        };
    }
    
    // Save session and return response
    req.session.save((err) => {
        if (err) {
            console.error('Error saving session during ping:', err);
            return res.json({ status: 'error', message: err.message });
        }
        return res.json({ 
            status: 'active',
            user: req.user.username || req.user.email,
            role: req.user.role
        });
    });
});

// Get single course
router.get('/:courseCode', ensureAuthenticated, async (req, res) => {
    try {
        const courses = getCourses();
        const course = courses.find(c => c.courseCode === req.params.courseCode);
        
        if (!course) {
            return res.status(404).send('Course not found');
        }

        // Load complete module data
        const moduleDir = path.join(__dirname, '../modules');
        let moduleDetails = [];
        
        if (course.modules?.length > 0) {
            moduleDetails = await Promise.all(course.modules.map(async moduleCode => {
                try {
                    const moduleFile = path.join(moduleDir, `${moduleCode}.json`);
                    if (!fs.existsSync(moduleFile)) {
                        throw new Error('Module not found');
                    }
                    return JSON.parse(await fs.promises.readFile(moduleFile, 'utf8'));
                } catch (error) {
                    console.error(`Error loading module ${moduleCode}:`, error);
                    return null;
                }
            }));
        }
        
        res.render('courses/view', {
            course: {
                ...course,
                moduleDetails: moduleDetails.filter(Boolean)
            },
            user: req.user,
            currentPage: 'courses',
            layout: false
        });
    } catch (error) {
        console.error('Error loading course:', error);
        res.status(500).send('Error loading course details');
    }
});

// Add route to handle form submission from course view page
router.post('/:courseCode', ensureAuthenticated, (req, res) => {
    try {
        // Check if there's a state preservation token
        const stateToken = req.body._statePreservation;
        
        if (stateToken) {
            try {
                // Attempt to decode the token
                const authState = JSON.parse(Buffer.from(stateToken, 'base64').toString());
                
                // If the token contains valid user data and is recent (within last 5 minutes)
                if (authState.user && 
                    authState.time && 
                    Date.now() - authState.time < 5 * 60 * 1000) {
                    
                    console.log('Recovered session from state token');
                    
                    // If there's no existing user, restore it from the token
                    if (!req.user) {
                        req.user = authState.user;
                        if (req.session) {
                            req.session.passport = { user: authState.user.id };
                            req.session.save();
                        }
                    }
                }
            } catch (error) {
                console.error('Error decoding state token:', error);
            }
        }
        
        // Show a success message
        req.flash('success', 'Course updated successfully');
        
        // Force session save before redirect
        if (req.session) {
            req.session.save(() => {
                // Redirect to the course page
                res.redirect(`/courses/${req.params.courseCode}`);
            });
        } else {
            res.redirect(`/courses/${req.params.courseCode}`);
        }
    } catch (error) {
        console.error('Error handling course form POST:', error);
        req.flash('error', 'An error occurred while processing your request');
        res.redirect(`/courses/${req.params.courseCode}`);
    }
});

// Course details page
router.get('/:courseCode/details', ensureAuthenticated, async (req, res) => {
    try {
        const courses = getCourses();
        const course = courses.find(c => c.courseCode === req.params.courseCode);
        
        if (!course) {
            req.flash('error', 'Course not found');
            return res.redirect('/courses');
        }
        
        let modules = [];
        if (course.modules?.length > 0) {
            const moduleDir = path.join(__dirname, '../modules');
            
            modules = await Promise.all(course.modules.map(async (moduleCode) => {
                try {
                    const moduleFile = path.join(moduleDir, `${moduleCode}.json`);
                    if (!fs.existsSync(moduleFile)) {
                        throw new Error('Module file not found');
                    }
                    
                    const moduleData = JSON.parse(await fs.promises.readFile(moduleFile, 'utf8'));
                    return {
                        moduleCode: moduleData.moduleCode,
                        title: moduleData.title,
                        description: moduleData.description,
                        difficulty: moduleData.difficulty,
                        duration: moduleData.duration,
                        hasQuiz: moduleData.hasQuiz || false,
                        hasCaseStudy: moduleData.hasCaseStudy || false
                    };
                } catch (error) {
                    console.error(`Error loading module ${moduleCode}:`, error);
                    return {
                        moduleCode,
                        title: 'Error',
                        description: 'Module could not be loaded',
                        difficulty: 'N/A',
                        duration: 0
                    };
                }
            }));
        }
        
        res.render('course_detail', {
            course: { ...course, modules },
            user: req.user,
            messages: req.flash()
        });
    } catch (error) {
        console.error('Error loading course details:', error);
        req.flash('error', 'Failed to load course details');
        res.redirect('/courses');
    }
});

module.exports = router;