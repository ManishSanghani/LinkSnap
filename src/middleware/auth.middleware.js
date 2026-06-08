const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id name email');

    if (!user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};

module.exports = authMiddleware;
