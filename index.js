const express = require("express");
const app = express();
const path = require("path");

const port = 3000;

app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.listen(port, function () {
    console.log(
      "Server running. Visit: localhost:3000 in your browser 🚀"
    );
});