/**
 * Utility functions for handling session-related operations
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

/**
 * Safely saves the session and executes a callback
 * @param {Object} req - Express request object
 * @param {Function} callback - Function to execute after session save
 */
const saveSessionSafely = (req, res, callback) => {
  if (!req.session) {
    console.error('No session object available');
    return callback(new Error('No session object'));
  }
  
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).send('An error occurred while saving your session');
    }
    
    console.log('Session saved successfully');
    return callback(null);
  });
};

module.exports = {
  debugSession,
  saveSessionSafely
};
