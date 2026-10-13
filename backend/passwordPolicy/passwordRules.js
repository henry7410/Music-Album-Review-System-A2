// if someone inheritance PasswordRule but does not implement validate() throw error
class PasswordRule {
    // Returns an error message string when the password breaks the rule, or null when it passes.
    validate(password, context) {
        throw new Error('validate() must be implemented');
    }
}

class MinimumLengthRule extends PasswordRule {
    constructor(minLength = 8) {
        super();
        this.minLength = minLength;
    }

    validate(password) {
        if (password.length < this.minLength) {
            return `Password must be at least ${this.minLength} characters`;
        }
        return null;
    }
}

class CharacterClassRule extends PasswordRule {
    validate(password) {
        const missing = [];
        if (!/[A-Za-z]/.test(password)) missing.push('a letter');
        if (!/\d/.test(password)) missing.push('a digit');
        if (!/[!@#$%?.]/.test(password)) missing.push('one of ! @ # $ % ? .');
        if (missing.length === 0) return null;
        return `Password must contain ${missing.join(', ')}`;
    }
}

// Identifiers shorter than minIdentifierLength are skipped: a 2-letter username
// would otherwise reject far too many reasonable passwords.
class IdentifierContainmentRule extends PasswordRule {
    constructor(minIdentifierLength = 5) {
        super();
        this.minIdentifierLength = minIdentifierLength;
    }

    validate(password, context = {}) {
        const lowerPassword = password.toLowerCase();
        const emailLocalPart = (context.email || '').split('@')[0];
        const identifiers = [
            { label: 'username', value: context.username },
            { label: 'email address', value: emailLocalPart },
        ];

        const contained = identifiers
            .filter(({ value }) => value && value.trim().length >= this.minIdentifierLength)
            .filter(({ value }) => lowerPassword.includes(value.trim().toLowerCase()))
            .map(({ label }) => label);

        if (contained.length === 0) return null;
        return `Password must not contain your ${contained.join(' or ')}`;
    }
}

class PasswordPolicy {
    constructor(rules) {
        this.rules = rules;
    }

    // Runs every rule rather than stopping at the first failure, so the user
    // can fix everything in one go.
    check(password, context) {
        return this.rules
            .map((rule) => rule.validate(password, context))
            .filter((message) => message !== null);
    }
}

const defaultPasswordPolicy = new PasswordPolicy([
    new MinimumLengthRule(8),
    new CharacterClassRule(),
    new IdentifierContainmentRule(5),
]);

module.exports = {
    PasswordRule,
    MinimumLengthRule,
    CharacterClassRule,
    IdentifierContainmentRule,
    PasswordPolicy,
    defaultPasswordPolicy,
};
