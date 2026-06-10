const express = require('express');
const { body, param, query } = require('express-validator');
const {
  deleteUrl,
  getAnalytics,
  getMyUrls,
  shorten
} = require('../controllers/url.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { isSafeRedirectUrl } = require('../utils/urlSecurity');

const createUrlRouter = ({ shortenLimiter }) => {
  const router = express.Router();

  router.use(authMiddleware);

  /**
   * @openapi
   * /api/urls/shorten:
   *   post:
   *     summary: Create a short URL
   *     tags:
   *       - URLs
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - originalUrl
   *             properties:
   *               originalUrl:
   *                 type: string
   *                 example: https://example.com
   *               customAlias:
   *                 type: string
   *                 example: demo123
   *               expiresInDays:
   *                 type: integer
   *                 example: 30
   *     responses:
   *       201:
   *         description: Short URL created
   *       400:
   *         description: Validation error
   *       401:
   *         description: Authentication required
   *       409:
   *         description: Custom alias already exists
   */
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

  /**
   * @openapi
   * /api/urls/my:
   *   get:
   *     summary: Get URLs created by the logged-in user
   *     tags:
   *       - URLs
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: Paginated URL list
   *       401:
   *         description: Authentication required
   */
  router.get(
    '/my',
    [
      query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt()
    ],
    getMyUrls
  );

  /**
   * @openapi
   * /api/urls/{shortCode}/analytics:
   *   get:
   *     summary: Get analytics for an owned short URL
   *     tags:
   *       - URLs
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: shortCode
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: URL analytics
   *       401:
   *         description: Authentication required
   *       404:
   *         description: Short URL not found
   */
  router.get(
    '/:shortCode/analytics',
    [param('shortCode').trim().notEmpty().withMessage('shortCode is required')],
    getAnalytics
  );

  /**
   * @openapi
   * /api/urls/{shortCode}:
   *   delete:
   *     summary: Delete an owned short URL
   *     tags:
   *       - URLs
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: shortCode
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: URL deleted
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Short URL not found
   */
  router.delete(
    '/:shortCode',
    [param('shortCode').trim().notEmpty().withMessage('shortCode is required')],
    deleteUrl
  );

  return router;
};

module.exports = createUrlRouter;
