const User = require('../models/User');
const AccountSummary = require('./AccountSummary');

// Only the fields the Account Management page shows. The password is never
// loaded, rather than loaded and stripped later.
const ACCOUNT_LIST_FIELDS = 'username firstName lastName role createdAt lastActivity';

// Facade: the single entry point the admin account-management routes use.
// The controller asks for "the account list" and never deals with the User
// model, its query options, or how a user document becomes a list row.
// Those subsystem details stay behind this class, held in private fields.
class AccountManagementFacade {
    #userModel;

    constructor({ userModel = User } = {}) {
        this.#userModel = userModel;
    }

    // Reads straight from the database on every call, with no caching, so
    // the list always reflects newly registered, edited, and deleted accounts.
    // Newest registrations first; _id breaks ties so the order is stable.
    async listAccounts() {
        const users = await this.#userModel
            .find({})
            .select(ACCOUNT_LIST_FIELDS)
            .sort({ createdAt: -1, _id: 1 })
            .lean();

        return users.map((user) => new AccountSummary(user));
    }
}

module.exports = AccountManagementFacade;
