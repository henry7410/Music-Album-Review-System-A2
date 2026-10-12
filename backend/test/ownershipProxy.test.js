const { expect } = require('chai');
const { UserProfileService } = require('../services/UserProfileService');
const OwnershipProxy = require('../services/OwnershipProxy');

class FakeUserProfileService extends UserProfileService {
    constructor() {
        super();
        this.calls = [];
    }

    async getProfile(request) {
        this.calls.push(['getProfile', request]);
        return { id: request.targetUserId };
    }

    async updateProfile(request) {
        this.calls.push(['updateProfile', request]);
        return { id: request.targetUserId, ...request.updates };
    }

    async deleteProfile(request) {
        this.calls.push(['deleteProfile', request]);
    }

}

describe('OwnershipProxy', () => {
    it('forwards the profile read for the account owner', async () => {
        const service = new FakeUserProfileService();
        const proxy = new OwnershipProxy(service);

        const request = { requesterId: 'user-1', targetUserId: 'user-1' };

        expect(await proxy.getProfile(request)).to.deep.equal({ id: 'user-1' });
        const updateRequest = {
            ...request,
            updates: {
                firstName: 'Jasmine',
                lastName: 'Jiang',
                email: 'jasmine@example.com',
                username: 'jasmine',
            },
        };
        expect(await proxy.updateProfile(updateRequest))
            .to.deep.equal({ id: 'user-1', ...updateRequest.updates });
        await proxy.deleteProfile({ ...request, currentPassword: 'correct-password' });

        expect(service.calls).to.deep.equal([
            ['getProfile', request],
            ['updateProfile', updateRequest],
            ['deleteProfile', { ...request, currentPassword: 'correct-password' }],
        ]);
    });

    it('rejects reading, editing, or deleting another account without calling the service', async () => {
        const service = new FakeUserProfileService();
        const proxy = new OwnershipProxy(service);

        const requests = [
            () => proxy.getProfile({ requesterId: 'user-1', targetUserId: 'user-2' }),
            () => proxy.updateProfile({
                requesterId: 'user-1',
                targetUserId: 'user-2',
                updates: { firstName: 'Changed' },
            }),
            () => proxy.deleteProfile({
                requesterId: 'user-1',
                targetUserId: 'user-2',
                currentPassword: 'password',
            }),
        ];

        for (const request of requests) {
            try {
                await request();
                expect.fail('Expected ownership check to reject the request');
            } catch (error) {
                expect(error.statusCode).to.equal(403);
            }
        }

        expect(service.calls).to.deep.equal([]);
    });
});
