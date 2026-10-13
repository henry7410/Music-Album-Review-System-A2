const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AccountSummary = require('../services/AccountSummary');
const AccountManagementFacade = require('../services/AccountManagementFacade');
const InactivityPolicy = require('../services/InactivityPolicy');
const { createAccountManagementController } = require('../controllers/accountManagementController');

chai.use(chaiHttp);
const { expect } = chai;

const storedUser = {
    _id: 'user-1',
    username: 'jasmine',
    firstName: 'Jasmine',
    lastName: 'Jiang',
    role: 'user',
    email: 'jasmine@example.com',
    password: 'hashed-password',
    createdAt: new Date('2026-01-15T10:30:00.000Z'),
    lastActivity: new Date('2026-10-10T09:45:00.000Z'),
};

const fakeResponse = () => ({
    statusCode: null,
    body: null,
    headers: {},
    set(name, value) {
        this.headers[name] = value;
        return this;
    },
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        // Round-trip like Express does, so toJSON() is applied.
        this.body = JSON.parse(JSON.stringify(body));
        return this;
    },
});

describe('AccountSummary', () => {
    it('serializes only the account list fields, never the password or email', () => {
        const summary = new AccountSummary(storedUser);

        expect(JSON.parse(JSON.stringify(summary))).to.deep.equal({
            id: 'user-1',
            username: 'jasmine',
            firstName: 'Jasmine',
            lastName: 'Jiang',
            role: 'user',
            registeredAt: '2026-01-15T10:30:00.000Z',
            lastActivity: '2026-10-10T09:45:00.000Z',
            inactive: false,
            deletable: false,
        });
    });

    it('is deletable only when inactive and not an administrator', () => {
        expect(new AccountSummary(storedUser, true).deletable).to.equal(true);
        expect(new AccountSummary(storedUser, false).deletable).to.equal(false);
        expect(new AccountSummary({ ...storedUser, role: 'admin' }, true).deletable).to.equal(false);
    });

    it('keeps its state private and read-only', () => {
        const summary = new AccountSummary(storedUser);

        expect(Object.keys(summary)).to.deep.equal([]);
        expect(() => { 'use strict'; summary.username = 'changed'; }).to.throw(TypeError);
        expect(summary.username).to.equal('jasmine');
    });

    it('reports missing optional details as null', () => {
        const summary = new AccountSummary({ _id: 'user-2', role: 'user' });

        expect(summary.username).to.equal(null);
        expect(summary.firstName).to.equal(null);
        expect(summary.lastName).to.equal(null);
        expect(summary.lastActivity).to.equal(null);
    });
});

describe('InactivityPolicy', () => {
    const now = () => new Date('2026-10-13T12:00:00.000Z');
    const policy = new InactivityPolicy({ years: 5, now });

    it('treats activity more than 5 years ago as inactive', () => {
        expect(policy.isInactive(new Date('2021-10-13T11:59:59.000Z'))).to.equal(true);
        expect(policy.isInactive(new Date('2019-01-01T00:00:00.000Z'))).to.equal(true);
    });

    it('treats activity exactly 5 years ago or more recently as active', () => {
        expect(policy.isInactive(new Date('2021-10-13T12:00:00.000Z'))).to.equal(false);
        expect(policy.isInactive(new Date('2024-06-01T00:00:00.000Z'))).to.equal(false);
    });

    it('never treats an account with no activity date as inactive', () => {
        expect(policy.isInactive(null)).to.equal(false);
        expect(policy.isInactive(undefined)).to.equal(false);
    });

    it('keeps its threshold private', () => {
        expect(Object.keys(policy)).to.deep.equal([]);
        expect(policy.years).to.equal(5);
    });
});

describe('AccountManagementFacade', () => {
    it('lists every account newest first, without loading passwords', async () => {
        const query = {
            select: sinon.stub().returnsThis(),
            sort: sinon.stub().returnsThis(),
            lean: sinon.stub().resolves([storedUser]),
        };
        const userModel = { find: sinon.stub().returns(query) };
        const facade = new AccountManagementFacade({ userModel });

        const accounts = await facade.listAccounts();

        expect(userModel.find.calledOnceWithExactly({})).to.equal(true);
        expect(query.select.firstCall.args[0]).not.to.include('password');
        expect(query.sort.firstCall.args[0]).to.deep.equal({ createdAt: -1, _id: 1 });
        expect(accounts).to.have.length(1);
        expect(accounts[0]).to.be.instanceOf(AccountSummary);
        expect(accounts[0].username).to.equal('jasmine');
    });

    it('hides its User model from callers', () => {
        const facade = new AccountManagementFacade({ userModel: {} });

        expect(facade).not.to.have.property('userModel');
        expect(Object.keys(facade)).to.deep.equal([]);
    });

    describe('deleteInactiveAccount', () => {
        const SIX_YEARS_AGO = new Date('2020-01-01T00:00:00.000Z');
        const LAST_MONTH = new Date('2026-09-13T00:00:00.000Z');
        const inactivityPolicy = new InactivityPolicy({ now: () => new Date('2026-10-13T12:00:00.000Z') });

        // Records the order of every delete so the cascade order can be checked.
        const buildFacade = (user) => {
            const calls = [];
            const record = (name) => sinon.stub().callsFake(async (filter) => { calls.push([name, filter]); });
            if (user) {
                user.deleteOne = sinon.stub().callsFake(async () => { calls.push(['user.deleteOne']); });
            }
            const listQuery = {
                select: sinon.stub().returnsThis(),
                sort: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves([]),
            };
            const userModel = {
                findById: sinon.stub().resolves(user),
                find: sinon.stub().returns(listQuery),
            };
            const reviewModel = {
                find: sinon.stub().returns({ select: sinon.stub().resolves([{ _id: 'review-1' }]) }),
                deleteMany: record('Review.deleteMany'),
            };
            const flaggedReviewModel = { deleteMany: record('FlaggedReview.deleteMany') };
            const loginAttemptModel = { deleteMany: record('LoginAttempt.deleteMany') };
            const facade = new AccountManagementFacade({
                userModel, reviewModel, flaggedReviewModel, loginAttemptModel, inactivityPolicy,
            });
            return { facade, calls, userModel };
        };

        const expectRejection = async (promise, statusCode, message) => {
            try {
                await promise;
                expect.fail('Expected the deletion to be rejected');
            } catch (error) {
                expect(error.statusCode).to.equal(statusCode);
                expect(error.message).to.equal(message);
            }
        };

        it('removes reviews, flags, login records and then the user, and returns the refreshed list', async () => {
            const user = { ...storedUser, lastActivity: SIX_YEARS_AGO };
            const { facade, calls, userModel } = buildFacade(user);

            const accounts = await facade.deleteInactiveAccount('user-1');

            expect(calls).to.deep.equal([
                ['FlaggedReview.deleteMany', { reviewId: { $in: ['review-1'] } }],
                ['Review.deleteMany', { userId: 'user-1' }],
                ['FlaggedReview.deleteMany', { flaggedBy: 'user-1' }],
                ['LoginAttempt.deleteMany', { email: 'jasmine@example.com' }],
                ['user.deleteOne'],
            ]);
            expect(userModel.find.calledOnce).to.equal(true);
            expect(accounts).to.deep.equal([]);
        });

        it('refuses to delete an account that has been active within 5 years', async () => {
            const user = { ...storedUser, lastActivity: LAST_MONTH };
            const { facade, calls } = buildFacade(user);

            await expectRejection(
                facade.deleteInactiveAccount('user-1'),
                409,
                'Only accounts inactive for more than 5 years can be deleted'
            );
            expect(calls).to.deep.equal([]);
        });

        it('refuses to delete an administrator account, however inactive', async () => {
            const user = { ...storedUser, role: 'admin', lastActivity: SIX_YEARS_AGO };
            const { facade, calls } = buildFacade(user);

            await expectRejection(facade.deleteInactiveAccount('user-1'), 403, 'Administrator accounts cannot be deleted');
            expect(calls).to.deep.equal([]);
        });

        it('reports a missing account as 404', async () => {
            const { facade } = buildFacade(null);

            await expectRejection(facade.deleteInactiveAccount('user-1'), 404, 'Account not found');
        });
    });
});

describe('Account management controller', () => {
    it('returns the account list and tells the browser not to cache it', async () => {
        const facade = { listAccounts: sinon.stub().resolves([new AccountSummary(storedUser)]) };
        const res = fakeResponse();

        await createAccountManagementController(facade).listAccounts({}, res);

        expect(res.statusCode).to.equal(200);
        expect(res.headers['Cache-Control']).to.equal('no-store');
        expect(res.body).to.have.length(1);
        expect(res.body[0].username).to.equal('jasmine');
        expect(res.body[0]).not.to.have.property('password');
    });

    it('responds with a generic 500 when the accounts cannot be loaded', async () => {
        const facade = { listAccounts: sinon.stub().rejects(new Error('connection lost')) };
        const res = fakeResponse();

        await createAccountManagementController(facade).listAccounts({}, res);

        expect(res.statusCode).to.equal(500);
        expect(res.body.message).to.equal('Unable to retrieve user accounts');
    });

    const VALID_ID = '507f1f77bcf86cd799439011';

    it('rejects an invalid account id without asking the facade to delete', async () => {
        const facade = { deleteInactiveAccount: sinon.stub() };
        const res = fakeResponse();

        await createAccountManagementController(facade).deleteInactiveAccount({ params: { accountId: 'abc' } }, res);

        expect(res.statusCode).to.equal(400);
        expect(facade.deleteInactiveAccount.called).to.equal(false);
    });

    it('confirms the deletion and returns the refreshed list', async () => {
        const facade = { deleteInactiveAccount: sinon.stub().resolves([]) };
        const res = fakeResponse();

        await createAccountManagementController(facade).deleteInactiveAccount({ params: { accountId: VALID_ID } }, res);

        expect(facade.deleteInactiveAccount.calledOnceWithExactly(VALID_ID)).to.equal(true);
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.deep.equal({ message: 'Account deleted', accounts: [] });
    });

    it('passes on the reason a deletion was refused', async () => {
        const refusal = new Error('Only accounts inactive for more than 5 years can be deleted');
        refusal.statusCode = 409;
        const facade = { deleteInactiveAccount: sinon.stub().rejects(refusal) };
        const res = fakeResponse();

        await createAccountManagementController(facade).deleteInactiveAccount({ params: { accountId: VALID_ID } }, res);

        expect(res.statusCode).to.equal(409);
        expect(res.body.message).to.equal(refusal.message);
    });

    it('hides unexpected deletion errors behind a generic 500', async () => {
        const facade = { deleteInactiveAccount: sinon.stub().rejects(new Error('connection lost')) };
        const res = fakeResponse();

        await createAccountManagementController(facade).deleteInactiveAccount({ params: { accountId: VALID_ID } }, res);

        expect(res.statusCode).to.equal(500);
        expect(res.body.message).to.equal('Unable to delete account');
    });
});

describe('/api/admin/accounts routes', () => {
    let app;
    const originalSecret = process.env.JWT_SECRET;

    before(() => {
        process.env.JWT_SECRET = 'test-secret';
        app = require('../server');
    });

    after(() => {
        // Assigning undefined to process.env stores the string "undefined".
        if (originalSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = originalSecret;
        }
    });

    afterEach(() => sinon.restore());

    const tokenFor = (role) => {
        sinon.stub(User, 'findById').returns({
            select: sinon.stub().resolves({ id: `${role}-1`, role }),
        });
        return jwt.sign({ id: `${role}-1`, role }, process.env.JWT_SECRET);
    };

    it('denies access to standard users', async () => {
        const listAccounts = sinon.stub(AccountManagementFacade.prototype, 'listAccounts');

        const res = await chai.request(app)
            .get('/api/admin/accounts')
            .set('Authorization', `Bearer ${tokenFor('user')}`);

        expect(res.status).to.equal(403);
        expect(listAccounts.called).to.equal(false);
    });

    it('denies access without a token', async () => {
        const res = await chai.request(app).get('/api/admin/accounts');

        expect(res.status).to.equal(401);
    });

    it('returns the account list to administrators', async () => {
        sinon.stub(AccountManagementFacade.prototype, 'listAccounts')
            .resolves([new AccountSummary(storedUser)]);

        const res = await chai.request(app)
            .get('/api/admin/accounts')
            .set('Authorization', `Bearer ${tokenFor('admin')}`);

        expect(res.status).to.equal(200);
        expect(res.body[0].username).to.equal('jasmine');
    });

    it('does not let standard users delete accounts', async () => {
        const deleteInactiveAccount = sinon.stub(AccountManagementFacade.prototype, 'deleteInactiveAccount');

        const res = await chai.request(app)
            .delete('/api/admin/accounts/507f1f77bcf86cd799439011')
            .set('Authorization', `Bearer ${tokenFor('user')}`);

        expect(res.status).to.equal(403);
        expect(deleteInactiveAccount.called).to.equal(false);
    });

    it('lets administrators delete accounts', async () => {
        sinon.stub(AccountManagementFacade.prototype, 'deleteInactiveAccount').resolves([]);

        const res = await chai.request(app)
            .delete('/api/admin/accounts/507f1f77bcf86cd799439011')
            .set('Authorization', `Bearer ${tokenFor('admin')}`);

        expect(res.status).to.equal(200);
        expect(res.body.message).to.equal('Account deleted');
    });
});
