
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '60m' });
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        if (!EMAIL_REGEX.test(email || '')) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }
        if (!PASSWORD_REGEX.test(password || '')) {
            return res.status(400).json({ message: 'Password must be at least 8 characters and include a letter and a digit' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) return res.status(409).json({ message: 'User already exists' });

        const user = await User.create({ name, email: normalizedEmail, password });
        res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'User already exists' });
        }
        res.status(500).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const normalizedEmail = (email || '').trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (user && (await bcrypt.compare(password, user.password))) {
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
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { name, email, university, address } = req.body;
        user.name = name || user.name;
        user.email = email || user.email;
        user.university = university || user.university;
        user.address = address || user.address;

        const updatedUser = await user.save();
        res.json({ id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, university: updatedUser.university, address: updatedUser.address, token: generateToken(updatedUser.id, updatedUser.role) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const logoutUser = (req, res) => {
    res.status(200).json({ message: 'Logged out' });
};

module.exports = { registerUser, loginUser, logoutUser, updateUserProfile };
