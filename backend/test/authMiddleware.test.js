const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

describe('protect middleware', () => {
    afterEach(() => sinon.restore());

    it('rejects a token belonging to an account that has been deleted', async () => {
        sinon.stub(jwt, 'verify').returns({ id: 'deleted-user' });
        sinon.stub(User, 'findById').returns({
            select: sinon.stub().resolves(null),
        });
        const res = {
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
        };
        const next = sinon.spy();

        await protect({ headers: { authorization: 'Bearer valid-token' } }, res, next);

        expect(res.statusCode).to.equal(401);
        expect(res.body.message).to.equal('Not authorized, account no longer exists');
        expect(next.called).to.equal(false);
    });
});
