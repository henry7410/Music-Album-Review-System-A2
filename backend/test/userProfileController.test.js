const { expect } = require('chai');
const { createUserProfileController } = require('../controllers/userProfileController');

describe('User profile controller', () => {
    it('returns account details required by the profile page without exposing password', async () => {
        const account = {
            id: 'user-1',
            firstName: 'Jasmine',
            lastName: 'Jiang',
            email: 'jasmine@example.com',
            username: 'jasmine',
            createdAt: new Date('2026-01-15T10:30:00.000Z'),
            lastActivity: new Date('2026-10-10T09:45:00.000Z'),
            password: 'hashed-password',
        };
        const service = {
            async getProfile(requesterId, targetUserId) {
                expect(requesterId).to.equal('user-1');
                expect(targetUserId).to.equal('user-1');
                return account;
            },
        };
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
        const controller = createUserProfileController(service);

        await controller.getProfile({ user: { id: 'user-1' }, params: {} }, res);

        expect(res.statusCode).to.equal(200);
        expect(res.body).to.deep.equal({
            id: 'user-1',
            firstName: 'Jasmine',
            lastName: 'Jiang',
            email: 'jasmine@example.com',
            username: 'jasmine',
            createdAt: account.createdAt,
            lastActivity: account.lastActivity,
        });
        expect(res.body).not.to.have.property('password');
    });
});
