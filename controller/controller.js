const { db } = require("../prisma/database");
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const userModel = require("../models/userModel").userModel;

let Controller = {

  flaskmessage: (req, res, next) => {
    res.locals.messages = req.flash();
    next();
  },

  user: (req, res, next) => {
    res.locals.user = req.user || null;
    next();
  },

  index: (req, res) => {
    res.render("index");
  },
  login: (req, res) => {
    res.render("login", {layout: "login_signup_layout"}); 
  },

  register: (req, res) => {
    res.render("register", {layout: "login_signup_layout"});
  },
  registerSubmit: async (req, res) => {
    try {
      const { firstName, lastName, email, password, confirmPassword, jobTitle, field } = req.body;
      
      if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match');
        return res.redirect("/register");
      }

      await userModel.registerUser({
          name: `${firstName} ${lastName}`,
          email,
          password,
          jobTitle,
          field
      });
      req.flash('success', 'Registration successful! Please login.');
      res.redirect("/login");
    } catch (error) {
      req.flash('error', error.message);
      res.redirect("/register");
    }
  },
  
  logout: (req, res) => {
    // Clear admin preservation data if exists
    res.clearCookie('admin_preserve');
    
    // Clear app locals
    if (req.app.locals.lastActiveAdmin) {
      delete req.app.locals.lastActiveAdmin;
    }
    
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      
      // Clear session cookie
      res.clearCookie('app.sid');
      
      // Redirect to login page
      res.redirect('/login');
    });
  },

  home: async (req, res) => {
    const moduleDir = path.join(__dirname, '..', 'modules');
    
    try {
        const files = fs.readdirSync(moduleDir);
        const modules = files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const content = JSON.parse(fs.readFileSync(path.join(moduleDir, file), 'utf-8'));
                return {
                    id: content.id || file.replace('.json', ''),
                    title: content.title,
                    description: content.description,
                    difficulty: content.difficulty,
                    duration: content.duration
                };
            })
            .filter(module => module !== null);

        // Get all courses
        const allCourses = modules;
        
        // Sort courses by creation date (newest first)
        const sortedCourses = [...allCourses].sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        // Get featured courses (latest 3 courses)
        const featuredCourses = sortedCourses.slice(0, 3);
        
        res.render("home", {
          user: req.user,
          courses: allCourses,
          featuredCourses: featuredCourses
        });
    } catch (error) {
        console.error('Error loading modules:', error);
        res.render("home", { user: req.user, modules: [] });
    }
  },

  profile: (req, res) => {
    res.render("profile", {additionalCSS: "/css/profile", additionalCSS2: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min"});
  },

  updateprofile: async (req, res) => {
    try {
      const { name, email, password, confirmPassword, jobTitle, field, notifications, privacy } = req.body;
      
      if (password || confirmPassword) {
        if (password !== confirmPassword) {
          req.flash('error', 'Passwords do not match');
          return res.redirect("/profile");
        }
      }

      const updateData = {
          name,
          email,
          jobTitle,
          field,
          notifications,
          privacy
      };

      if (password) {
          updateData.password = password;
      }

      if (req.file) {
          updateData.profilePicture = '/uploads/' + req.file.filename;
      }

      await userModel.updateUser(req.user.id, updateData);
      req.flash('success', 'Profile updated successfully!');
      res.redirect("/profile");
    } catch (error) {
      req.flash('error', 'Failed to update profile: ' + error.message);
      res.redirect("/profile");
    }
  },

  revoke: async (req, res) => {
    const sessionId = req.params.id;
    req.sessionStore.destroy(sessionId, (err) => {
      res.redirect('/admin'); 
    });
  },
  
  admin: async (req, res) => {
    const sessions = req.sessionStore.sessions; 
    const usersessions = Object.keys(sessions).map((sessionId) => {
      return {
        sessionId,
        userId: JSON.parse(sessions[sessionId]).passport.user, 
      };
    });

    const users = await Promise.all(
      usersessions.map((userSession) =>
        db.user.findUnique({
          where: { id: userSession.userId },
        })
          .then((user) => {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              sessionId: userSession.sessionId,
            };
          })
          .catch((error) => {
            console.error(error);
          })
      )
    );

    res.render("admin/admin", {blocks: users, additionalCSS: "/css/admin"}  );
  },

  course: (req, res) => {
    res.render("course");
  },

  module: (req, res) => {
    res.render("module");
  },

  modules: async (req, res) => {
    try {
      const modules = await db.module.findMany({
        include: {
          themes: true
        }
      }) || [];
      
      res.render("module", {
        modules: modules
      });
    } catch (error) {
      console.error('Error fetching modules:', error);
      res.render("module", {
        modules: []
      });
    }
  },
};

module.exports = { Controller, db };
