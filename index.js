const express = require("express");
const app = express();
const path = require("path");
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ejsLayouts = require("express-ejs-layouts");
const { authController } = require("./controller/auth_controller.js");
const { ensureAdmin, forwardAuthenticated, ensureAuthenticated } = require("./middleware/checkAuth.js");
const session = require("express-session");
const passport = require("./middleware/passport");
const multer = require("multer");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");

// Configure multer 
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
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
app.use(flash());

const port = 3000;

app.set("layout", "navbar");
app.set("view engine", "ejs");
app.use(ejsLayouts);
app.use(passport.initialize());
app.use(passport.session());

// Flash messages middleware
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

// Put between flash messages middleware and before the routes
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Existing routes
app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/register", authController.register);
app.get("/login", forwardAuthenticated, authController.login);
app.post("/register", authController.registerSubmit);
app.post("/login", passport.authenticate("local", {
  successRedirect: "/home",
  failureRedirect: "/login",
}));

app.get("/home", ensureAuthenticated, authController.home);
app.get("/admin", ensureAdmin, authController.admin);
app.get("/admin/revoke/:id", ensureAdmin, authController.revoke);

app.get("/profile", ensureAuthenticated, (req, res) => {
  res.render("profile", { user: req.user });
});

// New route for updating profile
app.post("/update-profile", ensureAuthenticated, upload.single("profilePicture"), async (req, res) => {
  try {
    const updateData = {};

    // Fields that are actually present in the request
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.jobIndustry) updateData.jobIndustry = req.body.jobIndustry;
    if (req.body.position) updateData.position = req.body.position;

    // Handle profile picture
    if (req.file) {
      if (req.user.profilePicture) {
        const oldFilePath = path.join(__dirname, 'public', req.user.profilePicture);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      updateData.profilePicture = `/uploads/${req.file.filename}`;
    }

    // Handle password update
    if (req.body.password && req.body.password.trim() !== '') {
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: {
        id: req.user.id
      },
      data: updateData
    });

    // Update session
    req.user = updatedUser;
    
    req.flash('success', 'Profile updated successfully');
    res.redirect('/profile');
  } catch (error) {
    console.error('Profile update error:', error);
    req.flash('error', 'Error updating profile: ' + error.message);
    res.redirect('/profile');
  }
});

app.listen(port, function () {
  console.log("Server running. Visit: localhost:3000 in your browser 🚀");
});