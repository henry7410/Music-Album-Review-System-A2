const express = require('express');
const { listFlaggedReviews } = require('../controllers/moderationController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/admin/flagged-reviews', protect, requireRole('admin'), listFlaggedReviews);

module.exports = router;
