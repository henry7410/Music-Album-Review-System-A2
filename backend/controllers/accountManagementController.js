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

    return { listAccounts };
};

module.exports = { createAccountManagementController };
