const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Update progress route
router.post('/update', async (req, res) => {
    const { userId, moduleId, progress } = req.body;

    try {
        const updatedProgress = await prisma.progress.upsert({
            where: { userId_moduleId: { userId, moduleId } },
            update: { progress },
            create: { userId, moduleId, progress }
        });
        res.json(updatedProgress);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

module.exports = router;
