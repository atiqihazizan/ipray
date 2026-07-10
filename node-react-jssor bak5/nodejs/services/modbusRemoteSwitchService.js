/**
 * Kawalan suis skrin melalui TCP ASCII (contoh HF2211/ATEN: "sw i03" + carriage return \r sahaja).
 * Konfigurasi IP|port dalam fail data modbus-remote.txt (nama logik: modbus-remote).
 */

const net = require('net');

const FILE_KEY = 'modbus-remote';
const CONNECT_TIMEOUT_MS = 4000;
const COMMAND_TIMEOUT_MS = 8000;
/** Selepas hantar: tunggu chunk `data` pertama; jika tiada dalam tempoh ini, tutup dan anggap OK. */
const REPLY_IDLE_MS = 2000;

let dataService = null;
let lastKioskSlideIndex = 0;

function init(config) {
  dataService = config && config.dataService ? config.dataService : null;
}

function setKioskSlideIndex(index) {
  const n = typeof index === 'number' ? index : parseInt(index, 10);
  if (!Number.isNaN(n) && n >= 0) {
    lastKioskSlideIndex = n;
  }
}

function getKioskSlideIndex() {
  return lastKioskSlideIndex;
}

/**
 * Bina baris arahan — boleh dikembangkan dengan placeholder skrin kemudian.
 * @param {number} switchIndex 1..4
 */
function buildCommandLine(switchIndex) {
  const n = Math.max(1, Math.min(4, parseInt(switchIndex, 10) || 1));
  const nn = String(n).padStart(2, '0');
  return `sw i${nn}\r`;
}

function parseConfigContent(content) {
  const lines = (content || '').split(/\r?\n/);
  const line = lines.map(l => l.trim()).find(l => l && !l.startsWith('#'));
  if (!line) return null;
  const parts = line.split('|').map(p => p.trim());
  const host = parts[0] || '';
  let port = parts.length > 1 ? parseInt(parts[1], 10) : 502;
  if (!host) return null;
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error('Port tidak sah (1–65535)');
  }
  return { host, port };
}

async function loadConfig() {
  if (!dataService) {
    throw new Error('Perkhidmatan data tidak diinit');
  }
  const content = await dataService.readFile(FILE_KEY).catch(() => '');
  return parseConfigContent(content);
}

/**
 * @param {string} host
 * @param {number|string} port
 */
async function saveConfig(host, port) {
  if (!dataService) {
    throw new Error('Perkhidmatan data tidak diinit');
  }
  const h = String(host || '').trim();
  const p = parseInt(port, 10);
  if (!h) {
    throw new Error('Alamat IP/host diperlukan');
  }
  if (Number.isNaN(p) || p < 1 || p > 65535) {
    throw new Error('Port tidak sah (1–65535)');
  }
  const content = `${h}|${p}\n`;
  await dataService.writeFile(FILE_KEY, content);
  return { host: h, port: p };
}

function testConnection() {
  return new Promise(async (resolve, reject) => {
    let cfg;
    try {
      cfg = await loadConfig();
    } catch (e) {
      return reject(e);
    }
    if (!cfg) {
      return reject(new Error('modbus-remote.txt kosong atau tiada host — simpan IP|port dahulu'));
    }
    const client = net.createConnection({ host: cfg.host, port: cfg.port });
    const timer = setTimeout(() => {
      client.destroy();
      reject(new Error('Timeout sambungan TCP'));
    }, CONNECT_TIMEOUT_MS);

    client.on('connect', () => {
      clearTimeout(timer);
      client.end();
      resolve({ ok: true, host: cfg.host, port: cfg.port });
    });
    client.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * @param {number} switchIndex 1..4
 */
function sendSwitchCommand(switchIndex) {
  return new Promise(async (resolve, reject) => {
    let cfg;
    try {
      cfg = await loadConfig();
    } catch (e) {
      return reject(e);
    }
    if (!cfg) {
      return reject(new Error('modbus-remote.txt kosong — simpan IP|port dahulu'));
    }
    const payload = buildCommandLine(switchIndex);
    const buf = Buffer.from(payload, 'ascii');
    const sentDisplay = payload.replace(/\r$/, '').trim();

    const client = net.createConnection({ host: cfg.host, port: cfg.port });
    let finished = false;
    let idleTimer = null;

    const fail = err => {
      if (finished) return;
      finished = true;
      if (idleTimer) clearTimeout(idleTimer);
      client.destroy();
      reject(err);
    };

    const timer = setTimeout(() => {
      fail(new Error('Timeout menghantar arahan'));
    }, COMMAND_TIMEOUT_MS);

    const finishOk = (reply) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (idleTimer) clearTimeout(idleTimer);
      client.destroy();
      resolve({
        sent: sentDisplay,
        reply: reply != null && String(reply).length > 0 ? String(reply).trim() : null,
        lastSlideIndex: lastKioskSlideIndex
      });
    };

    client.on('connect', () => {
      client.write(buf, err => {
        if (err) {
          clearTimeout(timer);
          return fail(err);
        }

        client.once('data', (data) => {
          if (finished) return;
          if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
          }
          finishOk(data.toString());
        });

        idleTimer = setTimeout(() => {
          idleTimer = null;
          if (finished) return;
          finishOk(null);
        }, REPLY_IDLE_MS);
      });
    });
    client.on('error', err => {
      clearTimeout(timer);
      fail(err);
    });
  });
}

module.exports = {
  init,
  loadConfig,
  saveConfig,
  testConnection,
  sendSwitchCommand,
  setKioskSlideIndex,
  getKioskSlideIndex,
  buildCommandLine
};
