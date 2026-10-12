const express = require('express');
const { listFlaggedReviews, deleteFlaggedReview, dismissFlaggedReview } = require('../controllers/moderationController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { loadFlaggedReview } = require('../middleware/moderationMiddleware');
const router = express.Router();

router.get('/admin/flagged-reviews', protect, requireRole('admin'), listFlaggedReviews);
router.delete('/admin/flagged-reviews/:reviewId', protect, requireRole('admin'), loadFlaggedReview, deleteFlaggedReview);
router.patch('/admin/flagged-reviews/:reviewId/dismiss', protect, requireRole('admin'), loadFlaggedReview, dismissFlaggedReview);

module.exports = router;
