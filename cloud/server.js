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
let httpServer = null;
let ioServer = null;
let pubClient = null;
let subClient = null;
let cloudWatcher = null;

async function bootstrap() {
  const app = express();
  httpServer = http.createServer(app);

  ioServer = new Server(httpServer, {
    cors: {
      origin: '*'
    }
  });

  // Konfigurasi Redis adapter untuk clustering Socket.IO
  pubClient = createRedisClient();
  subClient = pubClient.duplicate();

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

  ioServer.adapter(createAdapter(pubClient, subClient));

  app.use(express.json({ limit: '15mb' }));

  // API routes
  app.use('/api', clientsRoute);
  app.use(uploadRoute);
  app.use(ackRoute);

  // Serve cloud setting panel
  const settingPath = path.join(__dirname, 'setting');
  app.use('/setting', express.static(settingPath));
  const storagePath = path.join(__dirname, 'storage');
  app.use('/storage', express.static(storagePath));

  // Serve webmobile panel (responsive phone UI)
  // const webmobilePath = path.join(__dirname, 'webmobile');
  // app.use('/webmobile', express.static(webmobilePath));

  // Serve images dari storage (URL: /storage/:clientId/images/category/filename)
  // Path fail: STORAGE_ROOT/clientId/images/category/filename (tanpa "storage" - itu prefix URL sahaja)
  app.use('/images', (req, res, next) => {
    const segs = req.path.replace(/^\/+/, '').split('/').filter(Boolean);
    if (segs.length === 0) return next();
    const pathInStorage = segs[0] === 'images' ? segs.slice(1) : segs;
    if (pathInStorage.length === 0) return next();
    if (pathInStorage.some(s => /\.\.|\0/.test(s))) return res.status(400).end();
    if (pathInStorage[pathInStorage.length - 1] === 'noimage.png') {
      res.setHeader('Content-Type', 'image/gif');
      res.end(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
      return;
    }
    const filePath = path.join(STORAGE_ROOT, ...pathInStorage);
    fs.pathExists(filePath).then(exists => {
      console.log(STORAGE_ROOT, filePath, exists);
      if (!exists) return res.status(404).end();
      res.sendFile(path.resolve(filePath), err => { if (err && !res.headersSent) next(); });
    }).catch(() => next());
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Initialize Socket.IO handlers
  registerSocketHandlers(ioServer);

  // Initialize file watcher
  cloudWatcher = initCloudWatcher(ioServer);

  // Jalankan upload worker dalam proses yang sama (elak perlu npm run worker berasingan)
  uploadWorker = await startUploadWorker();
  console.log('[Cloud] Upload worker started (in-process)');

  httpServer.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Cloud sync server listening on port ${PORT}`);
    // eslint-disable-next-line no-console
    console.log('Storage root:', STORAGE_ROOT);
  });
}

async function shutdown(signal) {
  console.log(`\n[Cloud] ${signal}, shutting down...`);
  try {
    if (uploadWorker) await uploadWorker.close();
    if (cloudWatcher) await cloudWatcher.close();
    if (ioServer) ioServer.close();
    if (pubClient) { await pubClient.quit(); }
    if (subClient) { await subClient.quit(); }
    if (httpServer) {
      await new Promise(resolve => httpServer.close(resolve));
    }
  } catch (e) {
    console.error('[Cloud] Shutdown error:', e.message || e);
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

bootstrap().catch(err => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});

