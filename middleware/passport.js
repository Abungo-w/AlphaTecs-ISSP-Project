const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { db } = require("../prisma/database");

const localLogin = new LocalStrategy(
  {
    usernameField: "email",
    passwordField: "password",
  },
  async (email, password, done) =>  {
    try {
      let user = await db.user.findUnique({
        where: {
          email: email,
          password: password
        },
      });
      
      if (user) {
        return done(null, user);
      } else {
        return done(null, false, {
          message: "Your login details are not valid. Please try again"
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      return done(error);
    }
  }
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    const user = await db.user.findUnique({
      where: { id: numericId }
    });
    
    if (!user) {
      return done(null, false);
    }
    
    done(null, user);
  } catch (error) {
    console.error('Error deserializing user:', error);
    done(error, null);
  }
});

module.exports = passport.use(localLogin);

