const express = require("express");

const app = express();
const port = 3000;

app.get("/", (req, res) => {
    res.send("Hello from Express!");
});

app.listen(port, function () {
    console.log(
      "Server running. Visit: localhost:3000 in your browser 🚀"
    );
});