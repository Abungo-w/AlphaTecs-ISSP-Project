const fs = require('fs');
const path = require('path');
const fsPromises = fs.promises;

async function initializeDataFolders() {
    try {
        // Create data folders if they don't exist
        const folders = ['modules', 'users', 'profiles', 'data'];
        
        for (const folder of folders) {
            const folderPath = path.join(__dirname, '..', folder);
            if (!fs.existsSync(folderPath)) {
                await fsPromises.mkdir(folderPath, { recursive: true });
                console.log(`Created ${folder} directory`);
            }
        }
        
        // Create uploads folder in public directory
        const uploadsFolder = path.join(__dirname, '..', 'public', 'uploads');
        if (!fs.existsSync(uploadsFolder)) {
            await fsPromises.mkdir(uploadsFolder, { recursive: true });
            console.log('Created uploads folder');
        }
    } catch (error) {
        console.error('Error initializing data folders:', error);
        throw error;
    }
}

module.exports = initializeDataFolders;
