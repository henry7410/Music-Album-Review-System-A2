const User = require('../models/User');
const Review = require('../models/Review');
const FlaggedReview = require('../models/FlaggedReview');
const LoginAttempt = require('../models/LoginAttempt');
const AccountSummary = require('./AccountSummary');
const InactivityPolicy = require('./InactivityPolicy');

// Only the fields the Account Management page shows. The password is never
// loaded, rather than loaded and stripped later.
const ACCOUNT_LIST_FIELDS = 'username firstName lastName role createdAt lastActivity';

const accountError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

// Facade: the single entry point the admin account-management routes use.
// The controller makes one call ("list the accounts", "delete this inactive
// account") and never deals with the subsystems behind it: the User, Review,
// FlaggedReview and LoginAttempt models, the inactivity rule, or how a user
// document becomes a list row. Those stay behind this class, in private fields.
class AccountManagementFacade {
    #userModel;
    #reviewModel;
    #flaggedReviewModel;
    #loginAttemptModel;
    #inactivityPolicy;

    constructor({
        userModel = User,
        reviewModel = Review,
        flaggedReviewModel = FlaggedReview,
        loginAttemptModel = LoginAttempt,
        inactivityPolicy = new InactivityPolicy(),
    } = {}) {
        this.#userModel = userModel;
        this.#reviewModel = reviewModel;
        this.#flaggedReviewModel = flaggedReviewModel;
        this.#loginAttemptModel = loginAttemptModel;
        this.#inactivityPolicy = inactivityPolicy;
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

        return users.map((user) => this.#summarize(user));
    }

    // Permanently deletes an inactive standard account and its personal data,
    // then returns the refreshed list so the page can drop the row at once.
    // The rules are checked here, on the server, whatever the page shows.
    async deleteInactiveAccount(accountId) {
        const user = await this.#userModel.findById(accountId);
        if (!user) {
            throw accountError(404, 'Account not found');
        }

        const account = this.#summarize(user);
        if (account.isAdmin) {
            throw accountError(403, 'Administrator accounts cannot be deleted');
        }
        if (!account.inactive) {
            throw accountError(
                409,
                `Only accounts inactive for more than ${this.#inactivityPolicy.years} years can be deleted`
            );
        }

        await this.#removePersonalData(user);
        return this.listAccounts();
    }

    #summarize(user) {
        return new AccountSummary(user, this.#inactivityPolicy.isInactive(user.lastActivity));
    }

    // Removes everything in the database linked to the account:
    //   - flags other users raised on this user's reviews
    //   - this user's reviews (album ratings are recomputed on read, so they
    //     drop out of every average automatically)
    //   - flags this user raised on other people's reviews
    //   - failed-login records holding this user's email
    //   - the user record itself
    // Same order as the profile self-delete: everything that points at the
    // account goes first and the user record last, so an interruption never
    // leaves reviews or flags owned by an account that no longer exists.
    async #removePersonalData(user) {
        const reviews = await this.#reviewModel.find({ userId: user._id }).select('_id');
        const reviewIds = reviews.map((review) => review._id);
        if (reviewIds.length > 0) {
            await this.#flaggedReviewModel.deleteMany({ reviewId: { $in: reviewIds } });
        }
        // By owner rather than by the ids above, so a review posted between
        // the two queries is still removed.
        await this.#reviewModel.deleteMany({ userId: user._id });
        await this.#flaggedReviewModel.deleteMany({ flaggedBy: user._id });
        // Failed-login records store the email address, which is personal data.
        await this.#loginAttemptModel.deleteMany({ email: user.email });
        await user.deleteOne();
    }
}

module.exports = AccountManagementFacade;
