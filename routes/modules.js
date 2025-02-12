/* ...existing code... */

// GET route for edit page
router.get('/:id/edit', async (req, res) => {
    try {
        const module = await Module.findById(req.params.id);
        if (!module) {
            return res.status(404).send('Module not found');
        }
        res.render('modules/edit_module', { module });
    } catch (error) {
        res.status(500).send('Error loading module');
    }
});

// POST route for updating module
router.post('/:id/edit', async (req, res) => {
    try {
        const { title, description, duration, content } = req.body;
        await Module.findByIdAndUpdate(req.params.id, {
            title,
            description,
            duration,
            content
        });
        res.redirect(`/modules/${req.params.id}`);
    } catch (error) {
        res.status(500).send('Error updating module');
    }
});

// GET route for viewing a single module
router.get('/:id', async (req, res) => {
    try {
        const module = await Module.findById(req.params.id);
        if (!module) {
            return res.status(404).send('Module not found');
        }
        res.render('modules/view_module', { module });
    } catch (error) {
        console.error('Error loading module:', error);
        res.status(500).send('Error loading module');
    }
});

// DELETE route for module
router.delete('/:id', async (req, res) => {
    try {
        await Module.findByIdAndDelete(req.params.id);
        res.status(200).send('Module deleted successfully');
    } catch (error) {
        console.error('Error deleting module:', error);
        res.status(500).send('Error deleting module');
    }
});

// POST route for creating a new module
router.post('/create', async (req, res) => {
    try {
        console.log('Received form data:', req.body); // Debug log
        
        const { moduleCode, title, description, duration, content } = req.body;
        
        // Basic validation
        if (!moduleCode || !title || !description || !duration || !content) {
            console.log('Missing required fields'); // Debug log
            return res.status(400).send('All fields are required');
        }

        // Create new module
        const newModule = new Module({
            moduleCode: moduleCode,
            title: title,
            description: description,
            duration: parseInt(duration),
            content: content,
            introduction: "Introduction section", // Default value for now
            summary: "Summary section"  // Default value for now
        });

        console.log('Created module object:', newModule); // Debug log

        // Save the module
        const savedModule = await newModule.save();
        console.log('Saved module:', savedModule); // Debug log

        res.redirect('/modules');
    } catch (error) {
        console.error('Error creating module:', error);
        res.status(500).send(`Error creating module: ${error.message}`);
    }
});

// GET route for viewing all modules
router.get('/', async (req, res) => {
    try {
        const modules = await Module.find().sort({ createdAt: -1 });
        res.render('module', { modules });
    } catch (error) {
        console.error('Error fetching modules:', error);
        res.status(500).send('Error fetching modules');
    }
});

/* ...existing code... */
