const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = new Redis(redisUrl, {
  lazyConnect: true,
  enableOfflineQueue: false,
  commandTimeout: 1000,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) {
      return null;
    }

    return Math.min(times * 200, 1000);
  }
});

redisClient.on('error', (error) => {
  console.error('Redis error:', error.message);
});

const connectRedis = async () => {
  try {
    if (redisClient.status === 'end') {
      return;
    }

    await redisClient.connect();
    console.log('Redis connected');
  } catch (error) {
    console.error('Redis unavailable, continuing without cache:', error.message);
  }
};

module.exports = {
  redisClient,
  connectRedis
};
