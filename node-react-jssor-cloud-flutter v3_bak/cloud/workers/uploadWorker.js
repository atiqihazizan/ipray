const path = require('path');
const { Worker } = require('bullmq');
const { createRedisClient, redisConfig } = require('../config/redis');
const { UPLOAD_QUEUE_NAME } = require('../queue/uploadQueue');
const { saveUploadedFile, deleteFile } = require('../services/fileService');

/**
 * Start upload queue worker (dipanggil dari server.js).
 * @returns {Promise<Worker>}
 */
async function startUploadWorker() {
  const testClient = createRedisClient();
  testClient.on('error', err => {
    console.error('[Redis testClient error]', err.message || err);
  });

  try {
    await testClient.ping();
    console.log('[Redis] Worker connected');
    testClient.disconnect();
  } catch (err) {
    console.error('[Redis] Failed to connect for worker:', err.message || err);
    throw err;
  }

  const worker = new Worker(
    UPLOAD_QUEUE_NAME,
    async job => {
      if (job.name === 'upload') {
        const { clientId, originalName, buffer, folder } = job.data;
        if (!clientId || !originalName || !buffer || !folder) {
          throw new Error('Invalid upload job payload');
        }
        const saved = await saveUploadedFile({
          clientId,
          originalName,
          buffer: Buffer.from(buffer.data || buffer),
          folder
        });
        return {
          clientId: saved.clientId,
          fileName: saved.fileName,
          path: path.relative(process.cwd(), saved.path),
          fileId: saved.fileId
        };
      }
      if (job.name === 'delete') {
        const { clientId, fileName, folder } = job.data;
        if (!clientId || !fileName || !folder) {
          throw new Error('Invalid delete job payload');
        }
        await deleteFile({ clientId, fileName, folder });
        return { success: true };
      }
      throw new Error('Invalid job name');
    },
    { connection: redisConfig.connection }
  );

  worker.on('completed', job => {
    // console.log('[UploadWorker] Completed job', job.id);
  });
  worker.on('failed', (job, err) => {
    console.error('[UploadWorker] Failed job', job && job.id, err);
  });
  worker.on('error', err => {
    console.error('[UploadWorker] Worker error', err.message || err);
  });

  return worker;
}

module.exports = { startUploadWorker };
