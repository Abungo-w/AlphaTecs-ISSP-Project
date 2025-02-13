const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');

const app = express();
const moduleDir = path.join(__dirname, 'modules/');
const upload = multer({ dest: "modules/" })

// Ensure `modules/` directory exists
if (!fs.existsSync(moduleDir)) {
    fs.mkdirSync(moduleDir);
}
// Function to parse a file and convert it into a learning module
function processFile(filePath, filename) {
    const fileExt = path.extname(filePath);
    let moduleContent = '';
    if (fileExt === '.csv') {
        moduleContent = parseCSV(filePath);  // Implement CSV parsing
    } else if (fileExt === '.json') {
        moduleContent = fs.readFileSync(filePath, 'utf-8');
    } else {
        throw new Error('Unsupported file format');
    }
    // Save parsed module in `/modules`
    const modulePath = path.join(moduleDir, `${filename}.json`);
    fs.writeFileSync(modulePath, JSON.stringify(moduleContent, null, 2));
}

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ? Section data ?
// Upload route
app.post('/modules', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');
    try {
        const moduleData = JSON.parse(fs.readFileSync(req.file.path, 'utf-8'));
        
        // Ensure proper structure for case study and quiz
        const processedData = {
            ...moduleData,
            caseStudy: {
                content: moduleData.caseStudyContent || '',
                questions: moduleData.caseStudyQuestions || []
            },
            quiz: moduleData.quiz || []
        };

        // Save processed module
        const modulePath = path.join(moduleDir, `${req.file.filename}.json`);
        fs.writeFileSync(modulePath, JSON.stringify(processedData, null, 2));
        
        res.send({ message: 'Module created successfully', data: processedData });
    } catch (error) {
        console.error('Error processing module:', error);
        res.status(500).send(error.message);
    }
});

// Update the module creation route to handle structured JSON data
app.post('/modules/create', express.json({limit: '50mb'}), (req, res) => {
    try {
        console.log('Received data:', req.body); // Debug log

        // Validate required fields
        if (!req.body.moduleCode || !req.body.title || !req.body.content) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const moduleData = {
            moduleCode: req.body.moduleCode,
            title: req.body.title,
            description: req.body.description || '',
            duration: parseInt(req.body.duration) || 30,
            content: req.body.content,
            createdAt: new Date().toISOString(),
            caseStudies: req.body.caseStudies || [],
            quiz: req.body.quiz || []
        };

        // Generate unique ID for the module
        const moduleId = `M-${Date.now()}`;
        const modulePath = path.join(moduleDir, `${moduleId}.json`);
        
        // Save the module
        fs.writeFileSync(modulePath, JSON.stringify(moduleData, null, 2));
        
        // Force JSON response
        res.setHeader('Content-Type', 'application/json');
        return res.json({
            success: true,
            moduleId: moduleId,
            message: 'Module created successfully'
        });

    } catch (error) {
        console.error('Error creating module:', error);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({
            success: false,
            message: error.message || 'Error creating module'
        });
    }
});

// Get all learning modules
app.get('/modules/', (req, res) => {
    fs.readdir(moduleDir, (err, files) => {
        if (err) return res.status(500).send('Error reading modules');
        
        const modules = files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const content = JSON.parse(fs.readFileSync(path.join(moduleDir, file), 'utf-8'));
                return {
                    id: content.id || file.replace('.json', ''),
                    title: content.title,
                    description: content.description,
                    difficulty: content.difficulty,
                    duration: content.duration
                };
            });
        
        res.render('module', { modules });
    });
});
// Get a specific learning module
app.get('/modules/:id', (req, res) => {
    const modulePath = path.join(moduleDir, `${req.params.id}.json`);
    
    if (!fs.existsSync(modulePath)) {
        return res.status(404).render('error', { 
            message: 'Module not found',
            error: { status: 404, stack: '' }
        });
    }
    
    try {
        const moduleContent = JSON.parse(fs.readFileSync(modulePath, 'utf-8'));
        
        // Create complete module data structure
        const moduleData = {
            ...moduleContent,
            id: moduleContent.id || req.params.id,
            title: moduleContent.title || 'Untitled Module',
            moduleCode: moduleContent.moduleCode || '',
            content: moduleContent.content || '',
            duration: moduleContent.duration || 0,
            description: moduleContent.description || '',
            // Case studies array
            caseStudies: moduleContent.caseStudies || [],
            // Quiz array
            quiz: moduleContent.quiz || []
        };
        
        res.render('modules/view_module', { module: moduleData });
    } catch (error) {
        console.error('Error loading module:', error);
        res.status(500).render('error', { 
            message: 'Error loading module',
            error: { status: 500, stack: error.message }
        });
    }
});
// Add this debug route to check module data
app.get('/modules/:id/debug', (req, res) => {
    const modulePath = path.join(moduleDir, `${req.params.id}.json`);
    
    if (!fs.existsSync(modulePath)) {
        return res.status(404).json({ error: 'Module file not found' });
    }
    
    try {
        const rawData = fs.readFileSync(modulePath, 'utf-8');
        const moduleContent = JSON.parse(rawData);
        res.json({
            raw: moduleContent,
            processed: {
                ...moduleContent,
                id: moduleContent.id || req.params.id,
                caseStudyContent: moduleContent.caseStudy?.content || moduleContent.caseStudyContent || '',
                caseStudyQuestions: moduleContent.caseStudy?.questions || moduleContent.caseStudyQuestions || [],
                quiz: moduleContent.quiz || []
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Delete a module
app.delete('/modules/:id', (req, res) => {
    const modulePath = path.join(moduleDir, `${req.params.id}.json`);
    
    if (!fs.existsSync(modulePath)) return res.status(404).send('Module not found');
    
    fs.unlinkSync(modulePath);
    res.send({ message: 'Module deleted' });
});
// Start server
app.listen(3000, () => console.log('Server running on port 3000'));

