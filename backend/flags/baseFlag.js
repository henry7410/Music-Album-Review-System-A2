class BaseFlag {
    constructor(reviewId, flaggedBy) {
        this.reviewId = reviewId;
        this.flaggedBy = flaggedBy;
    }

    // if someone inheritance baseFlag but does not implement getReason() throw error
    getReason() {
        throw new Error('getReason() must be implemented');
    }

    toObject() {
        return {
            reviewId: this.reviewId,
            flaggedBy: this.flaggedBy,
            reason: this.getReason(),
        };
    }
}

module.exports = BaseFlag;