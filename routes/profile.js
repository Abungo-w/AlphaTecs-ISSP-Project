const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile_controller');

router.get('/profile', profileController.getProfile);
router.post('/update-profile', profileController.updateProfile);

module.exports = router;
