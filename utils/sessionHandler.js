/**
 * Session debugging utilities
 */

const debugSession = (req) => {
  console.log('----------- SESSION DEBUG INFO -----------');
  console.log(`Session ID: ${req.sessionID}`);
  console.log(`Authenticated: ${req.isAuthenticated()}`);
  console.log(`User present: ${!!req.user}`);
  
  if (req.user) {
    console.log(`User ID: ${req.user.id}`);
    console.log(`Username: ${req.user.username}`);
    console.log(`User role: ${req.user.role}`);
  }
  
  console.log('Session data:', req.session);
  console.log('----------------------------------------');
};

module.exports = {
  debugSession
};
