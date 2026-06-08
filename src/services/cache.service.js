const { redisClient } = require('../config/redis');

const getCache = async (key) => {
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis get failed:', error.message);
    return null;
  }
};

const setCache = async (key, value, ttlSeconds) => {
  try {
    if (!ttlSeconds || ttlSeconds <= 0) {
      return null;
    }

    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return true;
  } catch (error) {
    console.error('Redis set failed:', error.message);
    return null;
  }
};

const deleteCache = async (key) => {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis delete failed:', error.message);
    return null;
  }
};

module.exports = {
  getCache,
  setCache,
  deleteCache
};
