const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const STORAGE_ROOT = path.join(__dirname, '..', 'storage');

async function ensureClientDir(clientId) {
  const clientDir = path.join(STORAGE_ROOT, clientId);
  await fs.ensureDir(clientDir);
  return clientDir;
}

async function saveUploadedFile({ clientId, originalName, buffer, folder }) {
  const clientDir = await ensureClientDir(path.join(clientId, folder));
  const fileId = uuidv4();
  const targetPath = path.join(clientDir, originalName);

  await fs.writeFile(targetPath, buffer);

  return {
    fileId,
    path: targetPath,
    fileName: originalName,
    clientId
  };
}

async function deleteFile({ clientId, fileName, folder }) {
  const clientDir = await ensureClientDir(path.join(clientId, folder));
  const targetPath = path.join(clientDir, fileName);
  if (await fs.pathExists(targetPath)) {
    await fs.remove(targetPath);
  }
}

module.exports = {
  STORAGE_ROOT,
  ensureClientDir,
  saveUploadedFile,
  deleteFile
};

