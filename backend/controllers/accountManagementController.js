const mongoose = require('mongoose');

const createAccountManagementController = (accountManagement) => {
    const listAccounts = async (req, res) => {
        try {
            const accounts = await accountManagement.listAccounts();
            // The list must be current every time the page is opened, so the
            // browser must not reuse an earlier response.
            res.set('Cache-Control', 'no-store');
            res.status(200).json(accounts);
        } catch (error) {
            res.status(500).json({ message: 'Unable to retrieve user accounts' });
        }
    };

    const deleteInactiveAccount = async (req, res) => {
        const { accountId } = req.params;
        // isObjectIdOrHexString, not ObjectId.isValid: isValid accepts any
        // 12-character string, which would then fail later as a 500.
        if (!mongoose.isObjectIdOrHexString(accountId)) {
            return res.status(400).json({ message: 'Invalid account id' });
        }

        try {
            const accounts = await accountManagement.deleteInactiveAccount(accountId);
            res.set('Cache-Control', 'no-store');
            res.status(200).json({ message: 'Account deleted', accounts });
        } catch (error) {
            res.status(error.statusCode || 500).json({
                message: error.statusCode ? error.message : 'Unable to delete account',
            });
        }
    };

    return { listAccounts, deleteInactiveAccount };
};

module.exports = { createAccountManagementController };
