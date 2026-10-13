const express = require('express');
const { createAccountManagementController } = require('../controllers/accountManagementController');
const AccountManagementFacade = require('../services/AccountManagementFacade');
const { protect, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();
const accountManagementController = createAccountManagementController(new AccountManagementFacade());

router.get('/admin/accounts', protect, requireRole('admin'), accountManagementController.listAccounts);

module.exports = router;
