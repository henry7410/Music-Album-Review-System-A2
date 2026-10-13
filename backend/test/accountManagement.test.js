const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AccountSummary = require('../services/AccountSummary');
const AccountManagementFacade = require('../services/AccountManagementFacade');
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
        });
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
});

describe('GET /api/admin/accounts', () => {
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
});
