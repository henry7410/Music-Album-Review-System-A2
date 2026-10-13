const { expect } = require('chai');
const sinon = require('sinon');
const User = require('../models/User');
const Review = require('../models/Review');
const FlaggedReview = require('../models/FlaggedReview');
const bcrypt = require('bcrypt');
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

    it('does not remove account data when the current password is incorrect', async () => {
        const user = { password: 'stored-hash', deleteOne: sinon.stub().resolves() };
        sinon.stub(User, 'findById').resolves(user);
        sinon.stub(bcrypt, 'compare').resolves(false);
        const reviewFind = sinon.stub(Review, 'find');
        const service = new MongoUserProfileService();

        try {
            await service.deleteProfile({
                targetUserId: 'user-1',
                currentPassword: 'wrong-password',
            });
            expect.fail('Expected incorrect password to reject deletion');
        } catch (error) {
            expect(error.statusCode).to.equal(401);
            expect(error.message).to.equal('Current password is incorrect');
        }

        expect(reviewFind.called).to.equal(false);
        expect(user.deleteOne.called).to.equal(false);
    });

    it('refuses to delete an administrator account through the profile page', async () => {
        const user = { role: 'admin', password: 'stored-hash', deleteOne: sinon.stub().resolves() };
        sinon.stub(User, 'findById').resolves(user);
        const passwordCheck = sinon.stub(bcrypt, 'compare').resolves(true);
        const service = new MongoUserProfileService();

        try {
            await service.deleteProfile({
                targetUserId: 'admin-1',
                currentPassword: 'correct-password',
            });
            expect.fail('Expected an administrator account to be protected from deletion');
        } catch (error) {
            expect(error.statusCode).to.equal(403);
            expect(error.message).to.equal('Administrator accounts cannot be deleted through the profile page');
        }

        expect(passwordCheck.called).to.equal(false);
        expect(user.deleteOne.called).to.equal(false);
    });

    it('removes owned reviews, related flags, and the user after password verification', async () => {
        const reviewIds = [{ _id: 'review-1' }];
        const user = { password: 'stored-hash', deleteOne: sinon.stub().resolves() };
        sinon.stub(User, 'findById').resolves(user);
        sinon.stub(bcrypt, 'compare').resolves(true);
        sinon.stub(Review, 'find').returns({
            select: sinon.stub().resolves(reviewIds),
        });
        const reviewDeleteMany = sinon.stub(Review, 'deleteMany').resolves();
        const flagDeleteMany = sinon.stub(FlaggedReview, 'deleteMany').resolves();
        const service = new MongoUserProfileService();

        await service.deleteProfile({
            targetUserId: 'user-1',
            currentPassword: 'correct-password',
        });

        expect(flagDeleteMany.calledTwice).to.equal(true);
        expect(flagDeleteMany.firstCall.args[0]).to.deep.equal({
            reviewId: { $in: ['review-1'] },
        });
        expect(flagDeleteMany.secondCall.args[0]).to.deep.equal({ flaggedBy: 'user-1' });
        expect(reviewDeleteMany.calledOnceWithExactly({ _id: { $in: ['review-1'] } })).to.equal(true);
        expect(user.deleteOne.calledOnce).to.equal(true);
    });
});
