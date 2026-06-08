const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('../config/redis');

const createRedisStore = (prefix) =>
  new RedisStore({
    prefix,
    sendCommand: (...args) => redisClient.call(...args)
  });

const rateLimitMessage = { error: 'Too many requests. Try again later.' };

const createLimiter = ({ prefix, windowMs, limit, useRedisStore }) => {
  const options = {
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    message: rateLimitMessage
  };

  if (useRedisStore && redisClient.status === 'ready') {
    options.store = createRedisStore(prefix);
  }

  return rateLimit(options);
};

const createRateLimiters = ({ useRedisStore = redisClient.status === 'ready' } = {}) => ({
  globalLimiter: createLimiter({
    prefix: 'rl:global:',
    windowMs: 15 * 60 * 1000,
    limit: 100,
    useRedisStore
  }),
  shortenLimiter: createLimiter({
    prefix: 'rl:shorten:',
    windowMs: 60 * 60 * 1000,
    limit: 20,
    useRedisStore
  })
});

module.exports = {
  createRateLimiters
};
