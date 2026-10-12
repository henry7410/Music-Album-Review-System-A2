
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, account no longer exists' });
            }
            next();
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const requireRole = (role) => (req, res, next) => {
    if (req.user?.role !== role) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    next();
};

const requireOwnership = (model, ownerField) => async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized' });
    }
    try {
        const doc = await model.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ message: 'Not found' });
        }
        if (doc[ownerField].toString() !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        req.resource = doc;
        next();
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Not found' });
        }
        res.status(500).json({ message: error.message });
    }
};

module.exports = { protect, requireRole, requireOwnership };
