const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema(
    {
        ip: {
            type: String,
            required: true,
            unique: true,
        },
        
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        failedAttempts: {
            type: Number,
            default: 0,
        },

        lockedUntil: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    'LoginAttempt',
    loginAttemptSchema
);