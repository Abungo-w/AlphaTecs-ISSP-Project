const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { ensureAdmin, ensureAuthenticated } = require('../middleware/checkAuth');
const fsPromises = require('fs').promises;

// Module list page - Show all modules
router.get('/', ensureAuthenticated, (req, res) => {
    const moduleDir = path.join(__dirname, '..', 'modules');
    
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

// Module creation page
router.get('/create', ensureAdmin, (req, res) => {
    try {
        res.render('modules/create_module', { 
            title: 'Create New Module',
            user: req.user,
            layout: true
        });
    } catch (error) {
        console.error('Error rendering create module page:', error);
        res.status(500).send('Error loading create module page: ' + error.message);
    }
});

// Create new module - Process form submission
router.post('/create', ensureAdmin, (req, res) => {
    try {
        const moduleDir = path.join(__dirname, '..', 'modules');
        if (!fs.existsSync(moduleDir)){
            fs.mkdirSync(moduleDir);
        }
        
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
        
        // Process quiz data
        const quizData = Array.isArray(req.body.quiz) ? 
            req.body.quiz.map(q => ({
                question: q.question || '',
                options: q.options || [],
                correct: q.correctAnswer || ''
            })).filter(q => q.question && q.options.length > 0 && q.correct) : [];
        
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
        res.status(200).json({ 
            message: 'Module created successfully', 
            success: true, 
            moduleCode: moduleData.moduleCode 
        });
    } catch (error) {
        console.error('Error creating module:', error);
        res.status(500).send('Error creating module: ' + error.message);
    }
});

// Module editing page
router.get('/:moduleCode/edit', ensureAdmin, (req, res) => {
    try {
        const moduleCode = req.params.moduleCode;
        const moduleFile = path.join(__dirname, '..', 'modules', `${moduleCode}.json`);
        
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

// Update module - PUT handler
router.put('/:moduleCode', ensureAdmin, async (req, res) => {
    try {
        const moduleCode = req.params.moduleCode;
        const moduleFile = path.join(__dirname, '..', 'modules', `${moduleCode}.json`);
        
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

// Delete module route
router.delete('/:moduleCode', ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        const moduleCode = req.params.moduleCode;
        const moduleFile = path.join(__dirname, '..', 'modules', `${moduleCode}.json`);

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

// Quiz route - handle source parameters
router.get('/:moduleCode/quiz', ensureAuthenticated, (req, res) => {
    try {
        const moduleCode = req.params.moduleCode;
        const moduleFile = path.join(__dirname, '..', 'modules', `${moduleCode}.json`);

        // Get source information from query parameters
        const sourceInfo = {
            source: req.query.source || null,
            courseCode: req.query.courseCode || null
        };

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

// Quiz submission handler
router.post('/:moduleCode/quiz', ensureAuthenticated, (req, res) => {
    try {
        const moduleCode = req.params.moduleCode;
        const moduleFile = path.join(__dirname, '..', 'modules', `${moduleCode}.json`);
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

// Single module view route
router.get('/:id', ensureAuthenticated, (req, res) => {
    const moduleId = req.params.id;
    const moduleFile = path.join(__dirname, '..', 'modules', `${moduleId}.json`);

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

// API endpoint to get module data
router.get('/api/:moduleCode', ensureAuthenticated, (req, res) => {
    try {
        const moduleFile = path.join(__dirname, '..', 'modules', `${req.params.moduleCode}.json`);
        
        if (!fs.existsSync(moduleFile)) {
            return res.status(404).json({ error: 'Module not found' });
        }

        const moduleData = JSON.parse(fs.readFileSync(moduleFile, 'utf8'));
        res.json(moduleData);
    } catch (error) {
        console.error('Error fetching module:', error);
        res.status(500).json({ error: 'Failed to fetch module data' });
    }
});

// Update single module view route
router.get('/:id', ensureAuthenticated, (req, res) => {
    try {
        const moduleId = req.params.id;
        const moduleFile = path.join(__dirname, '..', 'modules', `${moduleId}.json`);

        if (!fs.existsSync(moduleFile)) {
            return res.status(404).send('Module not found');
        }

        const moduleContent = JSON.parse(fs.readFileSync(moduleFile, 'utf-8'));
        
        res.render("modules/view", { 
            module: moduleContent,
            user: req.user,
            currentPage: 'modules'
        });
    } catch (error) {
        console.error('Error loading module:', error);
        res.status(500).send('Error loading module: ' + error.message);
    }
});

module.exports = router;
