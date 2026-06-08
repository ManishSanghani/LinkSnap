const express = require('express');
const { body, param, query } = require('express-validator');
const {
  deleteUrl,
  getAnalytics,
  getMyUrls,
  shorten
} = require('../controllers/url.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { shortenLimiter } = require('../middleware/rateLimiter.middleware');
const { isSafeRedirectUrl } = require('../utils/urlSecurity');

const router = express.Router();

router.use(authMiddleware);

router.post(
  '/shorten',
  shortenLimiter,
  [
    body('originalUrl')
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('A valid http or https originalUrl is required')
      .custom((value) => isSafeRedirectUrl(value))
      .withMessage('originalUrl cannot target localhost or private network addresses'),
    body('customAlias')
      .optional()
      .trim()
      .isAlphanumeric()
      .withMessage('customAlias must be alphanumeric')
      .isLength({ min: 3, max: 20 })
      .withMessage('customAlias must be 3-20 characters'),
    body('expiresInDays')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('expiresInDays must be between 1 and 365')
      .toInt()
  ],
  shorten
);

router.get(
  '/my',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt()
  ],
  getMyUrls
);

router.get(
  '/:shortCode/analytics',
  [param('shortCode').trim().notEmpty().withMessage('shortCode is required')],
  getAnalytics
);

router.delete(
  '/:shortCode',
  [param('shortCode').trim().notEmpty().withMessage('shortCode is required')],
  deleteUrl
);

module.exports = router;
