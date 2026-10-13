const { expect } = require('chai');
const {
    PasswordRule,
    MinimumLengthRule,
    CharacterClassRule,
    IdentifierContainmentRule,
    PasswordPolicy,
    defaultPasswordPolicy,
} = require('../passwordPolicy/passwordRules');

describe('Password rules', () => {
    it('the base class refuses to validate without an override', () => {
        expect(() => new PasswordRule().validate('anything', {})).to.throw('validate() must be implemented');
    });

    it('MinimumLengthRule rejects passwords shorter than 8 characters', () => {
        const rule = new MinimumLengthRule(8);
        expect(rule.validate('a1!bcde')).to.be.a('string');
        expect(rule.validate('a1!bcdef')).to.equal(null);
    });

    it('CharacterClassRule names every missing character class', () => {
        const rule = new CharacterClassRule();
        const message = rule.validate('abcdefgh');
        expect(message).to.include('a digit');
        expect(message).to.include('one of ! @ # $ % ? .');
        expect(message).to.not.include('a letter');
        expect(rule.validate('abcdef1.')).to.equal(null);
    });

    it('IdentifierContainmentRule matches username and email local part case-insensitively', () => {
        const rule = new IdentifierContainmentRule(5);
        const context = { username: 'Melody', email: 'harmony@example.com' };
        expect(rule.validate('xxMELODY1!', context)).to.include('username');
        expect(rule.validate('xxHarmony1!', context)).to.include('email address');
        expect(rule.validate('Tune4me!!', context)).to.equal(null);
    });

    it('IdentifierContainmentRule ignores identifiers shorter than 5 characters', () => {
        const rule = new IdentifierContainmentRule(5);
        const context = { username: 'abcd', email: 'efgh@example.com' };
        expect(rule.validate('abcdefgh1!', context)).to.equal(null);
    });

    it('IdentifierContainmentRule does not compare the email domain', () => {
        const rule = new IdentifierContainmentRule(5);
        expect(rule.validate('example1!x', { email: 'someone@example.com' })).to.equal(null);
    });

    it('PasswordPolicy calls every rule and collects all failures', () => {
        const seen = [];
        class FakeRule extends PasswordRule {
            constructor(result) {
                super();
                this.result = result;
            }
            validate(password, context) {
                seen.push([password, context]);
                return this.result;
            }
        }
        const context = { username: 'u' };
        const policy = new PasswordPolicy([new FakeRule('first'), new FakeRule(null), new FakeRule('third')]);

        expect(policy.check('pw', context)).to.deep.equal(['first', 'third']);
        expect(seen).to.have.length(3);
        expect(seen[0]).to.deep.equal(['pw', context]);
    });

    it('the default policy reports every problem at once', () => {
        const errors = defaultPasswordPolicy.check('melody', { username: 'melody', email: 'm@x.com' });
        expect(errors).to.have.length(3);
        expect(defaultPasswordPolicy.check('Str0ng!pass', { username: 'melody', email: 'harmony@x.com' })).to.deep.equal([]);
    });
});
