
const Review = require('../models/Review');
const Album = require('../models/Album');
const FlaggedReview = require('../models/FlaggedReview');
const { aggregateRating } = require('../utils/aggregateRating');

const serializeReview = (review, requesterId, flaggedReviewIds = []) => ({
    _id: review._id,
    albumId: review.albumId,
    stars: review.stars,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    userName: review.userId.name,
    isOwn: review.userId._id.toString() === requesterId,
    isFlagged: flaggedReviewIds.includes(review._id.toString()),
});

const validateReviewInput = ({ stars, comment }) => {
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        return 'Rating must be an integer between 1 and 5';
    }
    if (comment !== undefined && comment !== null && String(comment).length > 250) {
        return 'Comment must be at most 250 characters';
    }
    return null;
};

const createReview = async (req, res) => {
    const { albumId, stars, comment } = req.body;

    if (!albumId) {
        return res.status(400).json({ message: 'albumId is required' });
    }
    const validationError = validateReviewInput({ stars, comment });
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    try {
        const album = await Album.findById(albumId);
        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }

        const existing = await Review.findOne({ userId: req.user.id, albumId });
        if (existing) {
            return res.status(409).json({ message: 'You have already reviewed this album' });
        }

        const review = await Review.create({
            userId: req.user.id,
            albumId,
            stars,
            comment: comment || '',
        });
        await review.populate('userId', 'name');
        const { averageRating, reviewCount } = await aggregateRating(albumId);

        res.status(201).json({ ...serializeReview(review, req.user.id), averageRating, reviewCount });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Album not found' });
        }
        if (error.code === 11000) {
            return res.status(409).json({ message: 'You have already reviewed this album' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const listReviewsForAlbum = async (req, res) => {
    try {
        const reviews = await Review.find({ albumId: req.params.id })
            .sort({ createdAt: -1 })
            .populate('userId', 'name');
        const flags = await FlaggedReview.find({
            flaggedBy: req.user.id,
        });

        const flaggedReviewIds = flags.map(
            (flag) => flag.reviewId.toString()
        );

        res.status(200).json(reviews.map((review) => serializeReview(review, req.user.id, flaggedReviewIds)));
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Album not found' });
        }
        res.status(500).json({ message: error.message });
    }
};

const updateReview = async (req, res) => {
    const { stars, comment } = req.body;

    const validationError = validateReviewInput({ stars, comment });
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    try {
        const review = req.resource;
        review.stars = stars;
        review.comment = comment || '';
        await review.save();
        await review.populate('userId', 'name');
        const { averageRating, reviewCount } = await aggregateRating(review.albumId);

        res.status(200).json({ ...serializeReview(review, req.user.id), averageRating, reviewCount });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const deleteReview = async (req, res) => {
    try {
        const { albumId } = req.resource;
        // Flags first: if this fails the review still exists, so no flag is
        // left pointing at a deleted review.
        await FlaggedReview.deleteMany({ reviewId: req.resource._id });
        await req.resource.deleteOne();
        const { averageRating, reviewCount } = await aggregateRating(albumId);

        res.status(200).json({ message: 'Review deleted', averageRating, reviewCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createReview, listReviewsForAlbum, updateReview, deleteReview };
