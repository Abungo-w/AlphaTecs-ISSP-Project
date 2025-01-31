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
        processFile(req.file.path, req.file.filename);
        res.send({ message: 'Module created successfully' });
    } catch (error) {
        res.status(500).send(error.message);
    }
});
// Get all learning modules
app.get('/modules/', (req, res) => {
    fs.readdir(moduleDir, (err, files) => {
        if (err) return res.status(500).send('Error reading modules');
        
        const modules = files.map(file => file.replace('.json', ''));
        res.render('module');
    });
});
// Get a specific learning module
app.get('/modules/:id', (req, res) => {
    const modulePath = path.join(moduleDir, `${req.params.id}.json`);
    
    if (!fs.existsSync(modulePath)) return res.status(404).send('Module not found');
    
    res.sendFile(modulePath);
    res.render('module')
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

