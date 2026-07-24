const path = require('path');
const { STORAGE_ROOT } = require('./fileService');

function getClientIdFromPath(filePath) {
  const relative = path.relative(STORAGE_ROOT, filePath);
  const parts = relative.split(path.sep);
  return parts[0] || null;
}

function getFileNameFromPath(filePath) {
  return path.basename(filePath);
}

function emitFileChange(io, { type, filePath }) {
  const clientId = getClientIdFromPath(filePath);
  if (!clientId) return;

  const fileName = getFileNameFromPath(filePath);
  const room = `client_${clientId}`;

  io.to(room).emit('fileChanged', {
    type,
    clientId,
    file: fileName
  });
}

function emitFileDeleted(io, { filePath }) {
  const clientId = getClientIdFromPath(filePath);
  if (!clientId) return;

  const fileName = getFileNameFromPath(filePath);
  const room = `client_${clientId}`;

  io.to(room).emit('fileDeleted', {
    clientId,
    file: fileName
  });
}

function requestSyncForClient(io, clientId) {
  const room = `client_${clientId}`;
  io.to(room).emit('syncRequest', {
    clientId
  });
}

module.exports = {
  getClientIdFromPath,
  getFileNameFromPath,
  emitFileChange,
  emitFileDeleted,
  requestSyncForClient
};

