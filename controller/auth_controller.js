const { db } = require("../prisma/database");
const passport = require("../middleware/passport");
const { name } = require("ejs");


let authController = {
  login: (req, res) => {
    res.render("login", {layout: "login_signup_layout"}); 
  },

  register: (req, res) => {
    res.render("register", {layout: "login_signup_layout"});
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
};

module.exports = { authController, db };
