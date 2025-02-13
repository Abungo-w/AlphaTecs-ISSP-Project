const fs = require('fs');
const path = require('path');

function initDataFolders() {
    const dataFolders = [
        'data',
        'data/uploads',
        'data/temp'
    ];

    dataFolders.forEach(folder => {
        const folderPath = path.join(__dirname, '..', folder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            console.log(`Created directory: ${folderPath}`);
        }
    });
}

module.exports = initDataFolders;
