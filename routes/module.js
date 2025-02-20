// ...existing code...

app.post('/modules/create', ensureAdmin, (req, res) => {
    try {
        const moduleDir = path.join(__dirname, 'modules');
        if (!fs.existsSync(moduleDir)){
            fs.mkdirSync(moduleDir);
        }

        // Prepare case study data
        const caseStudy = {
            title: req.body.caseStudyTitle,
            content: req.body.caseStudy,
            questions: req.body.caseStudyQuestions || []
        };
        const moduleData = {
            moduleCode: req.body.moduleCode,
            title: req.body.title,
            description: req.body.description,
            duration: parseInt(req.body.duration),
            content: req.body.content,
            caseStudy: caseStudy,
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

// ...existing code...
