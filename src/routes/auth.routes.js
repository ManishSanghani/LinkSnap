const express = require('express');
const { body } = require('express-validator');
const { login, register } = require('../controllers/auth.controller');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
    body('email').trim().isEmail().normalizeEmail().withMessage('A valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  register
);

router.post(
  '/login',
  [
    body('email').trim().isEmail().normalizeEmail().withMessage('A valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  login
);

module.exports = router;
