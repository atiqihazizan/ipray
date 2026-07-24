/**
 * Logger ringkas — label [LEVEL][tag] konsisten, ASCII sahaja (elak emoji jadi
 * rosak "ð¡" dsb bila PM2 tulis ke fail log — pernah disahkan berlaku pada log
 * produksi sebenar). PM2 sendiri dah tambah timestamp (ecosystem.config.js:
 * time:true) — jangan tambah timestamp sendiri di sini, elak bertindih.
 */

function info(tag, ...args) {
  console.log(`[INFO][${tag}]`, ...args);
}

function warn(tag, ...args) {
  console.warn(`[WARN][${tag}]`, ...args);
}

function error(tag, ...args) {
  console.error(`[ERROR][${tag}]`, ...args);
}

/** Log event dari client (browser kiosk) — dihantar melalui socket event 'client:log'. */
function client(clientTag, event, detail) {
  console.log(`[CLIENT][${clientTag}] ${event}`, detail !== undefined && detail !== null && detail !== '' ? detail : '');
}

module.exports = { info, warn, error, client };
