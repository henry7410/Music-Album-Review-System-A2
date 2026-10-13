const express = require('express');
const { createAccountManagementController } = require('../controllers/accountManagementController');
const AccountManagementFacade = require('../services/AccountManagementFacade');
const { protect, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();
const accountManagementController = createAccountManagementController(new AccountManagementFacade());

router.get('/admin/accounts', protect, requireRole('admin'), accountManagementController.listAccounts);
router.delete('/admin/accounts/:accountId', protect, requireRole('admin'), accountManagementController.deleteInactiveAccount);

module.exports = router;
