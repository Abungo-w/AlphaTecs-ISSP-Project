const express = require('express');
const router = express.Router();
const courseManager = require('../utils/courseManager');
const { ensureAdmin } = require('../middleware/checkAuth');
const path = require('path');
const fs = require('fs');
const { ensureAuthenticated } = require('../middleware/checkAuth');

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
router.get('/create_course', ensureAdmin, async (req, res) => {
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
        res.redirect('/courses');
    } catch (error) {
        console.error('Error creating course:', error);
        req.flash('error', error.message);
        res.redirect('/courses/create');
    }
});

// Add edit route - Admin only
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
            user: req.user
        });
    } catch (error) {
        console.error('Error loading edit page:', error);
        req.flash('error', 'Error loading edit page');
        res.redirect('/courses');
    }
});

// Add update route - Admin only
router.post('/:courseCode/edit', ensureAdmin, async (req, res) => {
    try {
        const courseData = {
            courseCode: req.params.courseCode,
            title: req.body.title,
            introduction: req.body['hidden-intro'],
            summary: req.body['hidden-summary'],
            moduleCodes: Array.isArray(req.body['moduleCodes[]']) 
                ? req.body['moduleCodes[]'] 
                : [req.body['moduleCodes[]']]
        };

        await courseManager.updateCourse(courseData);
        req.flash('success', 'Course updated successfully');
        res.redirect(`/courses/${req.params.courseCode}`);
    } catch (error) {
        console.error('Error updating course:', error);
        req.flash('error', error.message);
        res.redirect(`/courses/${req.params.courseCode}/edit`);
    }
});

// Add update route with validation and error handling
router.put('/:id', async (req, res) => {
    try {
        const courseId = req.params.id;
        console.log('Received update request for course ID:', courseId);
        console.log('Update data:', req.body);

        if (!courseId) {
            return res.status(400).json({ error: 'Course ID is required' });
        }

        // Validate course exists first
        const existingCourse = await courseManager.getCourseById(courseId);
        if (!existingCourse) {
            console.log('Course not found with ID:', courseId);
            return res.status(404).json({ error: 'Course not found' });
        }

        const updatedCourse = await courseManager.updateCourse(courseId, req.body);
        res.json(updatedCourse);
    } catch (error) {
        console.error('Error in course update route:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single course - Public access
router.get('/:courseCode', ensureAuthenticated, (req, res) => {
    try {
        const courses = getCourses();
        const course = courses.find(c => c.courseCode === req.params.courseCode);
        
        if (!course) {
            return res.status(404).send('Course not found');
        }
        
        res.render('courses/view', {
            course,
            user: req.user,
            currentPage: 'courses'  // Add currentPage for navbar active state
        });
    } catch (error) {
        console.error('Error loading course:', error);
        res.status(500).send('Error loading course details');
    }
});

// Course details page
router.get('/:courseCode/details', ensureAuthenticated, async (req, res) => {
    try {
        const courses = getCourses();
        const course = courses.find(c => c.courseCode === req.params.courseCode);
        
        if (!course) {
            return res.status(404).send('Course not found');
        }
        
        // Fetch module details for this course if they exist
        let modules = [];
        if (course.modules && course.modules.length > 0) {
            const moduleDir = path.join(__dirname, '../modules');
            
            // Process each module code and get module details
            modules = course.modules.map(moduleCode => {
                try {
                    const moduleFile = path.join(moduleDir, `${moduleCode}.json`);
                    if (fs.existsSync(moduleFile)) {
                        const moduleData = JSON.parse(fs.readFileSync(moduleFile, 'utf8'));
                        return {
                            moduleCode: moduleData.moduleCode,
                            title: moduleData.title,
                            description: moduleData.description,
                            difficulty: moduleData.difficulty,
                            duration: moduleData.duration,
                            hasQuiz: moduleData.hasQuiz || false,
                            hasCaseStudy: moduleData.hasCaseStudy || false
                        };
                    } else {
                        return {
                            moduleCode,
                            title: 'Module not found',
                            description: 'This module could not be loaded.',
                            difficulty: 'N/A',
                            duration: 0
                        };
                    }
                } catch (error) {
                    console.error(`Error loading module ${moduleCode}:`, error);
                    return {
                        moduleCode,
                        title: 'Error loading module',
                        description: 'There was an error loading this module.',
                        difficulty: 'N/A',
                        duration: 0
                    };
                }
            });
        }
        
        res.render('course_detail', {
            course: { ...course, modules },
            user: req.user
        });
    } catch (error) {
        console.error('Error loading course details:', error);
        res.status(500).send('Error loading course details');
    }
});

module.exports = router;