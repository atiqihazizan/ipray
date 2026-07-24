const { Queue } = require('bullmq');
const { redisConfig } = require('../config/redis');

const UPLOAD_QUEUE_NAME = 'uploadQueue';

const uploadQueue = new Queue(UPLOAD_QUEUE_NAME, {
  connection: redisConfig.connection,
  defaultJobOptions: {
    // Auto-remove completed jobs after 24 hours or keep only last 100
    removeOnComplete: {
      age: 86400,    // 24 hours in seconds
      count: 100     // Keep last 100 completed jobs
    },
    // Auto-remove failed jobs after 7 days
    removeOnFail: {
      age: 604800    // 7 days in seconds
    },
    // Retry failed jobs up to 3 times with exponential backoff
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000    // Start with 2 seconds delay
    }
  }
});

module.exports = {
  uploadQueue,
  UPLOAD_QUEUE_NAME
};
