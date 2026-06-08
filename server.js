const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');

dotenv.config();

const connectDB = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const authRoutes = require('./src/routes/auth.routes');
const urlRoutes = require('./src/routes/url.routes');
const { redirectToOriginalUrl } = require('./src/controllers/url.controller');
const { globalLimiter } = require('./src/middleware/rateLimiter.middleware');
const { validateEnvironment } = require('./src/utils/env');

const app = express();
const PORT = process.env.PORT || 5000;
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

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/urls', urlRoutes);

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

const startServer = async () => {
  validateEnvironment();
  await connectDB();
  await connectRedis();

  return app.listen(PORT, () => {
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
  startServer
};
