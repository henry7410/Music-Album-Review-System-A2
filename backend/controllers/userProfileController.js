const serializeProfile = (user) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    createdAt: user.createdAt,
    lastActivity: user.lastActivity,
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const requiredUpdateFields = ['firstName', 'lastName', 'email', 'username'];

const validateProfileUpdates = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { error: 'Profile details must be provided as an object' };
    }

    const updates = {};
    for (const field of requiredUpdateFields) {
        if (typeof body[field] !== 'string') {
            return { error: `${field} must be provided as text` };
        }
        updates[field] = body[field].trim();
    }

    if (!updates.firstName) return { error: 'First name is required' };
    if (!updates.lastName) return { error: 'Last name is required' };
    if (!EMAIL_REGEX.test(updates.email)) {
        return { error: 'Please provide a valid email address' };
    }

    updates.email = updates.email.toLowerCase();
    return { updates };
};

const createUserProfileController = (userProfileService) => {
    const getProfile = async (req, res) => {
        const requesterId = req.user.id;
        const targetUserId = req.params.userId || requesterId;
        try {
            const user = await userProfileService.getProfile({ requesterId, targetUserId });
            res.status(200).json(serializeProfile(user));
        } catch (error) {
            res.status(error.statusCode || 500).json({
                message: error.statusCode ? error.message : 'Unable to retrieve account information',
            });
        }
    };

    const updateProfile = async (req, res) => {
        const { updates, error: validationError } = validateProfileUpdates(req.body);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const requesterId = req.user.id;
        const targetUserId = req.params.userId || requesterId;
        try {
            const user = await userProfileService.updateProfile({
                requesterId,
                targetUserId,
                updates,
            });
            res.status(200).json(serializeProfile(user));
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            if (error.code === 11000) {
                const duplicateField = Object.keys(error.keyPattern || error.keyValue || {})[0];
                const message = duplicateField === 'username'
                    ? 'That username is already in use'
                    : 'That email address is already registered';
                return res.status(409).json({ message });
            }
            if (error.name === 'ValidationError') {
                return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: 'Unable to update account information' });
        }
    };

    return { getProfile, updateProfile };
};

module.exports = { createUserProfileController };
