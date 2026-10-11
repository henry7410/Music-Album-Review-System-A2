const { expect } = require('chai');
const sinon = require('sinon');
const User = require('../models/User');
const { MongoUserProfileService } = require('../services/UserProfileService');

describe('MongoUserProfileService', () => {
    afterEach(() => sinon.restore());

    it('does not save when the email is already registered to another account', async () => {
        const user = {
            save: sinon.stub().resolves(),
        };
        sinon.stub(User, 'findById').resolves(user);
        sinon.stub(User, 'findOne').resolves({ id: 'another-user' });
        const service = new MongoUserProfileService();

        try {
            await service.updateProfile({
                requesterId: 'user-1',
                targetUserId: 'user-1',
                updates: {
                    firstName: 'Jasmine',
                    lastName: 'Jiang',
                    email: 'taken@example.com',
                    username: 'jasmine',
                },
            });
            expect.fail('Expected duplicate email to reject the update');
        } catch (error) {
            expect(error.statusCode).to.equal(409);
            expect(error.message).to.equal('That email address is already registered');
        }

        expect(user.save.called).to.equal(false);
    });

    it('updates account fields and keeps the legacy display name in sync', async () => {
        const user = {
            save: sinon.stub().resolves(),
        };
        sinon.stub(User, 'findById').resolves(user);
        sinon.stub(User, 'findOne').resolves(null);
        const service = new MongoUserProfileService();

        await service.updateProfile({
            requesterId: 'user-1',
            targetUserId: 'user-1',
            updates: {
                firstName: 'Jasmine',
                lastName: 'Jiang',
                email: 'jasmine@example.com',
                username: 'jasmine',
            },
        });

        expect(user.firstName).to.equal('Jasmine');
        expect(user.lastName).to.equal('Jiang');
        expect(user.email).to.equal('jasmine@example.com');
        expect(user.username).to.equal('jasmine');
        expect(user.name).to.equal('Jasmine Jiang');
        expect(user.save.calledOnce).to.equal(true);
    });
});
