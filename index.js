const express = require("express");
const app = express();
const path = require("path");
const ejsLayouts = require("express-ejs-layouts");
const { authController } = require("./controller/auth_controller.js");
const { ensureAdmin, forwardAuthenticated, ensureAuthenticated } = require("./middleware/checkAuth.js");
const session = require("express-session");
const passport = require("./middleware/passport");

app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

const port = 3000;

app.set("view engine", "ejs");
app.use(ejsLayouts);
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.get("/register", authController.register);
app.get("/login", forwardAuthenticated ,authController.login);
app.post("/register", authController.registerSubmit);
app.post("/login", passport.authenticate("local", {
  successRedirect: "/home",
  failureRedirect: "/login",
}));

app.get("/home", ensureAuthenticated, authController.home);
app.get("/admin", ensureAdmin, authController.admin);

app.listen(port, function () {
    console.log(
      "Server running. Visit: localhost:3000 in your browser 🚀"
    );
});