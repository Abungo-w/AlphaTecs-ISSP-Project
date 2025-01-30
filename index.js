const express = require("express");
const app = express();
const path = require("path");
const multer  = require('multer')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'library/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    },
});

const upload = multer({ storage })

const port = 3000;

app.use(express.static(path.join(__dirname, 'public')))

app.set('view-engine', 'ejs')

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get('/login',(req, res) => {
  res.render("login.ejs");
});


app.post('/login', (req, res) => {

})

app.get('/register',(req, res) => {
  res.render("register.ejs");
});

app.post('/register', (req, res) => {
  
})

app.get('/upload',(req, res) => {
  res.render("upload.ejs");
});

app.post('/upload', upload.single('file'), (req, res) => {
  res.render("upload.ejs")
});

app.get('/module',(req, res) => {
  res.render("module.ejs");
});

app.listen(port, function () {
  console.log(
    "Server running. Visit: localhost:3000 in your browser 🚀"
  );
});