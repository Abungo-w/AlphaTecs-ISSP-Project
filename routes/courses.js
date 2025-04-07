const express = require('express');
const router = express.Router();
const courseManager = require('../utils/courseManager');
const { ensureAdmin } = require('../middleware/checkAuth');
const path = require('path');
const fs = require('node:fs').promises;
const { ensureAuthenticated } = require('../middleware/checkAuth');

// Intercept any destruction of admin sessions
router.use((req, res, next) => {
    // Preserve session for admins
    if (req.user && req.user.role === 'admin') {
        req.session.touch();
        req.session.adminPreserve = {
            id: req.user.id,
            time: Date.now()
        };
    }
    next();
});

// Get courses data - Update this function
async function getCourses() {
    try {
        const coursesFile = path.join(__dirname, '../data', 'courses.json');
        if (await fs.access(coursesFile).then(() => true).catch(() => false)) {
            const data = await fs.readFile(coursesFile, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error reading courses:', error);
        return [];
    }
}

// Save courses data - Add this function
async function saveCourses(courses) {
    try {
        const coursesFile = path.join(__dirname, '../data', 'courses.json');
        await fs.writeFile(coursesFile, JSON.stringify(courses, null, 2));
    } catch (error) {
        console.error('Error saving courses:', error);
        throw error;
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
            layout: 'layout'  // Specify main layout explicitly
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
        const course = await courseManager.getCourse(req.params.courseCode);
        
        if (!course) {
            req.flash('error', 'Course not found');
            return res.redirect('/courses');
        }

        // Load module details with better error handling
        let moduleDetails = [];
        
        if (course.modules?.length > 0) {
            const moduleDir = path.join(__dirname, '../modules');
            
            moduleDetails = await Promise.all(course.modules.map(async (moduleCode) => {
                try {
                    const moduleFile = path.join(moduleDir, `${moduleCode}.json`);
                    if (!fs.existsSync(moduleFile)) {
                        console.warn(`Module file not found: ${moduleCode}`);
                        return null;
                    }
                    
                    const moduleData = await fs.readFile(moduleFile, 'utf8');
                    return JSON.parse(moduleData);
                } catch (error) {
                    console.error(`Error loading module ${moduleCode}:`, error);
                    return null;
                }
            }));
        }

        // Filter out failed modules and render
        const validModuleDetails = moduleDetails.filter(Boolean);
        
        return res.render('courses/view', {
            course: {
                ...course,
                moduleDetails: validModuleDetails
            },
            user: req.user,
            messages: req.flash(),
            layout: 'layout'
        });

    } catch (error) {
        console.error('Error loading course:', error);
        req.flash('error', 'Error loading course details: ' + error.message);
        return res.redirect('/courses');
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

router.get('/:courseId', async (req, res) => {
    try {
        const courses = getCourses();
        const course = courses.find(c => c.courseCode === req.params.courseId);
        
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
        
        res.render('course-content', {
            course: {
                ...course,
                moduleDetails: moduleDetails.filter(Boolean)
            },
            user: req.user,
            layout: 'layout'  // Specify main layout explicitly
        });
    } catch (error) {
        console.error('Error loading course:', error);
        res.status(500).send('Error loading course details');
    }
});

// Delete course route - update this
router.delete('/:courseCode', ensureAdmin, async (req, res) => {
    try {
        const courseCode = req.params.courseCode;
        const courses = await getCourses();
        const courseIndex = courses.findIndex(c => c.courseCode === courseCode);

        if (courseIndex === -1) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Store admin session info before deletion
        const adminInfo = {
            id: req.user.id,
            role: req.user.role,
            time: Date.now()
        };
        
        // Ensure session is touched before deletion
        req.session.touch();
        req.session.adminInfo = adminInfo;

        // Perform the deletion
        courses.splice(courseIndex, 1);
        await saveCourses(courses);

        // Force session preservation
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    reject(err);
                }
                resolve();
            });
        });

        // Set recovery headers
        res.setHeader('X-Admin-Session-ID', req.sessionID);
        res.setHeader('X-Admin-Preserve', 'true');

        res.json({ 
            success: true, 
            message: 'Course deleted successfully',
            adminSession: adminInfo // Send back session info for verification
        });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ success: false, message: 'Failed to delete course' });
    }
});

module.exports = router;