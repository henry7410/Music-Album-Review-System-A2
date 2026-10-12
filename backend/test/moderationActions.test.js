const { expect } = require('chai');
const sinon = require('sinon');
const FlaggedReview = require('../models/FlaggedReview');
const Review = require('../models/Review');
const {
    ModerationAction,
    DeleteReviewAction,
    DismissFlagsAction,
} = require('../moderation/moderationActions');

const QUEUE = [{ reviewId: 'other' }];

describe('Moderation actions', () => {
    afterEach(() => sinon.restore());

    it('execute() runs performAction() first, then returns its result with the refreshed queue', async () => {
        const calls = [];
        class FakeAction extends ModerationAction {
            async performAction() {
                calls.push('performAction');
                return { message: 'done' };
            }
        }
        const loadQueue = async () => {
            calls.push('loadQueue');
            return QUEUE;
        };

        const result = await new FakeAction({ review: {}, pendingFlags: [] }, loadQueue).execute();

        expect(calls).to.deep.equal(['performAction', 'loadQueue']);
        expect(result).to.deep.equal({ message: 'done', queue: QUEUE });
    });

    it('the base class refuses to run without a performAction() override', async () => {
        const loadQueue = sinon.stub().resolves(QUEUE);
        let error;
        try {
            await new ModerationAction({ review: {}, pendingFlags: [] }, loadQueue).execute();
        } catch (e) {
            error = e;
        }

        expect(error.message).to.equal('performAction() must be implemented');
        expect(loadQueue.called).to.equal(false);
    });

    it('DeleteReviewAction deletes flags before the review, then recalculates the rating', async () => {
        const order = [];
        sinon.stub(FlaggedReview, 'deleteMany').callsFake(async (filter) => {
            order.push(['deleteFlags', filter]);
        });
        // The real aggregateRating runs; only its query is stubbed.
        sinon.stub(Review, 'find').callsFake((filter) => {
            order.push(['aggregateRating', filter]);
            return { select: async () => [{ stars: 4 }, { stars: 5 }] };
        });
        const review = {
            _id: 'r1',
            albumId: 'a1',
            deleteOne: async () => order.push(['deleteReview']),
        };

        const result = await new DeleteReviewAction({ review, pendingFlags: [] }, async () => QUEUE).execute();

        expect(order).to.deep.equal([
            ['deleteFlags', { reviewId: 'r1' }],
            ['deleteReview'],
            ['aggregateRating', { albumId: 'a1' }],
        ]);
        expect(result).to.deep.equal({
            message: 'Review deleted',
            albumId: 'a1',
            averageRating: 4.5,
            reviewCount: 2,
            queue: QUEUE,
        });
    });

    it('DismissFlagsAction dismisses only the pending flags on that review and keeps the review', async () => {
        const updateMany = sinon.stub(FlaggedReview, 'updateMany').resolves({ modifiedCount: 2 });
        const deleteMany = sinon.stub(FlaggedReview, 'deleteMany');
        const review = { _id: 'r1', albumId: 'a1', deleteOne: sinon.spy() };

        const result = await new DismissFlagsAction({ review, pendingFlags: [] }, async () => QUEUE).execute();

        expect(updateMany.firstCall.args).to.deep.equal([
            { reviewId: 'r1', status: 'pending' },
            { $set: { status: 'dismissed' } },
        ]);
        expect(review.deleteOne.called).to.equal(false);
        expect(deleteMany.called).to.equal(false);
        expect(result).to.deep.equal({ message: 'Flags dismissed', dismissedCount: 2, queue: QUEUE });
    });
});
