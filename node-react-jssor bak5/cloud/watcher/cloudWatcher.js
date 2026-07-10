const chokidar = require('chokidar');
const path = require('path');
const { STORAGE_ROOT } = require('../services/fileService');
const { emitFileChange, emitFileDeleted } = require('../services/syncService');

function initCloudWatcher(io) {
  const watcher = chokidar.watch(STORAGE_ROOT, {
    persistent: true,
    ignoreInitial: true,
    depth: 3
  });

  watcher
    .on('add', filePath => {
      emitFileChange(io, { type: 'upload', filePath });
    })
    .on('change', filePath => {
      emitFileChange(io, { type: 'update', filePath });
    })
    .on('unlink', filePath => {
      emitFileDeleted(io, { filePath });
    })
    .on('error', error => {
      // eslint-disable-next-line no-console
      console.error('[CloudWatcher] Error:', error);
    });

  return watcher;
}

module.exports = {
  initCloudWatcher
};

