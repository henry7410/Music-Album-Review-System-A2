// One row of the admin Account Management list.
//
// Encapsulation: the state lives in private (#) fields that nothing outside
// this class can read or change. Callers get read-only getters, and toJSON()
// decides exactly what is sent to the browser. The password hash and email
// are never copied in, so they cannot leak into the list response.
class AccountSummary {
    #id;
    #username;
    #firstName;
    #lastName;
    #role;
    #registeredAt;
    #lastActivity;
    #inactive;

    // `inactive` comes from the InactivityPolicy, so the 5-year rule lives in
    // one place rather than being recomputed here or in the browser.
    constructor(user, inactive = false) {
        this.#id = String(user._id);
        this.#username = user.username ?? null;
        this.#firstName = user.firstName ?? null;
        this.#lastName = user.lastName ?? null;
        this.#role = user.role;
        // createdAt doubles as the registration date (see models/User.js).
        this.#registeredAt = user.createdAt ?? null;
        this.#lastActivity = user.lastActivity ?? null;
        this.#inactive = Boolean(inactive);
    }

    get id() { return this.#id; }
    get username() { return this.#username; }
    get firstName() { return this.#firstName; }
    get lastName() { return this.#lastName; }
    get role() { return this.#role; }
    get registeredAt() { return this.#registeredAt; }
    get lastActivity() { return this.#lastActivity; }
    get inactive() { return this.#inactive; }
    get isAdmin() { return this.#role === 'admin'; }

    // Only inactive standard accounts may be deleted. Administrator accounts
    // are never deletable, so the system cannot be left without an admin.
    get deletable() { return this.#inactive && !this.isAdmin; }

    // Called by res.json() via JSON.stringify.
    toJSON() {
        return {
            id: this.#id,
            username: this.#username,
            firstName: this.#firstName,
            lastName: this.#lastName,
            role: this.#role,
            registeredAt: this.#registeredAt,
            lastActivity: this.#lastActivity,
            inactive: this.#inactive,
            deletable: this.deletable,
        };
    }
}

module.exports = AccountSummary;
