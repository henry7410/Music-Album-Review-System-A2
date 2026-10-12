const BaseFlag = require('./baseFlag');

// inheritance BaseFlag
class RudeFlag extends BaseFlag {
    getReason() {
        return 'Rude';
    }
}

module.exports = RudeFlag;