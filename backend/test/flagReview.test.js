const chai = require('chai');
const sinon = require('sinon');

const Review = require('../models/Review');
const FlaggedReview = require('../models/FlaggedReview');
const FlagFactory = require('../flags/flagFactory');

const {
    createFlaggedReview,
} = require('../controllers/flaggedReviewController');

const { expect } = chai;

const VALID_ID =
    '507f1f77bcf86cd799439011';

const fakeResponse = () => ({
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

describe('Flagged Review Controller', () => {

    afterEach(() => sinon.restore());

    const user = {
        id: 'user-1',
    };

    it('successfully creates a flagged review', async () => {

        sinon.stub(Review, 'findById').resolves({
            _id: VALID_ID,
            userId: {
                toString: () => 'user-2',
            },
        });

        sinon
            .stub(FlagFactory, 'create')
            .returns({
                toObject: () => ({
                    reviewId: VALID_ID,
                    flaggedBy: 'user-1',
                    reason: 'Spam',
                }),
            });

        sinon
            .stub(FlaggedReview, 'create')
            .resolves({
                _id: 'flag-1',
            });

        const req = {
            body: {
                reviewId: VALID_ID,
                reason: 'Spam',
            },
            user,
        };

        const res = fakeResponse();

        await createFlaggedReview(req, res);

        expect(res.statusCode).to.equal(201);
    });

    it('rejects duplicate flags from the same user', async () => {

        sinon.stub(Review, 'findById').resolves({
            _id: VALID_ID,
            userId: {
                toString: () => 'user-2',
            },
        });

        sinon
            .stub(FlagFactory, 'create')
            .returns({
                toObject: () => ({
                    reviewId: VALID_ID,
                    flaggedBy: 'user-1',
                    reason: 'Spam',
                }),
            });

        const duplicateError = new Error();
        duplicateError.code = 11000;

        sinon
            .stub(FlaggedReview, 'create')
            .rejects(duplicateError);

        const req = {
            body: {
                reviewId: VALID_ID,
                reason: 'Spam',
            },
            user,
        };

        const res = fakeResponse();

        await createFlaggedReview(req, res);

        expect(res.statusCode).to.equal(409);
        expect(res.body.message)
            .to.equal(
                'You have already flagged this review'
            );
    });

    it('rejects a request with a missing reason', async () => {

        const req = {
            body: {
                reviewId: VALID_ID,
            },
            user,
        };

        const res = fakeResponse();

        await createFlaggedReview(req, res);

        expect(res.statusCode).to.equal(400);
    });

    it('rejects a request with a missing review id', async () => {

        const req = {
            body: {
                reason: 'Spam',
            },
            user,
        };

        const res = fakeResponse();

        await createFlaggedReview(req, res);

        expect(res.statusCode).to.equal(400);
    });

    it('rejects an invalid flag reason', async () => {

        const req = {
            body: {
                reviewId: VALID_ID,
                reason: 'Boring',
            },
            user,
        };

        const res = fakeResponse();

        await createFlaggedReview(req, res);

        expect(res.statusCode).to.equal(400);
        expect(res.body.message)
            .to.equal('Invalid flag reason');
    });

    it('rejects a malformed review id', async () => {

        const req = {
            body: {
                reviewId: '123',
                reason: 'Spam',
            },
            user,
        };

        const res = fakeResponse();

        await createFlaggedReview(req, res);

        expect(res.statusCode).to.equal(400);
        expect(res.body.message)
            .to.equal('Invalid review id');
    });

    it('rejects a review that does not exist', async () => {

        sinon
            .stub(Review, 'findById')
            .resolves(null);

        const req = {
            body: {
                reviewId: VALID_ID,
                reason: 'Spam',
            },
            user,
        };

        const res = fakeResponse();

        await createFlaggedReview(req, res);

        expect(res.statusCode).to.equal(404);
        expect(res.body.message)
            .to.equal('Review not found');
    });

    it('prevents users from flagging their own reviews', async () => {

        sinon.stub(Review, 'findById').resolves({
            _id: VALID_ID,
            userId: {
                toString: () => 'user-1',
            },
        });

        const req = {
            body: {
                reviewId: VALID_ID,
                reason: 'Spam',
            },
            user,
        };

        const res = fakeResponse();

        await createFlaggedReview(req, res);

        expect(res.statusCode).to.equal(403);
        expect(res.body.message)
            .to.equal(
                'You cannot flag your own review'
            );
    });
});