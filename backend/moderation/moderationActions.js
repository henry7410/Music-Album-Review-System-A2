const FlaggedReview = require('../models/FlaggedReview');
const { removeReview } = require('../controllers/reviewController');

// Template method: execute() always runs the subclass's performAction(),
// then reloads the moderation queue, so the client gets the updated list in
// the same response.
class ModerationAction {
    // flaggedReview: { review, pendingFlags }, attached by loadFlaggedReview.
    // loadQueue: passed in by the controller, which owns the queue query.
    constructor(flaggedReview, loadQueue) {
        this.review = flaggedReview.review;
        this.pendingFlags = flaggedReview.pendingFlags;
        this.loadQueue = loadQueue;
    }

    // Subclasses must implement performAction().
    async performAction() {
        throw new Error('performAction() must be implemented');
    }

    async execute() {
        const result = await this.performAction();
        const queue = await this.loadQueue();
        return { ...result, queue };
    }
}

// Removes the review and all of its flags (pending and dismissed), using the
// same deletion as the author's own delete.
class DeleteReviewAction extends ModerationAction {
    async performAction() {
        const { averageRating, reviewCount } = await removeReview(this.review);
        return { message: 'Review deleted', albumId: this.review.albumId, averageRating, reviewCount };
    }
}

// Keeps the review; marks its pending flags as dismissed so it leaves the queue.
class DismissFlagsAction extends ModerationAction {
    async performAction() {
        const result = await FlaggedReview.updateMany(
            { reviewId: this.review._id, status: 'pending' },
            { $set: { status: 'dismissed' } }
        );
        return { message: 'Flags dismissed', dismissedCount: result.modifiedCount };
    }
}

module.exports = { ModerationAction, DeleteReviewAction, DismissFlagsAction };
