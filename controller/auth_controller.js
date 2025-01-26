const { db } = require("../prisma/database");
const passport = require("../middleware/passport");


let authController = {
  login: (req, res) => {
    res.render("login"); 
  },

  register: (req, res) => {
    res.render("register");
  },

  home: (req, res) => {
    if (req.user.role === "admin") {
      res.redirect('/admin')
    } else res.render("home", { user: req.user });
  },

  revoke: async (req, res) => {
    const sessionId = req.params.id;
    req.sessionStore.destroy(sessionId, (err) => {
      res.redirect('/admin'); 
    });
  },
  
  admin: (req, res) => {
    const sessions = req.sessionStore.sessions; 
    const users = Object.keys(sessions).map((sessionId) => {
      return {
        sessionId,
        userId: JSON.parse(sessions[sessionId]).passport.user, 
      };
    });
    res.render("admin/admin", {blocks: users} );
  },
  registerSubmit: async (req, res) => {
    // implement
    let user = {
      email: req.body.email,
      password: req.body.password,
    }
    await db.user.create({
      data: user
    })

    res.redirect("/login");
  },
};

module.exports = { authController, db };
