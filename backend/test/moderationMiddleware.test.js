const { expect } = require('chai');
const sinon = require('sinon');
const FlaggedReview = require('../models/FlaggedReview');
const Review = require('../models/Review');
const { loadFlaggedReview } = require('../middleware/moderationMiddleware');

const REVIEW_ID = '6a98f5d513eb4a1449b1e1b6';

const fakeRes = () => ({
    statusCode: null,
    body: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    },
});

describe('loadFlaggedReview middleware', () => {
    afterEach(() => sinon.restore());

    it('responds 400 for a reviewId that is not an ObjectId, without querying', async () => {
        const find = sinon.stub(FlaggedReview, 'find');
        const next = sinon.spy();

        for (const reviewId of ['not-an-id', 'abcdefghijkl', '123']) {
            const res = fakeRes();
            await loadFlaggedReview({ params: { reviewId } }, res, next);
            expect(res.statusCode, reviewId).to.equal(400);
        }
        expect(find.called).to.equal(false);
        expect(next.called).to.equal(false);
    });

    it('responds 404 when the review has no pending flags', async () => {
        const find = sinon.stub(FlaggedReview, 'find').resolves([]);
        const res = fakeRes();
        const next = sinon.spy();

        await loadFlaggedReview({ params: { reviewId: REVIEW_ID } }, res, next);

        expect(find.firstCall.args[0]).to.deep.equal({ reviewId: REVIEW_ID, status: 'pending' });
        expect(res.statusCode).to.equal(404);
        expect(next.called).to.equal(false);
    });

    it('responds 404 when pending flags exist but the review itself is gone', async () => {
        sinon.stub(FlaggedReview, 'find').resolves([{ _id: 'f1' }]);
        sinon.stub(Review, 'findById').resolves(null);
        const res = fakeRes();
        const next = sinon.spy();

        await loadFlaggedReview({ params: { reviewId: REVIEW_ID } }, res, next);

        expect(res.statusCode).to.equal(404);
        expect(next.called).to.equal(false);
    });

    it('attaches the review and its pending flags, then calls next', async () => {
        const pendingFlags = [{ _id: 'f1' }, { _id: 'f2' }];
        const review = { _id: REVIEW_ID };
        sinon.stub(FlaggedReview, 'find').resolves(pendingFlags);
        sinon.stub(Review, 'findById').resolves(review);
        const req = { params: { reviewId: REVIEW_ID } };
        const res = fakeRes();
        const next = sinon.spy();

        await loadFlaggedReview(req, res, next);

        expect(next.calledOnce).to.equal(true);
        expect(res.statusCode).to.equal(null);
        expect(req.flaggedReview).to.deep.equal({ review, pendingFlags });
    });
});
