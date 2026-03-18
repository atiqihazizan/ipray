require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createRedisClient } = require('./config/redis');
const { ensureClientDir, STORAGE_ROOT } = require('./services/fileService');
const fs = require('fs-extra');
const { registerSocketHandlers } = require('./socket/socketHandler');
const { initCloudWatcher } = require('./watcher/cloudWatcher');
const { startUploadWorker } = require('./workers/uploadWorker');
const uploadRoute = require('./api/uploadRoute');
const ackRoute = require('./api/ackRoute');
const clientsRoute = require('./api/clientsRoute');

const PORT = process.env.PORT || 4000;
let uploadWorker = null;

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

  app.use(express.json({ limit: '15mb' }));

  // API routes
  app.use('/api', clientsRoute);
  app.use(uploadRoute);
  app.use(ackRoute);

  // Serve cloud setting panel
  const settingPath = path.join(__dirname, 'setting');
  app.use('/setting', express.static(settingPath));

  // Serve webmobile panel (responsive phone UI)
  const webmobilePath = path.join(__dirname, 'webmobile');
  app.use('/webmobile', express.static(webmobilePath));

  // Serve images dari storage untuk panel cloud (URL: /images/:clientId/category/filename)
  app.use('/images', (req, res, next) => {
    const segs = req.path.replace(/^\/+/, '').split('/');
    const clientId = segs[0];
    const rest = segs.slice(1).join('/');
    if (!clientId || !rest) return next();
    if (/\.\.|\0/.test(rest) || /\.\.|\0/.test(clientId)) return res.status(400).end();
    if (rest === 'noimage.png') {
      res.setHeader('Content-Type', 'image/gif');
      res.end(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
      return;
    }
    const filePath = path.join(STORAGE_ROOT, clientId, 'images', rest);
    fs.pathExists(filePath).then(exists => {
      if (!exists) return res.status(404).end();
      res.sendFile(path.resolve(filePath), err => { if (err && !res.headersSent) next(); });
    }).catch(() => next());
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Initialize Socket.IO handlers
  registerSocketHandlers(io);

  // Initialize file watcher
  initCloudWatcher(io);

  // Jalankan upload worker dalam proses yang sama (elak perlu npm run worker berasingan)
  uploadWorker = await startUploadWorker();
  console.log('[Cloud] Upload worker started (in-process)');

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Cloud sync server listening on port ${PORT}`);
    // eslint-disable-next-line no-console
    console.log('Storage root:', STORAGE_ROOT);
  });
}

function shutdown(signal) {
  console.log(`\n[Cloud] ${signal}, shutting down...`);
  if (uploadWorker) {
    uploadWorker.close().then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

bootstrap().catch(err => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});

