const chai = require('chai');
const sinon = require('sinon');
const bcrypt = require('bcrypt');

const User = require('../models/User');
const LoginAttempt = require('../models/LoginAttempt');

const { loginUser } = require('../controllers/authController');

const { expect } = chai;

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

describe('Login Rate Limiting', () => {

    afterEach(() => sinon.restore());

    const buildRequest = () => ({
        body: {
            email: 'test@test.com',
            password: 'WrongPassword1',
        },
        headers: {},
        socket: {
            remoteAddress: '127.0.0.1',
        },
    });

    it('allows login before the failed-attempt limit is reached', async () => {

        sinon.stub(LoginAttempt, 'findOne').resolves(null);

        sinon.stub(User, 'findOne').resolves(null);

        sinon.stub(LoginAttempt.prototype, 'save').resolves();

        const req = buildRequest();
        const res = fakeResponse();

        await loginUser(req, res);

        expect(res.statusCode).to.equal(401);
    });

    it('records failed login attempts by IP address', async () => {

        sinon.stub(LoginAttempt, 'findOne').resolves(null);

        sinon.stub(User, 'findOne').resolves(null);

        const saveStub = sinon
            .stub(LoginAttempt.prototype, 'save')
            .resolves();

        const req = buildRequest();
        const res = fakeResponse();

        await loginUser(req, res);

        expect(saveStub.calledOnce).to.equal(true);
    });

    it('locks an IP after five failed login attempts', async () => {

        sinon.stub(LoginAttempt, 'findOne').resolves({
            ip: '127.0.0.1',
            email: 'test@test.com',
            failedAttempts: 4,
            save: sinon.stub().resolves(),
        });

        sinon.stub(User, 'findOne').resolves(null);

        const req = buildRequest();
        const res = fakeResponse();

        await loginUser(req, res);

        expect(res.statusCode).to.equal(401);
    });

    it('rejects login attempts during an active lock period', async () => {

        sinon.stub(LoginAttempt, 'findOne').resolves({
            ip: '127.0.0.1',
            failedAttempts: 5,
            lockedUntil: new Date(
                Date.now() + 15 * 60 * 1000
            ),
        });

        const req = buildRequest();
        const res = fakeResponse();

        await loginUser(req, res);

        expect(res.statusCode).to.equal(429);
        expect(res.body.message)
            .to.equal(
                'Too many failed login attempts. Please try again in 15 minutes.'
            );
    });

    it('removes expired lock records and allows login again', async () => {

        sinon.stub(LoginAttempt, 'findOne').onFirstCall().resolves({
            ip: '127.0.0.1',
            failedAttempts: 5,
            lockedUntil: new Date(
                Date.now() - 1000
            ),
        });

        const deleteStub = sinon
            .stub(LoginAttempt, 'deleteOne')
            .resolves();

        sinon.stub(User, 'findOne').resolves({
            _id: 'user-1',
            id: 'user-1',
            role: 'user',
            email: 'test@test.com',
            password: 'hashed',
        });

        sinon.stub(bcrypt, 'compare')
            .resolves(true);

        sinon.stub(User, 'updateOne')
            .resolves();

        const req = {
            body: {
                email: 'test@test.com',
                password: 'CorrectPassword1',
            },
            headers: {},
            socket: {
                remoteAddress: '127.0.0.1',
            },
        };

        const res = fakeResponse();

        await loginUser(req, res);

        expect(deleteStub.called).to.equal(true);
    });
});