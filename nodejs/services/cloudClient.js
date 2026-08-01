const path = require('path');
const fs = require('fs');

// Electron build: .env mesti di folder sebelah exe (ELECTRON_EXE_DIR). Jangan guna process.cwd().
const isElectron = !!process.versions.electron || process.env.ELECTRON_MODE === 'true';
const envPath = process.env.ELECTRON_EXE_DIR
  ? path.join(process.env.ELECTRON_EXE_DIR, '.env')
  : path.join(process.cwd(), '.env');
if (isElectron && process.env.ELECTRON_EXE_DIR && fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

// ============================================================================
// CLOUD SYNC DISABLED — ipray-cloud.mahsites.net sudah OFFLINE (2026-08-01).
// Kod sambungan asal dikomen supaya app TIDAK sentiasa call cloud setiap
// beberapa saat (spam 'xhr poll error' dalam err.log).
// Konsumer lain (dataService, socketServerService, cloudSocketHandler, main.js)
// masih require module ini — jadi export stub socket + fungsi no-op supaya
// tiada crash. React frontend tidak terlibat (ia connect ke backend lokal).
// ============================================================================

// const { io } = require('socket.io-client');
// const axios = require('axios');
// const FormData = require('form-data');
//
// const CLIENT_ID = process.env.CLIENT_ID || '';
// const CLIENT_TOKEN = process.env.CLIENT_TOKEN;
// const CLOUD_URL = process.env.CLOUD_URL || 'http://ipray-cloud.mahsites.net';
//
// let isConnected = false;
// let _onRegisteredCallbacks = [];
// const REGISTERED_DELAY_MS = 800;
// // Guard untuk elak double-sync (connect event + setOnRegisteredCallback boleh fire serentak)
// let _syncScheduled = false;
// let _syncTimer = null;
//
// const FULL_SYNC_COOLDOWN_MS = 5 * 60 * 1000;
// let _lastFullSyncTime = 0;
//
// function runOnRegisteredCallback() {
//   _syncScheduled = false;
//   const now = Date.now();
//   if (now - _lastFullSyncTime < FULL_SYNC_COOLDOWN_MS) return;
//   _lastFullSyncTime = now;
//   const queue = _onRegisteredCallbacks.slice();
//   queue.forEach(cb => { if (typeof cb === 'function') cb(); });
// }
//
// function scheduleSyncOnConnect() {
//   // Batalkan timer lama jika ada — elak double sync
//   if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null; }
//   if (_syncScheduled) return;
//   _syncScheduled = true;
//   _syncTimer = setTimeout(() => {
//     _syncTimer = null;
//     if (socket.connected && isConnected) runOnRegisteredCallback();
//     else _syncScheduled = false;
//   }, REGISTERED_DELAY_MS);
// }
//
// if (!CLIENT_ID || !CLIENT_TOKEN) {
//   // eslint-disable-next-line no-console
//   console.warn(
//     '[cloudClient] CLIENT_ID atau CLIENT_TOKEN tiada dalam .env. Sambungan ke cloud mungkin gagal auth.'
//   );
// }
//
// const socket = io(CLOUD_URL);
//
// socket.on('connect', () => {
//   // eslint-disable-next-line no-console
//   console.log('[cloudClient] Connected to cloud', CLOUD_URL);
//   isConnected = true;
//
//   socket.emit('registerClient', {
//     clientId: CLIENT_ID,
//     authToken: CLIENT_TOKEN
//   });
//   scheduleSyncOnConnect();
// });
//
// socket.on('disconnect', reason => {
//   // eslint-disable-next-line no-console
//   console.log('[cloudClient] Disconnected from cloud:', reason);
//   isConnected = false;
//   // Batalkan pending sync supaya tidak fire selepas reconnect sebagai sync tambahan
//   if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null; }
//   _syncScheduled = false;
// });
//
// socket.on('connect_error', err => {
//   // eslint-disable-next-line no-console
//   console.error('[cloudClient] Connect error:', err.message || err);
// });
//
// socket.on('syncRequest', payload => {
//   // eslint-disable-next-line no-console
//   console.log('[cloudClient] syncRequest', payload);
// });
//
// async function uploadFile(actualFilePath, folder) {
//   const form = new FormData();
//   form.append('clientId', CLIENT_ID);
//   const filename = path.basename(actualFilePath);
//   form.append('file', fs.createReadStream(actualFilePath), { filename });
//   form.append('folder', folder);
//
//   const res = await axios.post(`${CLOUD_URL}/upload`, form, {
//     headers: {
//       'x-auth-token': CLIENT_TOKEN,
//       ...form.getHeaders()
//     }
//   });
//
//   return res.data;
// }
//
// async function deleteFile(fileName) {
//   const parts = fileName.split('/').filter(p => p); // buang empty string
//   const name = parts[parts.length - 1]; // ambil nama fail sahaja: 'doa_arwah.jpg'
//   const folder = parts.slice(0, -1).join('/'); // 'images/slideshow'
//
//   const res = await axios.delete(`${CLOUD_URL}/upload`, {
//     headers: {
//       'x-auth-token': CLIENT_TOKEN,
//       'Content-Type': 'application/json'
//     },
//     data: {
//       clientId: CLIENT_ID,
//       fileName: name,      // ✅ 'doa_arwah.jpg'
//       folder: folder       // ✅ 'images/slideshow' (optional, ikut keperluan server)
//     }
//   });
//
//   return res.data;
// }
//
// function ensureCloudConnection(timeoutMs = 1000) {
//   return new Promise((resolve, reject) => {
//     if (isConnected) {
//       return resolve(true);
//     }
//
//     const onConnect = () => {
//       clearTimeout(timer);
//       socket.off('connect_error', onError);
//       resolve(true);
//     };
//
//     const onError = err => {
//       clearTimeout(timer);
//       socket.off('connect', onConnect);
//       reject(err);
//     };
//
//     const timer = setTimeout(() => {
//       socket.off('connect', onConnect);
//       socket.off('connect_error', onError);
//       reject(new Error('Cloud connection timeout'));
//     }, timeoutMs);
//
//     socket.once('connect', onConnect);
//     socket.once('connect_error', onError);
//   });
// }
//
// async function sendAck(fileName, status = 'synced') {
//   const res = await axios.post(
//     `${CLOUD_URL}/ack`,
//     {
//       clientId: CLIENT_ID,
//       file: fileName,
//       status
//     },
//     {
//       headers: {
//         'Content-Type': 'application/json',
//         'x-auth-token': CLIENT_TOKEN
//       }
//     }
//   );
//
//   return res.data;
// }
//
// function setOnRegisteredCallback(cb) {
//   _onRegisteredCallbacks.push(cb);
//   if (isConnected && socket.connected) scheduleSyncOnConnect();
// }

// --- Stub (cloud offline) supaya konsumer lain tidak crash ---
const socket = {
  connected: false,
  on() {},
  once() {},
  off() {},
  emit() {},
};

async function uploadFile() { return null; }
async function deleteFile() { return null; }
async function sendAck() { return null; }
function setOnRegisteredCallback() {}
function ensureCloudConnection() {
  return Promise.reject(new Error('Cloud sync disabled (ipray-cloud offline)'));
}

module.exports = {
  socket,
  uploadFile,
  setOnRegisteredCallback,
  deleteFile,
  ensureCloudConnection,
  sendAck
};

