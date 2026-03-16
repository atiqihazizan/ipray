const { Queue } = require('bullmq');
const { redisConfig } = require('../config/redis');

const UPLOAD_QUEUE_NAME = 'uploadQueue';

const uploadQueue = new Queue(UPLOAD_QUEUE_NAME, {
  connection: redisConfig.connection
});

module.exports = {
  uploadQueue,
  UPLOAD_QUEUE_NAME
};

