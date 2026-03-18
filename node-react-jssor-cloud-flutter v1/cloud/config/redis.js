const { Redis } = require('ioredis');

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_DB = Number(process.env.REDIS_DB || 0);

function createRedisClient() {
  return new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    db: REDIS_DB
  });
}

module.exports = {
  createRedisClient,
  redisConfig: {
    connection: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      db: REDIS_DB
    }
  }
};

