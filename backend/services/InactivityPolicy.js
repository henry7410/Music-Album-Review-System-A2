// Decides whether an account counts as inactive: no activity for longer
// than `years` years, measured from its last activity date.
//
// The threshold and the clock are private, so the rule cannot be changed by
// callers after construction. Injecting `now` keeps the rule testable.
class InactivityPolicy {
    #years;
    #now;

    constructor({ years = 5, now = () => new Date() } = {}) {
        this.#years = years;
        this.#now = now;
    }

    get years() { return this.#years; }

    // Activity strictly before this moment is "longer than `years` years" ago.
    cutoff() {
        const cutoff = new Date(this.#now());
        cutoff.setFullYear(cutoff.getFullYear() - this.#years);
        return cutoff;
    }

    // An account with no recorded activity date is never treated as inactive:
    // without a date there is no evidence it has been idle, and deletion is
    // permanent.
    isInactive(lastActivity) {
        if (!lastActivity) return false;
        return new Date(lastActivity) < this.cutoff();
    }
}

module.exports = InactivityPolicy;
