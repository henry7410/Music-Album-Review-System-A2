const User = require('../models/User');
const Review = require('../models/Review');
const FlaggedReview = require('../models/FlaggedReview');
const bcrypt = require('bcrypt');

class UserProfileService {
    async getProfile(request) {
        throw new Error('getProfile must be implemented');
    }

    async updateProfile(request) {
        throw new Error('updateProfile must be implemented');
    }

    async deleteProfile(request) {
        throw new Error('deleteProfile must be implemented');
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

    async deleteProfile(request) {
        const { targetUserId, currentPassword } = request;
        const user = await User.findById(targetUserId);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        if (user.role === 'admin') {
            const error = new Error('Administrator accounts cannot be deleted through the profile page');
            error.statusCode = 403;
            throw error;
        }

        const passwordMatches = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatches) {
            const error = new Error('Current password is incorrect');
            error.statusCode = 401;
            throw error;
        }

        const reviews = await Review.find({ userId: targetUserId }).select('_id');
        const reviewIds = reviews.map((review) => review._id);
        if (reviewIds.length > 0) {
            await FlaggedReview.deleteMany({ reviewId: { $in: reviewIds } });
            await Review.deleteMany({ _id: { $in: reviewIds } });
        }
        await FlaggedReview.deleteMany({ flaggedBy: targetUserId });
        await user.deleteOne();
    }
}

module.exports = { UserProfileService, MongoUserProfileService };
