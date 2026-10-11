const serializeProfile = (user) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    createdAt: user.createdAt,
    lastActivity: user.lastActivity,
});

const createUserProfileController = (userProfileService) => {
    const getProfile = async (req, res) => {
        const requesterId = req.user.id;
        const targetUserId = req.params.userId || requesterId;
        try {
            const user = await userProfileService.getProfile(requesterId, targetUserId);
            res.status(200).json(serializeProfile(user));
        } catch (error) {
            res.status(error.statusCode || 500).json({
                message: error.statusCode ? error.message : 'Unable to retrieve account information',
            });
        }
    };

    return { getProfile };
};

module.exports = { createUserProfileController };
