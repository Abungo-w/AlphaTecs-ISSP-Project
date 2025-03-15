const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ensureAdmin = require('../middleware/ensureAdmin');

// ...existing code...

// Add edit route
router.get('/:moduleCode/edit', ensureAdmin, async (req, res) => {
    try {
        const moduleCode = req.params.moduleCode;
        const moduleFile = path.join(__dirname, '../modules', `${moduleCode}.json`);
        
        if (!fs.existsSync(moduleFile)) {
            return res.status(404).send('Module not found');
        }

        const moduleData = JSON.parse(await fs.promises.readFile(moduleFile, 'utf8'));
        res.render('modules/edit_module', { module: moduleData });
    } catch (error) {
        console.error('Error loading module for edit:', error);
        res.status(500).send('Error loading module');
    }
});

// Add update route
router.put('/:moduleCode', ensureAdmin, async (req, res) => {
    try {
        const moduleCode = req.params.moduleCode;
        const moduleFile = path.join(__dirname, '../modules', `${moduleCode}.json`);
        
        if (!fs.existsSync(moduleFile)) {
            return res.status(404).json({ success: false, error: 'Module not found' });
        }

        const currentModule = JSON.parse(await fs.promises.readFile(moduleFile, 'utf8'));
        const updatedModule = {
            ...currentModule,
            ...req.body,
            lastModified: new Date().toISOString()
        };
        
        await fs.promises.writeFile(moduleFile, JSON.stringify(updatedModule, null, 2));
        
        res.json({ success: true, message: 'Module updated successfully' });
    } catch (error) {
        console.error('Error updating module:', error);
        res.status(500).json({ success: false, error: 'Failed to update module' });
    }
});

// ...existing code...

module.exports = router;
