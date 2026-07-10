const { validateSocketAuth } = require('../middleware/auth');
const { ensureClientDir } = require('../services/fileService');

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

      // Pastikan folder storage/clients/<clientId> wujud apabila client register
      try {
        await ensureClientDir(clientId);
        // eslint-disable-next-line no-console
        console.log('[Cloud] Client registered & directory ensured:', clientId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Cloud] Failed to ensure client directory', clientId, err);
      }

      const room = `client_${clientId}`;
      socket.join(room);
      socket.data = socket.data || {};
      socket.data.clientId = clientId;
    });

    socket.on('disconnect', () => {
      // Future: handle cleanup if necessary
    });
  });
}

module.exports = {
  registerSocketHandlers
};


