const BaseFlag = require('./baseFlag');

// inheritance BaseFlag
class UnrelatedFlag extends BaseFlag {
    getReason() {
        return 'Unrelated to Music Album';
    }
}

module.exports = UnrelatedFlag;
