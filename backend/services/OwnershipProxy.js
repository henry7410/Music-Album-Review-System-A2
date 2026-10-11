const { UserProfileService } = require('./UserProfileService');

class OwnershipProxy extends UserProfileService {
    constructor(userProfileService) {
        super();
        if (!(userProfileService instanceof UserProfileService)) {
            throw new TypeError('OwnershipProxy requires a UserProfileService');
        }
        this.userProfileService = userProfileService;
    }

    assertOwner(requesterId, targetUserId) {
        if (!requesterId || !targetUserId || String(requesterId) !== String(targetUserId)) {
            const error = new Error('Forbidden');
            error.statusCode = 403;
            throw error;
        }
    }

    async getProfile(requesterId, targetUserId) {
        this.assertOwner(requesterId, targetUserId);
        return this.userProfileService.getProfile(targetUserId);
    }

}

module.exports = OwnershipProxy;
