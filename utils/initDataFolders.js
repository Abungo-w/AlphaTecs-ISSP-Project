const fs = require('fs');
const path = require('path');

function initDataFolders() {
    const folders = ['modules', 'users', 'profiles'];
    
    folders.forEach(folder => {
        const folderPath = path.join(__dirname, '..', folder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            console.log(`Created ${folder} directory`);
        }
    });
}

module.exports = initDataFolders;
