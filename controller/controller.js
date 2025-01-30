const { db } = require("../prisma/database");

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
    req.sessionStore.destroy(req.session.id, (err) => {
      res.redirect('/login'); 
    });
  },

  home: (req, res) => {
    if (req.user.role === "admin") {
      res.redirect('/admin')
    } else res.render("home");

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
          const oldFilePath = path.join(__dirname, 'public', req.user.profilePicture);
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
};

module.exports = { Controller, db };
