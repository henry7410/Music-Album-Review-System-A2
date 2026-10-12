const BaseFlag = require('./baseFlag');

// inheritance BaseFlag
class SpamFlag extends BaseFlag {
    getReason() {
        return 'Spam';
    }
}

module.exports = SpamFlag;