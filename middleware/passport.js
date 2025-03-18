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
      console.log('Attempting login for email:', email);
      let user = await db.user.findUnique({
        where: {
          email: email,
          password: password
        },
      });
      
      if (user) {
        console.log('User found:', user.id, user.username || user.email);
        return done(null, user);
      } else {
        console.log('Invalid login attempt');
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
  console.log('Serializing user:', user.id, user.username || user.email);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('Deserializing user ID:', id);
    // Convert ID to number if it's a string
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    const user = await db.user.findUnique({
      where: { id: numericId }
    });
    
    if (!user) {
      console.log('User not found during deserialization');
      return done(null, false);
    }
    
    console.log('User deserialized successfully:', user.username || user.email);
    done(null, user);
  } catch (error) {
    console.error('Error deserializing user:', error);
    done(error, null);
  }
});

module.exports = passport.use(localLogin);

