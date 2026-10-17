const { expect } = require('chai');
const sinon = require('sinon');
const User = require('../models/User');
const { registerUser } = require('../controllers/authController');

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

const registration = (overrides = {}) => ({
    body: {
        username: 'alextester',
        firstName: 'Alex',
        lastName: 'Tester',
        email: 'alex@example.com',
        password: 'Str0ng!pass',
        ...overrides,
    },
});

// What the unique index raises when an insert collides on the given field.
const duplicateKeyError = (keyPattern) => Object.assign(new Error('E11000 duplicate key error'), {
    code: 11000,
    keyPattern,
});

describe('registerUser', () => {
    afterEach(() => sinon.restore());

    it('derives name from firstName and lastName', async () => {
        sinon.stub(User, 'findOne').resolves(null);
        const create = sinon.stub(User, 'create').callsFake(async (fields) => ({ id: 'u1', role: 'user', ...fields }));
        const res = fakeRes();

        await registerUser(registration(), res);

        expect(res.statusCode).to.equal(201);
        // name is what serializeReview returns as userName, so it must keep holding the display name.
        expect(create.firstCall.args[0].name).to.equal('Alex Tester');
        expect(create.firstCall.args[0].firstName).to.equal('Alex');
        expect(create.firstCall.args[0].lastName).to.equal('Tester');
        expect(res.body.name).to.equal('Alex Tester');
    });

    it('responds 409 naming the username when the username index collides', async () => {
        sinon.stub(User, 'findOne').resolves(null);
        sinon.stub(User, 'create').rejects(duplicateKeyError({ username: 1 }));
        const res = fakeRes();

        await registerUser(registration(), res);

        expect(res.statusCode).to.equal(409);
        expect(res.body.field).to.equal('username');
        expect(res.body.message).to.include('alextester');
        expect(res.body.message).not.to.include('alex@example.com');
    });

    it('responds 409 for the email, not the username, when the email index collides', async () => {
        sinon.stub(User, 'findOne').resolves(null);
        sinon.stub(User, 'create').rejects(duplicateKeyError({ email: 1 }));
        const res = fakeRes();

        await registerUser(registration(), res);

        expect(res.statusCode).to.equal(409);
        expect(res.body.field).to.equal('email');
        expect(res.body.message).to.equal('User already exists');
        expect(res.body.message).not.to.include('alextester');
    });
});
