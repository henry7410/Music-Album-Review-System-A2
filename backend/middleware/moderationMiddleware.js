const mongoose = require('mongoose');
const FlaggedReview = require('../models/FlaggedReview');
const Review = require('../models/Review');

// Loads the review named by :reviewId and its pending flags for the admin
// moderation actions, as req.flaggedReview = { review, pendingFlags }.
const loadFlaggedReview = async (req, res, next) => {
    const { reviewId } = req.params;

    // isObjectIdOrHexString, not ObjectId.isValid: isValid accepts any
    // 12-character string, which would then fail later as a 500.
    if (!mongoose.isObjectIdOrHexString(reviewId)) {
        return res.status(400).json({ message: 'Invalid review id' });
    }

    try {
        const pendingFlags = await FlaggedReview.find({ reviewId, status: 'pending' });
        if (pendingFlags.length === 0) {
            return res.status(404).json({ message: 'No pending flags for this review' });
        }

        // Flags can only outlive their review if a delete failed partway;
        // the queue already hides those rows, so there is nothing to act on.
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        req.flaggedReview = { review, pendingFlags };
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { loadFlaggedReview };
