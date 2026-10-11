const User = require('../models/User');

class UserProfileService {
    async getProfile() {
        throw new Error('getProfile must be implemented');
    }
}

class MongoUserProfileService extends UserProfileService {
    async getProfile(userId) {
        const user = await User.findById(userId).select('-password');
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        return user;
    }
}

module.exports = { UserProfileService, MongoUserProfileService };
