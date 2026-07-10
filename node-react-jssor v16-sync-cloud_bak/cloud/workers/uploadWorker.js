const path = require('path');
const { Worker } = require('bullmq');
const { createRedisClient, redisConfig } = require('../config/redis');
const { UPLOAD_QUEUE_NAME } = require('../queue/uploadQueue');
const { saveUploadedFile, deleteFile } = require('../services/fileService');

async function startWorker() {
  const testClient = createRedisClient();

  testClient.on('error', err => {
    // eslint-disable-next-line no-console
    console.error('[Redis testClient error]', err.message || err);
  });

  try {
    await testClient.ping();
    // eslint-disable-next-line no-console
    console.log('[Redis] Connected successfully for worker');
    testClient.disconnect();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Redis] Failed to connect for worker:', err.message || err);
    process.exit(1);
  }

  // Worker process to handle upload jobs asynchronously
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
    } else if (job.name === 'delete') {
      const { clientId, fileName, folder } = job.data;
      if (!clientId || !fileName || !folder) {
        throw new Error('Invalid delete job payload');
      }
      await deleteFile({ clientId, fileName, folder });
      return { success: true };
    } else {
      throw new Error('Invalid job name');
    }

    },
    {
      connection: redisConfig.connection
    }
  );

  worker.on('completed', job => {
    // eslint-disable-next-line no-console
    console.log('[UploadWorker] Completed job', job.id);
  });

  worker.on('failed', (job, err) => {
    // eslint-disable-next-line no-console
    console.error('[UploadWorker] Failed job', job && job.id, err);
  });

  worker.on('error', err => {
    // eslint-disable-next-line no-console
    console.error('[UploadWorker] Worker error', err.message || err);
  });

  return worker;
}

startWorker().catch(err => {
  // eslint-disable-next-line no-console
  console.error('[UploadWorker] Fatal error during startup', err);
  process.exit(1);
});

