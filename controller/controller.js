const { db } = require("../prisma/database");
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    let user = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
    }
    await db.user.create({
      data: user
    })

    res.redirect("/login");
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
      const updateData = {};
  
      if (req.body.name) updateData.name = req.body.name;
      if (req.body.email) updateData.email = req.body.email;
      if (req.body.jobIndustry) updateData.jobIndustry = req.body.jobIndustry;
      if (req.body.position) updateData.position = req.body.position;
  
      if (req.file) {
        if (req.user.profilePicture) {
          const oldFilePath = path.join(__dirname, '..', 'public', req.user.profilePicture);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        updateData.profilePicture = `/uploads/${req.file.filename}`;
      }
  
      if (req.body.password && req.body.password.trim() !== '') {
        updateData.password = await bcrypt.hash(req.body.password, 10);
      }
  
      const updatedUser = await prisma.user.update({
        where: {
          id: req.user.id
        },
        data: updateData
      });
  
      req.user = updatedUser;
      
      req.flash('success', 'Profile updated successfully');
      res.redirect('/profile');
    } catch (error) {
      console.error('Profile update error:', error);
      req.flash('error', 'Error updating profile: ' + error.message);
      res.redirect('/profile');
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

    res.render("admin/admin", {blocks: users} );
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
