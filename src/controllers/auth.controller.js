const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const createHttpError = require('../utils/httpError');

const signToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw createHttpError(500, 'JWT secret is not configured');
  }

  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

const getValidationErrors = (req) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return errors.array().map((error) => error.msg).join(', ');
  }

  return null;
};

const register = async (req, res, next) => {
  try {
    const validationError = getValidationErrors(req);
    if (validationError) {
      throw createHttpError(400, validationError);
    }

    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw createHttpError(409, 'Email is already registered');
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const validationError = getValidationErrors(req);
    if (validationError) {
      throw createHttpError(400, validationError);
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      throw createHttpError(401, 'Invalid email or password');
    }

    const token = signToken(user);

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  login,
  register
};
