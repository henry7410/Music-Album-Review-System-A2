const User = require('../models/User');

class UserProfileService {
    async getProfile(request) {
        throw new Error('getProfile must be implemented');
    }

    async updateProfile(request) {
        throw new Error('updateProfile must be implemented');
    }
}

class MongoUserProfileService extends UserProfileService {
    async getProfile(request) {
        const { targetUserId } = request;
        const user = await User.findById(targetUserId).select('-password');
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        return user;
    }
}

module.exports = { UserProfileService, MongoUserProfileService };
