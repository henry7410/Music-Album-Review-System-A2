const RudeFlag = require('./rudeFlag');
const SpamFlag = require('./spamFlag');
const UnrelatedFlag = require('./unrelatedFlag');

class FlagFactory {
    static create(reason, reviewId, flaggedBy) {
        switch (reason) {
            case 'Rude':
                return new RudeFlag(reviewId, flaggedBy);

            case 'Spam':
                return new SpamFlag(reviewId, flaggedBy);

            case 'Unrelated to Music Album':
                return new UnrelatedFlag(reviewId, flaggedBy);

            default:
                throw new Error('Invalid flag reason');
        }
    }
}

module.exports = FlagFactory;