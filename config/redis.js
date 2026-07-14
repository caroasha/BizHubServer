const Redis = require('ioredis');
const env = require('./env');

let redisClient = null;

const connectRedis = () => {
  if (!env.REDIS_ENABLED) {
    return null;
  }

  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    return redisClient;
  } catch (error) {
    return null;
  }
};

const getRedisClient = () => redisClient;

module.exports = { connectRedis, getRedisClient };