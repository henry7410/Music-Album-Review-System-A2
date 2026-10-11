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

    async updateProfile(request) {
        const { targetUserId, updates } = request;
        const user = await User.findById(targetUserId);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        const duplicateEmail = await User.findOne({
            email: updates.email,
            _id: { $ne: targetUserId },
        });
        if (duplicateEmail) {
            const error = new Error('That email address is already registered');
            error.statusCode = 409;
            throw error;
        }

        if (updates.username) {
            const duplicateUsername = await User.findOne({
                username: updates.username,
                _id: { $ne: targetUserId },
            });
            if (duplicateUsername) {
                const error = new Error('That username is already in use');
                error.statusCode = 409;
                throw error;
            }
        }

        user.firstName = updates.firstName;
        user.lastName = updates.lastName;
        user.email = updates.email;
        user.username = updates.username || undefined;
        user.name = `${updates.firstName} ${updates.lastName}`.trim();

        await user.save();
        return user;
    }
}

module.exports = { UserProfileService, MongoUserProfileService };
