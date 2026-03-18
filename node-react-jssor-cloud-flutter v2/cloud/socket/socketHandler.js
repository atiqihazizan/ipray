const { validateSocketAuth } = require('../middleware/auth');
const { ensureClientDir, saveUploadedFile } = require('../services/fileService');
const { readDataFile, readRawFile, updateRow, insertRow, deleteRow, writeFile } = require('../services/cloudDataService');

const CLOUD_EVENTS = [
  'cloud:data:get',
  'cloud:data:update',
  'cloud:data:insert',
  'cloud:data:delete',
  'cloud:file:save',
  'cloud:file:get',
  'cloud:image:upload',
  'cloud:kematian:update',
  'cloud:kematian:clear',
  'cloud:live:start',
  'cloud:live:stop',
  'cloud:reboot',
  'cloud:test-sound',
  'cloud:slideshow:reorder',
  'cloud:slides:toggle-hide',
  'cloud:time:set',
  'cloud:time:sync',
  'cloud:wifi:scan',
  'cloud:wifi:status',
  'cloud:wifi:configure',
  'cloud:wifi:hotspot:enable',
  'cloud:wifi:hotspot:disable',
  'cloud:wifi:hotspot:status',
];

function registerSocketHandlers(io) {
  io.on('connection', socket => {
    socket.on('registerClient', async payload => {
      const { clientId } = payload || {};
      if (!clientId) {
        return;
      }

      if (!validateSocketAuth(payload)) {
        socket.emit('error', { message: 'unauthorized' });
        return socket.disconnect(true);
      }

      try {
        await ensureClientDir(clientId);
        console.log('[Cloud] Client registered & directory ensured:', clientId);
      } catch (err) {
        console.error('[Cloud] Failed to ensure client directory', clientId, err);
      }

      const room = `client_${clientId}`;
      socket.join(room);
      socket.data = socket.data || {};
      socket.data.clientId = clientId;
      socket.data.isClient = true;
      io.to(`setting_${clientId}`).emit('local:status', { connected: true });
      console.log('[Cloud] Local client connected:', clientId);
    });

    socket.on('registerSettingPanel', async payload => {
      const { clientId } = payload || {};
      if (!clientId) {
        return;
      }

      if (!validateSocketAuth(payload)) {
        socket.emit('error', { message: 'unauthorized' });
        return socket.disconnect(true);
      }

      const room = `setting_${clientId}`;
      socket.join(room);
      socket.data = socket.data || {};
      socket.data.clientId = clientId;
      socket.data.isSettingPanel = true;
      let localConnected = false;
      try {
        const clientsInRoom = await io.in(`client_${clientId}`).fetchSockets();
        localConnected = (clientsInRoom && clientsInRoom.length) > 0;
      } catch (err) {
        console.error('[Cloud] fetchSockets for local status:', err.message);
      }
      socket.emit('local:status', { connected: localConnected });
      console.log('[Cloud] Setting panel registered for client:', clientId, '| Local (kiosk) connected:', localConnected);
    });

    socket.on('getLocalStatus', async () => {
      if (!socket.data?.isSettingPanel || !socket.data?.clientId) return;
      const clientId = socket.data.clientId;
      let localConnected = false;
      try {
        const clientsInRoom = await io.in(`client_${clientId}`).fetchSockets();
        localConnected = (clientsInRoom && clientsInRoom.length) > 0;
      } catch (err) {
        console.error('[Cloud] getLocalStatus fetchSockets:', err.message);
      }
      socket.emit('local:status', { connected: localConnected });
      console.log('[Cloud] getLocalStatus for client:', clientId, '| Local connected:', localConnected);
    });

    // Panel setting dari internet: layan cloud:data:get & cloud:file:get dari storage cloud
    // (tanpa bergantung pada nodejs client tempatan)
    socket.on('cloud:data:get', async payload => {
      if (!socket.data?.isSettingPanel || !socket.data?.clientId) {
        return; // biar handler generic forward ke client
      }
      const { fileName, requestId } = payload || {};
      try {
        const { data, columns } = await readDataFile(socket.data.clientId, fileName);
        socket.emit('cloud:response', { requestId, success: true, data: { data, columns } });
      } catch (err) {
        socket.emit('cloud:response', {
          requestId: payload?.requestId,
          success: false,
          error: err.message || 'Failed to read data'
        });
      }
    });

    socket.on('cloud:file:get', async payload => {
      if (!socket.data?.isSettingPanel || !socket.data?.clientId) {
        return;
      }
      const { fileName, requestId } = payload || {};
      try {
        const content = await readRawFile(socket.data.clientId, fileName);
        socket.emit('cloud:response', { requestId, success: true, data: content });
      } catch (err) {
        socket.emit('cloud:response', {
          requestId: payload?.requestId,
          success: false,
          error: err.message || 'Failed to read file'
        });
      }
    });

    socket.on('cloud:image:upload', async payload => {
      if (!socket.data?.isSettingPanel || !socket.data?.clientId) return;
      const { base64, originalName, category, requestId } = payload || {};
      const clientId = socket.data.clientId;
      const cat = category || 'penceramah';
      try {
        const buffer = Buffer.from(base64, 'base64');
        const sanitizedName = String(originalName || 'image').replace(/[^a-zA-Z0-9.-]/g, '_');
        await saveUploadedFile({
          clientId,
          originalName: sanitizedName,
          buffer,
          folder: `images/${cat}`
        });
      } catch (err) {
        console.error('[Cloud] Save image to storage failed:', err.message);
      }
      io.to(`client_${clientId}`).emit('cloud:image:upload', { ...payload, clientId });
    });

    async function pushStorageToClient(clientId, fileName) {
      try {
        const content = await readRawFile(clientId, fileName);
        io.to(`client_${clientId}`).emit('storage:updated', { fileName, content });
      } catch (e) {
        console.error('[Cloud] pushStorageToClient:', fileName, e.message);
      }
    }

    socket.on('cloud:data:update', async payload => {
      if (!socket.data?.isSettingPanel || !socket.data?.clientId) return;
      const { fileName, id, row, requestId } = payload || {};
      const clientId = socket.data.clientId;
      try {
        const result = await updateRow(clientId, fileName, parseInt(id, 10), row);
        socket.emit('cloud:response', { requestId, success: true, data: { ...result, action: 'update' } });
        await pushStorageToClient(clientId, fileName);
      } catch (err) {
        socket.emit('cloud:response', { requestId, success: false, error: err.message || 'Update failed' });
      }
    });

    socket.on('cloud:data:insert', async payload => {
      if (!socket.data?.isSettingPanel || !socket.data?.clientId) return;
      const { fileName, row, position, requestId } = payload || {};
      const clientId = socket.data.clientId;
      try {
        const result = await insertRow(clientId, fileName, row, position || 'end');
        socket.emit('cloud:response', { requestId, success: true, data: { ...result, action: 'insert' } });
        await pushStorageToClient(clientId, fileName);
      } catch (err) {
        socket.emit('cloud:response', { requestId, success: false, error: err.message || 'Insert failed' });
      }
    });

    socket.on('cloud:data:delete', async payload => {
      if (!socket.data?.isSettingPanel || !socket.data?.clientId) return;
      const { fileName, id, requestId } = payload || {};
      const clientId = socket.data.clientId;
      try {
        const result = await deleteRow(clientId, fileName, parseInt(id, 10));
        socket.emit('cloud:response', { requestId, success: true, data: { ...result, action: 'delete' } });
        await pushStorageToClient(clientId, fileName);
      } catch (err) {
        socket.emit('cloud:response', { requestId, success: false, error: err.message || 'Delete failed' });
      }
    });

    socket.on('cloud:file:save', async payload => {
      if (!socket.data?.isSettingPanel || !socket.data?.clientId) return;
      const { fileName, content, requestId } = payload || {};
      const clientId = socket.data.clientId;
      try {
        const result = await writeFile(clientId, fileName, content);
        socket.emit('cloud:response', { requestId, success: true, data: result });
        io.to(`client_${clientId}`).emit('storage:updated', { fileName, content });
      } catch (err) {
        socket.emit('cloud:response', { requestId, success: false, error: err.message || 'Save failed' });
      }
    });

    CLOUD_EVENTS.forEach(eventName => {
      socket.on(eventName, payload => {
        const clientId = socket.data?.clientId;
        if (!clientId) {
          socket.emit('cloud:response', {
            requestId: payload?.requestId,
            success: false,
            error: 'Not registered. Call registerSettingPanel first.'
          });
          return;
        }
        const handledOnCloud = ['cloud:data:get', 'cloud:file:get', 'cloud:data:update', 'cloud:data:insert', 'cloud:data:delete', 'cloud:file:save', 'cloud:image:upload'];
        if (handledOnCloud.includes(eventName) && socket.data?.isSettingPanel) {
          return;
        }
        const room = `client_${clientId}`;
        io.to(room).emit(eventName, { ...payload, clientId });
      });
    });

    socket.on('cloud:response', payload => {
      const clientId = payload?.clientId || socket.data?.clientId;
      if (!clientId) return;

      const room = `setting_${clientId}`;
      io.to(room).emit('cloud:response', payload);
    });

    const FORWARD_TO_SETTING = [
      'data:updated',
      'hebahan:updated',
      'setting:ack',
      'data:ack',
      'takwim:refresh',
      'home-title:updated',
      'marquee-config:updated',
      'screen-flags:updated',
      'kematian:updated',
      'kematian:cleared',
      'live:started',
      'live:stopped',
      'livestream:overlay-config',
      'kematian:overlay-config',
      'hls:playlistReady',
      'hls:error',
    ];

    FORWARD_TO_SETTING.forEach(eventName => {
      socket.on(eventName, payload => {
        const clientId = socket.data?.clientId;
        if (!clientId) return;
        const room = `setting_${clientId}`;
        io.to(room).emit(eventName, payload);
      });
    });

    socket.on('disconnect', () => {
      if (socket.data?.isClient && socket.data?.clientId) {
        io.to(`setting_${socket.data.clientId}`).emit('local:status', { connected: false });
        console.log('[Cloud] Local client disconnected:', socket.data.clientId);
      }
      if (socket.data?.isSettingPanel) {
        console.log('[Cloud] Setting panel disconnected for client:', socket.data.clientId);
      }
    });
  });
}

module.exports = {
  registerSocketHandlers
};
