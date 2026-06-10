const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

dotenv.config();

const connectDB = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const authRoutes = require('./src/routes/auth.routes');
const createUrlRouter = require('./src/routes/url.routes');
const { redirectToOriginalUrl } = require('./src/controllers/url.controller');
const { createRateLimiters } = require('./src/middleware/rateLimiter.middleware');
const { validateEnvironment } = require('./src/utils/env');
const swaggerSpec = require('./src/config/swagger');

const PORT = process.env.PORT || 5000;

const buildApp = ({ useRedisRateLimit = false } = {}) => {
  const app = express();
  const { globalLimiter, shortenLimiter } = createRateLimiters({
    useRedisStore: useRedisRateLimit
  });
  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      }
    })
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(globalLimiter);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  /**
   * @openapi
   * /:
   *   get:
   *     summary: API landing page
   *     responses:
   *       200:
   *         description: HTML landing page
   */
  app.get('/', (req, res) => {
    res.type('html').send(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>LinkSnap API</title>
          <style>
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              color: #172033;
              background: #f7f8fb;
            }
            main {
              max-width: 860px;
              margin: 0 auto;
              padding: 56px 24px;
            }
            h1 {
              margin: 0 0 12px;
              font-size: 42px;
            }
            p {
              font-size: 17px;
              line-height: 1.6;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 28px;
              background: #ffffff;
              border: 1px solid #dce1ea;
            }
            th,
            td {
              padding: 14px 16px;
              border-bottom: 1px solid #dce1ea;
              text-align: left;
            }
            th {
              background: #eef2f7;
            }
            code {
              font-family: Consolas, monospace;
            }
          </style>
        </head>
        <body>
          <main>
            <h1>LinkSnap API</h1>
            <p>
              A production-style URL shortener backend with JWT auth, MongoDB,
              Redis caching, Redis-backed rate limiting, analytics, Docker, and CI/CD.
            </p>
            <p>
              API docs:
              <a href="/api-docs"><code>/api-docs</code></a>
            </p>
            <p>
              Health check:
              <a href="/health"><code>/health</code></a>
            </p>
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Route</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>POST</code></td>
                  <td><code>/api/auth/register</code></td>
                  <td>Register a user and receive a JWT.</td>
                </tr>
                <tr>
                  <td><code>POST</code></td>
                  <td><code>/api/auth/login</code></td>
                  <td>Log in and receive a JWT.</td>
                </tr>
                <tr>
                  <td><code>POST</code></td>
                  <td><code>/api/urls/shorten</code></td>
                  <td>Create a protected short URL.</td>
                </tr>
                <tr>
                  <td><code>GET</code></td>
                  <td><code>/:shortCode</code></td>
                  <td>Public redirect to the original URL.</td>
                </tr>
                <tr>
                  <td><code>GET</code></td>
                  <td><code>/api/urls/:shortCode/analytics</code></td>
                  <td>View owner-only analytics.</td>
                </tr>
              </tbody>
            </table>
          </main>
        </body>
      </html>
    `);
  });

  /**
   * @openapi
   * /health:
   *   get:
   *     summary: Health check
   *     responses:
   *       200:
   *         description: Service is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   */
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/urls', createUrlRouter({ shortenLimiter }));

  /**
   * @openapi
   * /{shortCode}:
   *   get:
   *     summary: Redirect a short URL to the original URL
   *     tags:
   *       - Redirects
   *     parameters:
   *       - in: path
   *         name: shortCode
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       302:
   *         description: Redirects to the original URL
   *       404:
   *         description: Short URL not found
   *       410:
   *         description: Short URL expired
   */
  app.get('/:shortCode', redirectToOriginalUrl);

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  app.use((err, req, res, next) => {
    const isDuplicateKey = err.code === 11000;
    const statusCode = isDuplicateKey ? 409 : err.statusCode || 500;
    const message = isDuplicateKey ? 'Duplicate resource' : statusCode === 500 ? 'Internal server error' : err.message;

    if (statusCode === 500) {
      console.error('Unhandled error:', err.message);
    }

    res.status(statusCode).json({ error: message });
  });

  return app;
};

const app = buildApp();

const startServer = async () => {
  validateEnvironment();
  await connectDB();
  await connectRedis();
  const serverApp = buildApp({ useRedisRateLimit: true });

  return serverApp.listen(PORT, () => {
    console.log(`LinkSnap API running on port ${PORT}`);
  });
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });
}

module.exports = {
  app,
  buildApp,
  startServer
};
