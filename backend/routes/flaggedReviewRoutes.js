const express = require('express');

const {
    createFlaggedReview,
} = require('../controllers/flaggedReviewController');

const {
    protect,
    requireRole,
} = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
    '/flagged-reviews',
    protect,
    requireRole('user'),
    createFlaggedReview
);

module.exports = router;