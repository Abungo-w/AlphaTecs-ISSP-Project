const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { db } = require("../prisma/database");
const localLogin = new LocalStrategy(
  {
    usernameField: "email",
    passwordField: "password",
  },
  async (email, password, done) =>  {
    let user = await db.user.findUnique({
      where: {
        email: email,
        password: password
      },
    })
    return user
      ? done(null, user)
      : done(null, false, {
          message: "Your login details are not valid. Please try again",
        });
  }
);

passport.serializeUser(function (user, done) {
  done(null, parseInt(user.id));
});

passport.deserializeUser(async function (id, done) {
  let user = await db.user.findUnique({
    where: {
      id: parseInt(id),
    },
  });
  if (user) {
    done(null, user);
  } else {
    done({ message: "User not found" }, null);
  }
});

  
module.exports = passport.use(localLogin);

