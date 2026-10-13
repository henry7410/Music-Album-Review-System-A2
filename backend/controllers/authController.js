
const User = require('../models/User');
const LoginAttempt = require('../models/LoginAttempt');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { defaultPasswordPolicy } = require('../passwordPolicy/passwordRules');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '60m' });
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerUser = async (req, res) => {
    const { username, firstName, lastName, email, password } = req.body;
    try {
        if (!EMAIL_REGEX.test(email || '')) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }
        const trimmedUsername = (username || '').trim();
        const trimmedFirstName = (firstName || '').trim();
        const trimmedLastName = (lastName || '').trim();
        if (!trimmedUsername || !trimmedFirstName || !trimmedLastName) {
            return res.status(400).json({ message: 'Username, first name and last name are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Must run before User.create: the pre-save hook replaces the password with a bcrypt hash.
        const passwordErrors = defaultPasswordPolicy.check(typeof password === 'string' ? password : '', {
            username: trimmedUsername,
            email: normalizedEmail,
        });
        if (passwordErrors.length > 0) {
            return res.status(400).json({ message: 'Password does not meet the requirements', errors: passwordErrors });
        }

        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) return res.status(409).json({ message: 'User already exists', field: 'email' });

        const user = await User.create({
            name: `${trimmedFirstName} ${trimmedLastName}`,
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
            username: trimmedUsername,
            email: normalizedEmail,
            password,
        });
        res.status(201).json({ id: user.id, name: user.name, username: user.username, email: user.email, role: user.role });
    } catch (error) {
        if (error.code === 11000) {
            // Email and username share error code 11000; keyPattern says which index collided.
            if (error.keyPattern && error.keyPattern.username) {
                return res.status(409).json({ message: `Username "${username.trim()}" is already taken`, field: 'username' });
            }
            return res.status(409).json({ message: 'User already exists', field: 'email' });
        }
        res.status(500).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        const loginAttempt = await LoginAttempt.findOne({ ip });
        if (
            loginAttempt &&
            loginAttempt.lockedUntil &&
            loginAttempt.lockedUntil < new Date()
        ) {
            await LoginAttempt.deleteOne({ ip });
        }
        if (
            loginAttempt &&
            loginAttempt.lockedUntil &&
            loginAttempt.lockedUntil > new Date()
        ) {
            return res.status(429).json({
                message:'Too many failed login attempts. Please try again in 15 minutes.',
            });
        }
        const normalizedEmail = (email || '').trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (user && (await bcrypt.compare(password, user.password))) {
            await LoginAttempt.deleteOne({ ip });
            // Activity tracking is a side effect of login, not part of it: a
            // failed write is logged and the user still gets their token.
            // updateOne (not save) keeps the password pre-save hook out of it.
            try {
                await User.updateOne({ _id: user._id }, { $set: { lastActivity: new Date() } });
            } catch (activityError) {
                console.error('Failed to record lastActivity:', activityError.message);
            }
            res.json({ id: user.id, name: user.name, email: user.email, role: user.role, token: generateToken(user.id, user.role) });
        } else {
            let attempt = await LoginAttempt.findOne({ ip });
            if (!attempt) {
                attempt = new LoginAttempt({
                    ip,
                    email: normalizedEmail,
                    failedAttempts: 1,
                });
            } else {
                attempt.email = normalizedEmail;
                attempt.failedAttempts += 1;
            }
            if (attempt.failedAttempts >= 5) {
                attempt.lockedUntil = new Date(
                Date.now() + 15 * 60 * 1000
            );
            }
            await attempt.save();
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const logoutUser = (req, res) => {
    res.status(200).json({ message: 'Logged out' });
};

module.exports = { registerUser, loginUser, logoutUser };
