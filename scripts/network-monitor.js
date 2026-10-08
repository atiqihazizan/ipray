#!/usr/bin/env node
/**
 * network-monitor.js — Pemantau rangkaian kiosk (WiFi ↔ Hotspot)
 *
 * Dipasang di kiosk sebagai ~/network-monitor/network-monitor.js oleh
 * scripts/kiosk-install.sh dan dipacu oleh systemd user timer
 * (ipray-network-monitor.timer) setiap ~30s, plus dipanggil oleh
 * apiServerService untuk tindakan manual (connect-now, enable/disable hotspot).
 *
 * Subarahan:
 *   tick                          kitaran pemantau (default)
 *   connect-now <conName>         aliran "Sambung WiFi sekarang" (~45s)
 *   scan                          imbasan hidup iw + simpan cache, output JSON
 *   status                        output JSON status semasa (dibaca API)
 *   enable-hotspot [--hold <min>] naikkan hotspot + tetapkan "tahan" pemantau
 *   disable-hotspot               turunkan hotspot + kosongkan tahan
 *
 * Keadaan & cache: ~/network-monitor/state.json, scan-cache.json, netmon.lock
 * Log:            ~/kiosk/logs/network-monitor.log (putaran ~500 baris)
 * Tunables boleh dilaras via ~/kiosk/data/config.txt (lihat loadTunables).
 */

'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// -----------------------------------------------------------
// Laluan & konstanta (nilai lalai; override via config.txt NETMON_*)
// -----------------------------------------------------------
const HOME = os.homedir();
const DIR = path.join(HOME, 'network-monitor');
const STATE_FILE = path.join(DIR, 'state.json');
const SCAN_CACHE = path.join(DIR, 'scan-cache.json');
const LOCK_FILE = path.join(DIR, 'netmon.lock');
const LOG_FILE = path.join(HOME, 'kiosk', 'logs', 'network-monitor.log');
const CONFIG_TXT = process.env.KIOSK_CONFIG_TXT || path.join(HOME, 'kiosk', 'data', 'config.txt');

const IFACE = 'wlan0';
const HOTSPOT_PROFILE = 'ipray-hotspot';

const IW = '/usr/sbin/iw';            // /usr/sbin tidak dalam PATH cron/service
const NMCLI = '/usr/bin/nmcli';
const SUDO = '/usr/bin/sudo';

// Sambungan dibuat melalui WiFi yang sama yang dipantau — sebarang tindakan
// yang mengubah wlan0 boleh memutuskan sesi admin. Semua arahan di sini
// direka untuk dipanggil melalui flow yang telah ada watchdog/restore.
function sh(file, args, timeout = 15000) {
  try {
    const out = execFileSync(file, args, { timeout, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + (e.stderr || ''), err: String(e.message || e) };
  }
}
const nmcli = (args, t) => sh(SUDO, ['-n', NMCLI, ...args], t);
const iw = (args, t) => sh(SUDO, ['-n', IW, ...args], t);

// -----------------------------------------------------------
// Log dengan putaran ringkas (ikut corak health-check.sh)
// -----------------------------------------------------------
const MAX_LOG_LINES = 500;
function log(msg) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    if (fs.existsSync(LOG_FILE) && fs.readFileSync(LOG_FILE, 'utf8').split('\n').length >= MAX_LOG_LINES) {
      const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n');
      fs.writeFileSync(LOG_FILE, lines.slice(-200).join('\n'));
    }
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (_) { /* log gagal — jangan ganggu pemantau */ }
}

// -----------------------------------------------------------
// Fail keadaan (atomic: tmp + rename — tahan putus kuasa)
// -----------------------------------------------------------
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (_) { return {}; }
}
function saveState(s) {
  s.updatedAt = Date.now();
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}

// Lock bersama flock — tick baru skip jika tick/connect-now lain sedang jalan.
// flock(2) pada fd diwarisi anak melalui stdio fd slot 3; lock kekal sehingga
// fd di sini ditutup (atau proses tamat). Fallback: O_EXCL lockfile (macOS dsb).
function withLock(fn) {
  const EXCL = LOCK_FILE + '.excl';
  let locked = false, fd = null;
  try {
    fd = fs.openSync(LOCK_FILE, 'w');
    // Lock utama: flock pada fd yang diwarisi anak (stdio slot 3)
    execFileSync('/usr/bin/flock', ['-n', '3', '/bin/true'], {
      timeout: 3000, stdio: ['ignore', 'ignore', 'ignore', fd],
    });
    locked = true;
  } catch (e) {
    // ENOENT = flock binary tiada → fallback lockfile O_EXCL.
    // Exit code bukan-sifar = lock dipegang proses lain → skip sahaja.
    if (e.code !== 'ENOENT') { fs.closeSync(fd); return null; }
    locked = tryExclLock();
    if (!locked) {
      // Buang lockfile stale (pemilik sudah mati), cuba sekali lagi
      try {
        const pid = parseInt(fs.readFileSync(EXCL, 'utf8'), 10);
        if (Number.isFinite(pid)) { try { process.kill(pid, 0); } catch (_) { fs.unlinkSync(EXCL); locked = tryExclLock(); } }
      } catch (_) { /* ignore */ }
    }
  }
  if (!locked) { if (fd !== null) fs.closeSync(fd); return null; }
  try {
    return fn();
  } finally {
    if (fd !== null) fs.closeSync(fd);
    try { fs.unlinkSync(EXCL); } catch (_) { /* ignore */ }
  }
}
function tryExclLock() {
  try {
    const lfd = fs.openSync(LOCK_FILE + '.excl', 'wx');
    fs.writeSync(lfd, String(process.pid));
    fs.closeSync(lfd);
    return true;
  } catch (_) { return false; }
}

// -----------------------------------------------------------
// Tunables dari config.txt (format KEY|VALUE)
// -----------------------------------------------------------
function loadTunables() {
  const cfg = {};
  try {
    for (const line of fs.readFileSync(CONFIG_TXT, 'utf8').split('\n')) {
      const m = line.trim().match(/^([A-Z0-9_]+)\|(.*)$/);
      if (m) cfg[m[1]] = m[2].trim();
    }
  } catch (_) { /* config.txt tiada — guna default */ }
  const num = (k, d) => (Number.isFinite(parseInt(cfg[k], 10)) ? parseInt(cfg[k], 10) : d);
  return {
    failMs: num('NETMON_FAIL_MS', 3 * 60 * 1000),          // ke hotspot selepas 3 min gagal berturut
    retryMs: num('NETMON_RETRY_MS', 5 * 60 * 1000),        // cuba semula WiFi tiap 5 min (tiada klien)
    holdMs: num('NETMON_HOLD_MS', 30 * 60 * 1000),         // tahan lalai manual "Hidupkan hotspot"
    connectTimeoutMs: num('NETMON_CONNECT_TIMEOUT_MS', 45 * 1000), // had connect-now
    scanIntervalMs: num('NETMON_SCAN_INTERVAL_MS', 5 * 60 * 1000), // imbas berkala dalam mod wifi
    internetCheck: cfg.NETMON_INTERNET_CHECK !== '0',      // 0 = tutup semakan internet (kiosk tanpa internet)
    noneGraceMs: num('NETMON_NONE_GRACE_MS', 90 * 1000),   // tempoh 'none' sebelum paksa hotspot
  };
}

// -----------------------------------------------------------
// Helper NetworkManager / iw
// -----------------------------------------------------------
// Nama connection aktif pada wlan0 (802-11-wireless), atau null
function activeConnection() {
  const r = nmcli(['-t', '-f', 'NAME,DEVICE,TYPE', 'connection', 'show', '--active']);
  if (!r.ok) return null;
  for (const line of r.out.split('\n')) {
    const p = line.split(':');
    if (p[1] === IFACE && p[2] === '802-11-wireless') return p[0];
  }
  return null;
}

// SSID aktif + isyarat (dBm) dalam mod wifi
function linkInfo() {
  const r = iw(['dev', IFACE, 'link']);
  if (!r.ok || /Not connected/.test(r.out)) return null;
  const ssid = (r.out.match(/SSID:\s*(.+)/) || [])[1];
  const sig = (r.out.match(/signal:\s*(-?\d+)\s*dBm/) || [])[1];
  return { ssid: ssid ? ssid.trim() : null, signalDbm: sig ? parseInt(sig, 10) : null };
}

// IP wlan0 (mod apa pun)
function ifaceIp() {
  const r = sh('/usr/sbin/ip', ['-4', '-o', 'addr', 'show', IFACE]);
  const m = r.out && r.out.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

// Bilangan klien pada hotspot (station dump sah dalam mod AP)
function hotspotClients() {
  const r = iw(['dev', IFACE, 'station', 'dump']);
  if (!r.ok) return 0;
  return (r.out.match(/^Station /gm) || []).length;
}

// Pemeriksaan internet: gagal hanya jika SEMUA sasaran gagal
function checkInternet() {
  const ping = (host) => sh('/usr/bin/ping', ['-c1', '-W2', '-I', IFACE, host], 5000).ok;
  if (ping('1.1.1.1')) return true;
  if (ping('8.8.8.8')) return true;
  // Probe ketiga via NM connectivity check (HTTP)
  const r = nmcli(['networking', 'connectivity', 'check'], 10000);
  return r.ok && /full/i.test(r.out);
}

// Imbasan hidup (berfungsi dalam mod AP — disahkan di kiosk). Pulangkan
// senarai rangkaian dan simpan cache untuk sandaran.
function doScan() {
  const r = iw(['dev', IFACE, 'scan'], 20000);
  if (!r.ok) return { ok: false, error: r.err || r.out.trim() };
  const nets = {};
  const blocks = r.out.split(/^BSS /m).slice(1);
  for (const b of blocks) {
    const ssid = (b.match(/SSID:\s*(.*)/) || [])[1];
    if (!ssid || !ssid.trim()) continue; // hidden SSID tidak disokong
    const freq = parseInt((b.match(/freq:\s*(\d+)/) || [])[1] || '0', 10);
    const sig = parseFloat((b.match(/signal:\s*(-?[\d.]+)/) || [])[1] || '-999');
    const secure = /capability:.*Privacy/i.test(b) || /RSN:/.test(b) || /WPA:/.test(b);
    const cur = nets[ssid];
    if (!cur || sig > cur.signalDbm) {
      nets[ssid] = {
        ssid,
        signalDbm: sig,
        signalPct: Math.max(0, Math.min(100, Math.round(2 * (sig + 100)))),
        freqMHz: freq,
        channel: freqToChannel(freq),
        security: secure ? 'Secured' : 'Open',
      };
    }
  }
  const networks = Object.values(nets).sort((a, b) => b.signalDbm - a.signalDbm);
  const payload = { scannedAt: new Date().toISOString(), networks };
  fs.writeFileSync(SCAN_CACHE, JSON.stringify(payload, null, 2));
  return { ok: true, ...payload };
}
function freqToChannel(f) {
  if (f === 2484) return 14;
  if (f >= 2412 && f <= 2472) return (f - 2407) / 5;
  if (f >= 5000 && f <= 5900) return (f - 5000) / 5;
  return 0;
}
function loadScanCache() {
  try { return JSON.parse(fs.readFileSync(SCAN_CACHE, 'utf8')); } catch (_) { return null; }
}

// Pastikan profil hotspot wujud — cipta dengan sifat betul (priority rendah,
// band bg channel 6, shared IPv4) jika tiada. SSID/PSK kekal default sedia ada.
function ensureHotspotProfile() {
  const r = nmcli(['-t', '-f', 'NAME', 'connection', 'show']);
  if (r.ok && r.out.split('\n').includes(HOTSPOT_PROFILE)) return true;
  const add = nmcli(['connection', 'add', 'type', 'wifi', 'ifname', IFACE,
    'con-name', HOTSPOT_PROFILE, 'autoconnect', 'yes',
    'connection.autoconnect-priority', '-999',
    'ssid', 'iPray-Hotspot', 'mode', 'ap',
    '802-11-wireless.band', 'bg', '802-11-wireless.channel', '6',
    // PSK mesti kekal sama dengan HOTSPOT_DEFAULTS di apiServerService.js
    'wifi-sec.key-mgmt', 'wpa-psk', 'wifi-sec.psk', 'ipray2026',
    'ipv4.method', 'shared'], 20000);
  if (!add.ok) { log(`ensureHotspotProfile: cipta gagal — ${add.err || add.out}`); return false; }
  log('ensureHotspotProfile: profil ipray-hotspot dicipta');
  return true;
}

function upHotspot() {
  if (!ensureHotspotProfile()) return { ok: false, err: 'profil hotspot tidak wujud/gagal dicipta' };
  return nmcli(['connection', 'up', HOTSPOT_PROFILE], 30000);
}
function downConnection(name) {
  return nmcli(['connection', 'down', name], 20000);
}

// -----------------------------------------------------------
// Subarahan
// -----------------------------------------------------------

// tick — satu kitaran pemantau (dipacu timer ~30s)
function cmdTick(tun) {
  const now = Date.now();
  const state = loadState();
  // connect-now memegang lock yang sama — sampai sini bermakna tiada attempt aktif.
  // Bersihkan penanda stale jika ada (cth proses connect-now terbunuh).
  if (state.connectNowInProgress && now - state.connectNowInProgress > 3 * 60 * 1000) {
    state.connectNowInProgress = null;
    log('tick: connectNowInProgress stale (>3min) — dibersihkan');
  }

  const active = activeConnection();
  const mode = active === HOTSPOT_PROFILE ? 'hotspot' : (active ? 'wifi' : 'none');
  state.mode = mode;
  state.lastCheckAt = now;

  if (mode === 'wifi') {
    const ok = tun.internetCheck ? checkInternet() : true;
    if (ok) {
      if (state.failSince) log('tick: WiFi+internet pulih — reset failSince');
      state.failSince = null;
      state.noneSince = null;
      // Imbasan berkala dalam mod WiFi (radio dalam mod managed — paling bersih)
      if (!state.lastScanAt || now - state.lastScanAt > tun.scanIntervalMs) {
        const s = doScan();
        if (s.ok) state.lastScanAt = now;
      }
      saveState(state);
      return;
    }
    // WiFi putus ATAU internet tiada — mula/lanjutkan kiraan gagal
    if (!state.failSince) {
      state.failSince = now;
      log(`tick: kegagalan bermula (wifi="${active}", internet=${tun.internetCheck ? 'check' : 'skip'})`);
    }
    if (now - state.failSince >= tun.failMs) {
      log(`tick: gagal ${Math.round((now - state.failSince) / 1000)}s >= had — bertukar ke hotspot`);
      const s = doScan(); if (s.ok) state.lastScanAt = now; // senarai segar sebelum tinggalkan mod wifi
      downConnection(active);
      const up = upHotspot();
      state.mode = 'hotspot';
      state.failSince = null;
      state.lastSwitchReason = 'wifi-putus-atau-tiada-internet';
      log(`tick: hotspot ${up.ok ? 'aktif' : 'GAGAL: ' + (up.err || up.out)}`);
    }
    saveState(state);
    return;
  }

  if (mode === 'hotspot') {
    state.noneSince = null;
    // Tahan manual — jangan cuba WiFi
    if (state.holdUntil && now < state.holdUntil) {
      state.lastSwitchReason = `tahan-manual-hingga-${new Date(state.holdUntil).toISOString()}`;
      saveState(state);
      return;
    }
    // Ada klien pada hotspot — tangguhkan percubaan
    const clients = hotspotClients();
    if (clients > 0) {
      state.deferredClients = clients;
      saveState(state);
      return;
    }
    state.deferredClients = 0;
    if (state.lastTryAt && now - state.lastTryAt < tun.retryMs) {
      saveState(state);
      return;
    }
    // Cuba kembali ke WiFi tersimpan (NM autoconnect pilih profil berpriority tinggi)
    state.lastTryAt = now;
    log('tick: cuba kembali ke WiFi (tiada klien pada hotspot)');
    const s = doScan(); // imbasan hidup berfungsi dalam mod AP — kemas kini cache
    if (s.ok) state.lastScanAt = now;
    downConnection(HOTSPOT_PROFILE);
    // Tunggu autoconnect sehingga ~25s — kira SELEPAS down (imbasan boleh makan masa)
    const deadline = Date.now() + 25000;
    let conn = null;
    while (Date.now() < deadline) {
      const st = nmcli(['-t', '-f', 'GENERAL.STATE', 'device', 'show', IFACE]);
      if (st.ok && /\(connected\)/.test(st.out) && activeConnection() !== HOTSPOT_PROFILE) { conn = activeConnection(); break; }
      execFileSync('/bin/sleep', ['2']);
    }
    const inet = conn && (tun.internetCheck ? checkInternet() : true);
    if (conn && inet) {
      state.mode = 'wifi';
      state.lastSwitchReason = 'auto-kembali-wifi';
      state.failSince = null;
      log(`tick: berjaya kembali ke WiFi "${conn}"`);
    } else {
      const up = upHotspot();
      state.lastSwitchReason = conn ? 'retry-wifi-tiada-internet' : 'retry-wifi-gagal';
      log(`tick: cubaan WiFi gagal (${state.lastSwitchReason}) — hotspot ${up.ok ? 'dikembalikan' : 'GAGAL dinaikkan'}`);
    }
    saveState(state);
    return;
  }

  // mode 'none' — tiada sambungan aktif (cth lepas boot sebelum autoconnect stabil)
  if (!state.noneSince) state.noneSince = now;
  if (now - state.noneSince >= tun.noneGraceMs) {
    log('tick: tiada sambungan — paksa naik hotspot');
    const up = upHotspot();
    state.mode = up.ok ? 'hotspot' : 'none';
    state.lastSwitchReason = 'tiada-sambungan-auto-hotspot';
    if (up.ok) state.noneSince = null;
  }
  saveState(state);
}

// connect-now <conName> — matikan hotspot, aktifkan profil WiFi, semak internet.
// Semua dalam satu proses dengan lock; hasil disimpan dalam state.
function cmdConnectNow(conName, tun) {
  const state = loadState();
  const now = Date.now();
  state.connectNowInProgress = now;
  saveState(state);
  log(`connect-now: mula — profil "${conName}"`);

  const finish = (ok, reason) => {
    const s = loadState();
    s.connectNowInProgress = null;
    s.lastConnectNow = { at: Date.now(), profile: conName, ok, reason };
    if (ok) { s.mode = 'wifi'; s.failSince = null; s.lastSwitchReason = 'connect-now-berjaya'; }
    saveState(s);
    log(`connect-now: ${ok ? 'BERJAYA' : 'GAGAL'} — ${reason}`);
  };

  const active = activeConnection();
  if (active) downConnection(active);
  const up = nmcli(['-w', String(Math.ceil(tun.connectTimeoutMs / 1000)), 'connection', 'up', conName], tun.connectTimeoutMs + 10000);
  if (!up.ok) {
    upHotspot();
    return finish(false, `aktivasi gagal: ${(up.err || up.out || '').slice(0, 200)}`);
  }
  // Tunggu sehingga benar-benar connected + internet
  const deadline = Date.now() + tun.connectTimeoutMs;
  while (Date.now() < deadline) {
    if (activeConnection() === conName && (tun.internetCheck ? checkInternet() : true)) {
      return finish(true, 'disambung + internet OK');
    }
    execFileSync('/bin/sleep', ['2']);
  }
  upHotspot();
  finish(false, 'disambung tetapi tiada internet / tamat masa');
}

// status — JSON untuk /api/wifi/status
function cmdStatus(tun) {
  const state = loadState();
  const active = activeConnection();
  const mode = active === HOTSPOT_PROFILE ? 'hotspot' : (active ? 'wifi' : 'none');
  const link = mode === 'wifi' ? linkInfo() : null;
  const clients = mode === 'hotspot' ? hotspotClients() : 0;
  const cache = loadScanCache();
  const out = {
    mode,
    connectionName: active,
    ssid: link ? link.ssid : (mode === 'hotspot' ? 'iPray-Hotspot' : null),
    ip: ifaceIp(),
    signalDbm: link ? link.signalDbm : null,
    hotspotClients: clients,
    holdActive: !!(state.holdUntil && Date.now() < state.holdUntil),
    holdUntil: state.holdUntil || null,
    lastCheckAt: state.lastCheckAt || null,
    lastSwitchReason: state.lastSwitchReason || null,
    lastTryAt: state.lastTryAt || null,
    nextTryAt: state.lastTryAt ? state.lastTryAt + tun.retryMs : null,
    deferredClients: state.deferredClients || 0,
    connectNowInProgress: !!state.connectNowInProgress,
    lastConnectNow: state.lastConnectNow || null,
    lastScanAt: state.lastScanAt || null,
    cachedScanAt: cache ? cache.scannedAt : null,
    internetCheckEnabled: tun.internetCheck,
  };
  console.log(JSON.stringify(out));
}

// -----------------------------------------------------------
// Entry point
// -----------------------------------------------------------
function main() {
  fs.mkdirSync(DIR, { recursive: true });
  const tun = loadTunables();
  const [cmd, ...rest] = process.argv.slice(2);

  if (cmd === 'status') { cmdStatus(tun); return; }
  if (cmd === 'scan') {
    const s = doScan();
    console.log(JSON.stringify(s.ok ? { ok: true, scannedAt: s.scannedAt, networks: s.networks } : { ok: false, error: s.error }));
    process.exit(s.ok ? 0 : 1);
  }
  if (cmd === 'enable-hotspot') {
    const holdIdx = rest.indexOf('--hold');
    const holdMin = holdIdx >= 0 ? parseInt(rest[holdIdx + 1], 10) : NaN;
    const r = withLock(() => {
      if (!ensureHotspotProfile()) return { ok: false, error: `Profil "${HOTSPOT_PROFILE}" tidak wujud` };
      const active = activeConnection();
      if (active && active !== HOTSPOT_PROFILE) downConnection(active);
      const up = upHotspot();
      if (!up.ok) return { ok: false, error: up.err || up.out };
      const state = loadState();
      state.holdUntil = Date.now() + (Number.isFinite(holdMin) ? holdMin : tun.holdMs / 60000) * 60000;
      state.lastSwitchReason = 'manual-enable-hotspot';
      state.mode = 'hotspot';
      saveState(state);
      log(`enable-hotspot: aktif, tahan hingga ${new Date(state.holdUntil).toISOString()}`);
      return { ok: true, holdUntil: state.holdUntil };
    });
    console.log(JSON.stringify(r || { ok: false, error: 'sibuk — proses lain sedang berjalan' }));
    process.exit(r && r.ok ? 0 : 1);
  }
  if (cmd === 'disable-hotspot') {
    const r = withLock(() => {
      const state = loadState();
      state.holdUntil = null;
      saveState(state);
      const d = downConnection(HOTSPOT_PROFILE);
      log(`disable-hotspot: ${d.ok ? 'diturunkan' : 'gagal: ' + (d.err || d.out)}`);
      return { ok: true };
    });
    console.log(JSON.stringify(r || { ok: false, error: 'sibuk — proses lain sedang berjalan' }));
    process.exit(r && r.ok ? 0 : 1);
  }
  if (cmd === 'connect-now') {
    const conName = rest[0];
    if (!conName) { console.log(JSON.stringify({ ok: false, error: 'conName diperlukan' })); process.exit(2); }
    const r = withLock(() => { cmdConnectNow(conName, tun); return { ok: true }; });
    if (!r) { console.log(JSON.stringify({ ok: false, error: 'sibuk — pemantau/connect-now lain sedang berjalan' })); process.exit(1); }
    return;
  }
  // default: tick
  const ran = withLock(() => { cmdTick(tun); return true; });
  if (!ran) process.exit(0); // tick lain sedang berjalan — skip senyap
}

main();
