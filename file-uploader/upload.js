const express = require('express');
const app = express();

const multer = require('multer')
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'library/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    },
});
const upload = multer({ storage })

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    res.json(req.file);
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});