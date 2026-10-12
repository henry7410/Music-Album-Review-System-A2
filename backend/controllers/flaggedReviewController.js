const FlaggedReview = require('../models/FlaggedReview');
const Review = require('../models/Review');
const FlagFactory = require('../flags/flagFactory');

const createFlaggedReview = async (req, res) => {
    const { reviewId, reason } = req.body;

    if (!reviewId || !reason) {
        return res.status(400).json({
            message: 'reviewId and reason are required',
        });
    }

    try {
        const review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({
                message: 'Review not found',
            });
        }

        const flagObject = FlagFactory.create(
            reason,
            reviewId,
            req.user.id
        );

        const flag = await FlaggedReview.create(
            flagObject.toObject()
        );

        res.status(201).json(flag);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'You have already flagged this review',
            });
        }

        res.status(500).json({
            message: error.message,
        });
    }
};

module.exports = {
    createFlaggedReview,
};