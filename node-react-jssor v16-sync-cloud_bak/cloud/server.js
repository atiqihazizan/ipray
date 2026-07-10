require('dotenv').config();

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createRedisClient } = require('./config/redis');
const { ensureClientDir, STORAGE_ROOT } = require('./services/fileService');
const { registerSocketHandlers } = require('./socket/socketHandler');
const { initCloudWatcher } = require('./watcher/cloudWatcher');
const uploadRoute = require('./api/uploadRoute');
const ackRoute = require('./api/ackRoute');

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: '*'
    }
  });

  // Konfigurasi Redis adapter untuk clustering Socket.IO
  const pubClient = createRedisClient();
  const subClient = pubClient.duplicate();

  pubClient.on('error', err => {
    // eslint-disable-next-line no-console
    console.error('[Redis pubClient error]', err.message || err);
  });

  subClient.on('error', err => {
    // eslint-disable-next-line no-console
    console.error('[Redis subClient error]', err.message || err);
  });

  try {
    await pubClient.ping();
    // eslint-disable-next-line no-console
    console.log('[Redis] Connected successfully');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Redis] Failed to connect:', err.message || err);
    process.exit(1);
  }

  io.adapter(createAdapter(pubClient, subClient));

  app.use(express.json());

  // API routes
  app.use(uploadRoute);
  app.use(ackRoute);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Initialize Socket.IO handlers
  registerSocketHandlers(io);

  // Initialize file watcher
  initCloudWatcher(io);

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Cloud sync server listening on port ${PORT}`);
    // eslint-disable-next-line no-console
    console.log('Storage root:', STORAGE_ROOT);
  });
}

bootstrap().catch(err => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});

