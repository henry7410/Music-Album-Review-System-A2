const FlaggedReview = require('../models/FlaggedReview');
const Review = require('../models/Review');

const DELETED_USER = 'Deleted user';
const DELETED_ALBUM = 'Deleted album';

// Step 1 — count. One group per review that has at least one pending flag,
// most-flagged first, then most recently flagged.
const pendingFlagsByReview = [
    { $match: { status: 'pending' } },
    {
        $group: {
            _id: '$reviewId',
            flagCount: { $sum: 1 },
            latestFlaggedAt: { $max: '$createdAt' },
            reasons: { $push: '$reason' },
        },
    },
    // _id last only breaks remaining ties, so the order is stable.
    { $sort: { flagCount: -1, latestFlaggedAt: -1, _id: 1 } },
];

// ['Rude', 'Spam', 'Rude'] → [{ reason: 'Rude', count: 2 }, { reason: 'Spam', count: 1 }]
const countReasons = (reasons) => {
    const counts = new Map();
    for (const reason of reasons) {
        counts.set(reason, (counts.get(reason) || 0) + 1);
    }
    return [...counts]
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
};

// Step 3 — stitch. Keeps the aggregation's order. populate() returns null
// for a deleted author or album, so both fall back to a label instead of
// crashing. A flag whose review no longer exists has nothing to moderate,
// so that row is dropped.
const buildModerationRows = (groups, reviews) => {
    const reviewsById = new Map(reviews.map((review) => [review._id.toString(), review]));

    return groups
        .filter((group) => reviewsById.has(group._id.toString()))
        .map((group) => {
            const review = reviewsById.get(group._id.toString());
            return {
                reviewId: group._id,
                flagCount: group.flagCount,
                latestFlaggedAt: group.latestFlaggedAt,
                reasons: countReasons(group.reasons),
                stars: review.stars,
                comment: review.comment,
                createdAt: review.createdAt,
                authorName: review.userId?.name ?? DELETED_USER,
                albumId: review.albumId?._id ?? null,
                albumTitle: review.albumId?.title ?? DELETED_ALBUM,
                artistName: review.albumId?.artistName ?? DELETED_ALBUM,
            };
        });
};

const listFlaggedReviews = async (req, res) => {
    try {
        const groups = await FlaggedReview.aggregate(pendingFlagsByReview);

        // Step 2 — load the reviews those groups point to. Only the author's
        // name is populated, never the email (NFR-03).
        const reviews = await Review.find({ _id: { $in: groups.map((group) => group._id) } })
            .populate('userId', 'name')
            .populate('albumId', 'title artistName')
            .lean();

        res.status(200).json(buildModerationRows(groups, reviews));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { listFlaggedReviews, buildModerationRows, pendingFlagsByReview };
