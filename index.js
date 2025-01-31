const express = require("express");
const app = express();
const path = require("path");
const ejsLayouts = require("express-ejs-layouts");
const { Controller } = require("./controller/controller.js");
const { ensureAdmin, forwardAuthenticated, ensureAuthenticated } = require("./middleware/checkAuth.js");
const session = require("express-session");
const passport = require("./middleware/passport");
const flash = require('connect-flash');
const { uploadprofileimage } = require("./upload_module.js");
const fs = require('fs');

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "modules")));

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

app.use(express.static(path.join(__dirname, 'public')))

app.set("view engine", "ejs");
app.use(ejsLayouts);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(Controller.flaskmessage);
app.use(Controller.user);

app.get("/", Controller.index);

app.get("/register", Controller.register);
app.post("/register", Controller.registerSubmit);

app.get("/login", forwardAuthenticated ,Controller.login);
app.post("/login", passport.authenticate("local", {
  successRedirect: "/home",
  failureRedirect: "/login",
}));

app.get("/logout", Controller.logout);

app.get("/home", ensureAuthenticated, Controller.home);

app.get("/admin", ensureAdmin, Controller.admin);
app.get("/admin/revoke/:id", ensureAdmin, Controller.revoke);

app.get("/course", ensureAdmin, Controller.course);

app.get("/profile", ensureAuthenticated, Controller.profile);
app.post("/updateprofile", uploadprofileimage.single('profilePicture') ,Controller.updateprofile);

app.get("/modules", ensureAuthenticated, (req, res) => {
  const moduleDir = path.join(__dirname, 'modules');
  
  fs.readdir(moduleDir, (err, files) => {
    if (err) return res.status(500).send('Error reading modules');
    
    const modules = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(moduleDir, file), 'utf-8'));
          return {
            id: content.id || file.replace('.json', ''),
            title: content.title,
            description: content.description,
            difficulty: content.difficulty,
            duration: content.duration
          };
        } catch (error) {
          console.error(`Error reading module file ${file}:`, error);
          return null;
        }
      })
      .filter(module => module !== null);
    
    res.render("module", { modules });
  });
});

app.get("/modules/:id", ensureAuthenticated, (req, res) => {
  const moduleId = req.params.id;
  const moduleFile = path.join(__dirname, 'modules', `${moduleId}.json`);
  
  if (!fs.existsSync(moduleFile)) {
    return res.status(404).render('error', {
      message: 'Module not found',
      error: { status: 404 }
    });
  }

  try {
    const moduleContent = JSON.parse(fs.readFileSync(moduleFile, 'utf-8'));
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.json(moduleContent);
    } else {
      res.render("module-detail", { module: moduleContent });
    }
  } catch (error) {
    res.status(500).render('error', {
      message: 'Error loading module',
      error: { status: 500 }
    });
  }
});

app.listen(port, function () {
  console.log(
    "Server running. Visit: localhost:3000 in your browser 🚀"
  );
});