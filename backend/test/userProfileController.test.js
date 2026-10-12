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
            async getProfile(request) {
                expect(request).to.deep.equal({
                    requesterId: 'user-1',
                    targetUserId: 'user-1',
                });
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

        await controller.getProfile({ user: { id: 'user-1' }, params: { userId: 'user-1' } }, res);

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

    it('rejects invalid email before asking the service to save changes', async () => {
        let updateCalled = false;
        const service = {
            async updateProfile() {
                updateCalled = true;
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

        await controller.updateProfile({
            user: { id: 'user-1' },
            params: {},
            body: {
                firstName: 'Jasmine',
                lastName: 'Jiang',
                email: 'invalid-email',
                username: 'jasmine',
            },
        }, res);

        expect(res.statusCode).to.equal(400);
        expect(res.body.message).to.equal('Please provide a valid email address');
        expect(updateCalled).to.equal(false);
    });

    it('sends validated changes to the abstract service for the authenticated account', async () => {
        const updates = {
            firstName: 'Jasmine',
            lastName: 'Jiang',
            email: 'jasmine@example.com',
            username: 'jasmine',
        };
        let receivedRequest;
        const service = {
            async updateProfile(request) {
                receivedRequest = request;
                return {
                    id: 'user-1',
                    ...updates,
                    createdAt: new Date('2026-01-15T10:30:00.000Z'),
                    lastActivity: new Date('2026-10-10T09:45:00.000Z'),
                };
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

        await controller.updateProfile({
            user: { id: 'user-1' },
            params: { userId: 'user-1' },
            body: { ...updates, email: ' Jasmine@Example.com ' },
        }, res);

        expect(receivedRequest).to.deep.equal({
            requesterId: 'user-1',
            targetUserId: 'user-1',
            updates,
        });
        expect(res.statusCode).to.equal(200);
        expect(res.body.email).to.equal('jasmine@example.com');
    });

    it('requires the current password before requesting account deletion', async () => {
        let deleteCalled = false;
        const service = {
            async deleteProfile() {
                deleteCalled = true;
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

        await controller.deleteProfile({
            user: { id: 'user-1' },
            params: {},
            body: {},
        }, res);

        expect(res.statusCode).to.equal(400);
        expect(res.body.message).to.equal('Current password is required');
        expect(deleteCalled).to.equal(false);
    });

    it('passes the target account and password through the deletion service and confirms success', async () => {
        let receivedRequest;
        const service = {
            async deleteProfile(request) {
                receivedRequest = request;
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

        await controller.deleteProfile({
            user: { id: 'user-1' },
            params: { userId: 'user-1' },
            body: { currentPassword: 'correct-password' },
        }, res);

        expect(receivedRequest).to.deep.equal({
            requesterId: 'user-1',
            targetUserId: 'user-1',
            currentPassword: 'correct-password',
        });
        expect(res.statusCode).to.equal(200);
        expect(res.body.message).to.equal('Account deleted successfully');
    });
});
