const { expect } = require('chai');
const { UserProfileService } = require('../services/UserProfileService');
const OwnershipProxy = require('../services/OwnershipProxy');

class FakeUserProfileService extends UserProfileService {
    constructor() {
        super();
        this.calls = [];
    }

    async getProfile(userId) {
        this.calls.push(['getProfile', userId]);
        return { id: userId };
    }

}

describe('OwnershipProxy', () => {
    it('forwards the profile read for the account owner', async () => {
        const service = new FakeUserProfileService();
        const proxy = new OwnershipProxy(service);

        expect(await proxy.getProfile('user-1', 'user-1')).to.deep.equal({ id: 'user-1' });

        expect(service.calls).to.deep.equal([['getProfile', 'user-1']]);
    });

    it('rejects another account without calling the service', async () => {
        const service = new FakeUserProfileService();
        const proxy = new OwnershipProxy(service);

        try {
            await proxy.getProfile('user-1', 'user-2');
            expect.fail('Expected ownership check to reject the request');
        } catch (error) {
            expect(error.statusCode).to.equal(403);
        }

        expect(service.calls).to.deep.equal([]);
    });
});
