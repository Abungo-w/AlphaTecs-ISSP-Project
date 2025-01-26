const express = require("express");
const app = express();
const path = require("path");

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

app.listen(port, function () {
  console.log(
    "Server running. Visit: localhost:3000 in your browser 🚀"
  );
});