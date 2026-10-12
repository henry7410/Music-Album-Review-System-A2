
const express = require('express');
const { registerUser, loginUser, logoutUser } = require('../controllers/authController');
const { createUserProfileController } = require('../controllers/userProfileController');
const { MongoUserProfileService } = require('../services/UserProfileService');
const OwnershipProxy = require('../services/OwnershipProxy');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();
const userProfileController = createUserProfileController(
    new OwnershipProxy(new MongoUserProfileService())
);

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);
router.get('/profile', protect, userProfileController.getProfile);
router.get('/users/:userId/profile', protect, userProfileController.getProfile);
router.put('/profile', protect, userProfileController.updateProfile);
router.put('/users/:userId/profile', protect, userProfileController.updateProfile);
router.delete('/profile', protect, userProfileController.deleteProfile);
router.delete('/users/:userId/profile', protect, userProfileController.deleteProfile);

module.exports = router;
