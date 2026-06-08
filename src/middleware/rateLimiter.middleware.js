const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('../config/redis');

const createRedisStore = (prefix) =>
  new RedisStore({
    prefix,
    sendCommand: (...args) => redisClient.call(...args)
  });

const rateLimitMessage = { error: 'Too many requests. Try again later.' };

const createLimiter = ({ prefix, windowMs, limit }) => {
  const baseOptions = {
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    message: rateLimitMessage
  };

  const fallbackLimiter = rateLimit(baseOptions);
  let redisLimiter = null;

  return (req, res, next) => {
    if (redisClient.status !== 'ready') {
      return fallbackLimiter(req, res, next);
    }

    if (!redisLimiter) {
      redisLimiter = rateLimit({
        ...baseOptions,
        store: createRedisStore(prefix)
      });
    }

    return redisLimiter(req, res, next);
  };
};

const globalLimiter = createLimiter({
  prefix: 'rl:global:',
  windowMs: 15 * 60 * 1000,
  limit: 100
});

const shortenLimiter = createLimiter({
  prefix: 'rl:shorten:',
  windowMs: 60 * 60 * 1000,
  limit: 20
});

module.exports = {
  globalLimiter,
  shortenLimiter
};
