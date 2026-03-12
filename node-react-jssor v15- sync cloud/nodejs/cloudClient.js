require('dotenv').config();

const { io } = require('socket.io-client');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const CLIENT_ID = process.env.CLIENT_ID || false;
const CLIENT_TOKEN = process.env.CLIENT_TOKEN;
const CLOUD_URL = process.env.CLOUD_URL || 'http://localhost:4000';

console.log('[cloudClient] ENV:', CLIENT_ID, CLOUD_URL);

let isConnected = false;

if (!CLIENT_ID || !CLIENT_TOKEN) {
  // eslint-disable-next-line no-console
  console.warn(
    '[cloudClient] CLIENT_ID atau CLIENT_TOKEN tiada dalam .env. Sambungan ke cloud mungkin gagal auth.'
  );
}

const socket = io(CLOUD_URL);

socket.on('connect', () => {
  // eslint-disable-next-line no-console
  console.log('[cloudClient] Connected to cloud', CLOUD_URL);
  isConnected = true;

  socket.emit('registerClient', {
    clientId: CLIENT_ID,
    authToken: CLIENT_TOKEN
  });
});

socket.on('disconnect', reason => {
  // eslint-disable-next-line no-console
  console.log('[cloudClient] Disconnected from cloud:', reason);
  isConnected = false;
});

socket.on('connect_error', err => {
  // eslint-disable-next-line no-console
  console.error('[cloudClient] Connect error:', err.message || err);
});

socket.on('fileChanged', payload => {
  // Di sini tuan boleh trigger logic sync download dari cloud
  // eslint-disable-next-line no-console
  console.log('[cloudClient] fileChanged', payload);
});

socket.on('fileDeleted', payload => {
  // Di sini tuan boleh padam fail local yang berkaitan
  // eslint-disable-next-line no-console
  console.log('[cloudClient] fileDeleted', payload);
});

socket.on('syncRequest', payload => {
  // eslint-disable-next-line no-console
  console.log('[cloudClient] syncRequest', payload);
});

async function uploadFile(filePath) {
  const form = new FormData();
  form.append('clientId', CLIENT_ID);
  form.append('file', fs.createReadStream(filePath));

  const res = await axios.post(`${CLOUD_URL}/upload`, form, {
    headers: {
      'x-auth-token': CLIENT_TOKEN,
      ...form.getHeaders()
    }
  });

  return res.data;
}

function ensureCloudConnection(timeoutMs = 1000) {
  return new Promise((resolve, reject) => {
    if (isConnected) {
      return resolve(true);
    }

    const onConnect = () => {
      clearTimeout(timer);
      socket.off('connect_error', onError);
      resolve(true);
    };

    const onError = err => {
      clearTimeout(timer);
      socket.off('connect', onConnect);
      reject(err);
    };

    const timer = setTimeout(() => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
      reject(new Error('Cloud connection timeout'));
    }, timeoutMs);

    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
  });
}

async function sendAck(fileName, status = 'synced') {
  const res = await axios.post(
    `${CLOUD_URL}/ack`,
    {
      clientId: CLIENT_ID,
      file: fileName,
      status
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': CLIENT_TOKEN
      }
    }
  );

  return res.data;
}

module.exports = {
  socket,
  uploadFile,
  ensureCloudConnection,
  sendAck
};

