/**
 * Cloud Socket Service
 * Socket wrapper untuk cloud setting panel.
 * Ganti socket.js asal — connect ke cloud server, bukan nodejs.
 */

import { setSocket, getCurrentFileName } from "./state.js";
import { showNotification } from "./notification.js";
import * as TableUtils from "./table-utils.js";

let _socket = null;
let _requestCounter = 0;
const _pendingRequests = new Map();

const REQUEST_TIMEOUT_MS = 15000;
const CONNECT_WAIT_MS = 12000;

/** Event yang trigger sync ke local — overlay "Sedang sync dengan local" dipaparkan. */
const SYNC_EVENTS = ['cloud:data:update', 'cloud:data:insert', 'cloud:data:delete', 'cloud:file:save'];

let _syncOverlayCount = 0;

/** Panggil bila socket connect/reconnect — untuk proses antrian (e.g. image upload). */
const _onReconnectCallbacks = [];

export function registerOnReconnect(callback) {
  if (typeof callback === 'function') _onReconnectCallbacks.push(callback);
}

function runReconnectCallbacks() {
  _onReconnectCallbacks.forEach(cb => { try { cb(); } catch (e) { console.error('[cloud-socket] onReconnect callback error', e); } });
}

function generateRequestId() {
  return `req_${Date.now()}_${++_requestCounter}`;
}

function showSyncOverlay() {
  _syncOverlayCount++;
  const el = document.getElementById('sync-overlay');
  if (el) {
    el.style.display = 'flex';
    el.setAttribute('aria-hidden', 'false');
  }
}

function hideSyncOverlay() {
  _syncOverlayCount = Math.max(0, _syncOverlayCount - 1);
  if (_syncOverlayCount > 0) return;
  const el = document.getElementById('sync-overlay');
  if (el) {
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
  }
}

export function getCloudSocket() {
  return _socket;
}

/**
 * Tunggu socket bersambung (untuk elak ralat bila loadConfigData dll dipanggil sebelum connect).
 */
function waitForConnection() {
  if (_socket && _socket.connected) return Promise.resolve();
  if (!_socket) return Promise.reject(new Error('Socket not initialized'));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Socket connection timeout')), CONNECT_WAIT_MS);
    _socket.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

/**
 * Emit event ke cloud dan tunggu cloud:response dengan requestId yang sama.
 * Tunggu sambungan dulu jika socket belum connected.
 * Bila event ialah sync (update/insert/delete/file:save), overlay "Sedang sync dengan local" dipaparkan sehingga selesai.
 * @returns {Promise<object>} response data
 */
export function emitWithResponse(event, payload = {}) {
  const promise = waitForConnection().then(() => {
    return new Promise((resolve, reject) => {
      const requestId = generateRequestId();
      const fullPayload = { ...payload, requestId };

      const timer = setTimeout(() => {
        _pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, REQUEST_TIMEOUT_MS);

      _pendingRequests.set(requestId, { resolve, reject, timer });
      _socket.emit(event, fullPayload);
    });
  });
  if (SYNC_EVENTS.includes(event)) {
    showSyncOverlay();
    return promise.finally(hideSyncOverlay);
  }
  return promise;
}

/**
 * Helper: ganti fetch() GET calls — emit cloud:data:get dan return parsed data.
 * Signature serupa fetch response supaya mudah ganti.
 */
export async function fetchData(fileName) {
  const result = await emitWithResponse('cloud:data:get', { fileName });
  return result;
}

/**
 * Helper: ganti fetch() GET raw file
 */
export async function fetchFile(fileName) {
  const result = await emitWithResponse('cloud:file:get', { fileName });
  return result;
}

export function updateConnectionStatus(isConnected) {
  const statusEl = document.getElementById("connection-status");
  if (!statusEl) return;

  const statusDot =
    document.getElementById("status-dot") || statusEl.previousElementSibling;

  if (isConnected) {
    statusEl.textContent = "Connected (Cloud)";
    if (statusDot) {
      statusDot.classList.remove("bg-red-500", "bg-amber-500");
      statusDot.classList.add("bg-green-500", "animate-pulse");
      statusDot.style.background = "#22c55e";
    }
  } else {
    statusEl.textContent = "Disconnected";
    if (statusDot) {
      statusDot.classList.remove("bg-green-500", "animate-pulse", "bg-amber-500");
      statusDot.classList.add("bg-red-500");
      statusDot.style.background = "#ef4444";
    }
  }
}

export function updateReconnectingStatus(attempt) {
  const statusEl = document.getElementById("connection-status");
  if (!statusEl) return;

  const statusDot =
    document.getElementById("status-dot") || statusEl.previousElementSibling;

  statusEl.textContent = `Reconnecting... (percubaan ${attempt})`;
  if (statusDot) {
    statusDot.classList.remove("bg-red-500", "bg-green-500", "animate-pulse");
    statusDot.classList.add("bg-amber-500");
    statusDot.style.background = "#f59e0b";
  }
}

/**
 * Kemas kini penunjuk sambungan Local (kiosk/nodejs client) dengan cloud.
 * @param {boolean} connected - true jika kiosk bersambung ke cloud
 */
export function updateLocalConnectionStatus(connected) {
  const statusEl = document.getElementById("local-status");
  if (!statusEl) return;

  const statusDot = document.getElementById("local-status-dot");

  if (connected) {
    statusEl.textContent = "Local: Connected";
    if (statusDot) {
      statusDot.classList.remove("bg-red-500", "bg-amber-500");
      statusDot.classList.add("bg-green-500", "animate-pulse");
      statusDot.style.background = "#22c55e";
    }
  } else {
    statusEl.textContent = "Local: Disconnected";
    if (statusDot) {
      statusDot.classList.remove("bg-green-500", "animate-pulse", "bg-amber-500");
      statusDot.classList.add("bg-red-500");
      statusDot.style.background = "#ef4444";
    }
  }
}

/**
 * Putuskan socket sedia ada dan sambung semula dengan config terkini (e.g. selepas tukar client).
 */
export function reconnectSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
  initSocket();
}

export function initSocket() {
  const SOCKET_URL = window.Config.SOCKET_URL;
  const CLIENT_ID = window.Config.CLIENT_ID;
  const CLIENT_TOKEN = window.Config.CLIENT_TOKEN;

  const socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
  });

  _socket = socket;

  socket.on("connect", () => {
    console.log("✅ Cloud Socket connected");
    updateConnectionStatus(true);
    runReconnectCallbacks();

    socket.emit("registerSettingPanel", {
      clientId: CLIENT_ID,
      authToken: CLIENT_TOKEN
    });
    setTimeout(() => {
      if (socket.connected) socket.emit("getLocalStatus");
    }, 800);

    // Snapshot status livestream semasa (untuk page/panel ikut mode play/stop selepas reload).
    setTimeout(() => {
      if (socket.connected) socket.emit("cloud:live:status");
    }, 900);

    // Snapshot status kematian semasa (untuk status/button ikut aktif/tidak aktif selepas reload).
    setTimeout(() => {
      if (socket.connected) socket.emit("cloud:kematian:status");
    }, 950);
  });

  socket.on("disconnect", () => {
    console.log("❌ Cloud Socket disconnected");
    updateConnectionStatus(false);
  });

  socket.on("reconnect_attempt", (attempt) => {
    console.log(`🔄 Reconnecting... percubaan ${attempt}`);
    updateReconnectingStatus(attempt);
  });

  socket.on("reconnect", () => {
    console.log("✅ Cloud Socket reconnected");
    updateConnectionStatus(true);
    runReconnectCallbacks();

    socket.emit("registerSettingPanel", {
      clientId: CLIENT_ID,
      authToken: CLIENT_TOKEN
    });
    setTimeout(() => {
      if (socket.connected) socket.emit("getLocalStatus");
    }, 800);

    // Snapshot status livestream semasa selepas reconnect.
    setTimeout(() => {
      if (socket.connected) socket.emit("cloud:live:status");
    }, 900);

    // Snapshot status kematian semasa selepas reconnect.
    setTimeout(() => {
      if (socket.connected) socket.emit("cloud:kematian:status");
    }, 950);
  });

  socket.on("connect_error", (error) => {
    console.error("Cloud Socket connection error:", error);
    updateConnectionStatus(false);
  });

  socket.on("local:status", (payload) => {
    const connected = payload && payload.connected === true;
    // console.log("[ipray-cloud] Connection dengan Local (kiosk):", connected ? "Connected" : "Disconnected");
    updateLocalConnectionStatus(connected);
  });

  socket.on("cloud:response", (payload) => {
    const { requestId } = payload || {};
    if (!requestId) return;

    const pending = _pendingRequests.get(requestId);
    if (!pending) return;

    _pendingRequests.delete(requestId);
    clearTimeout(pending.timer);

    if (payload.success) {
      pending.resolve(payload.data || {});
    } else {
      pending.reject(new Error(payload.error || 'Unknown error'));
    }
  });

  socket.on("data:updated", (data) => {
    const currentFileName = getCurrentFileName();
    const isBackgroundMode =
      typeof window !== "undefined" &&
      window.__BACKGROUND_MODE__ === true &&
      currentFileName === "images" &&
      typeof window.loadBackgroundTable === "function";

    if (isBackgroundMode) {
      window.loadBackgroundTable();
    } else if (data.fileName) {
      TableUtils.reloadTbody(data.fileName);
    }
  });

  socket.on("hebahan:updated", () => {
    if (document.getElementById("hebahan-tbody")) {
      TableUtils.reloadTbody("hebahan");
    }
  });

  socket.on("setting:ack", () => {
    showNotification("Paparan telah dikemaskini", "success");
  });

  socket.on("live:started", () => {
    if (typeof window.updateLivestreamPlayState === "function") window.updateLivestreamPlayState(true);
  });
  socket.on("live:stopped", () => {
    if (typeof window.updateLivestreamPlayState === "function") window.updateLivestreamPlayState(false);
  });

  // Kematian status realtime/snapshot
  socket.on("kematian:updated", (data) => {
    if (typeof window.updateKematianStatus === "function") window.updateKematianStatus(true, data);
    try {
      const setVal = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = String(v); };
      setVal("kematian-nama", data?.nama || "");
      setVal("kematian-tempat", data?.tempatJenazah || "");
      setVal("kematian-solat", data?.masaSolat || "");
      const infoEl = document.getElementById("kematian-info");
      if (infoEl && data?.maklumatTambahan != null) infoEl.value = String(data.maklumatTambahan);
      const durasiEl = document.getElementById("kematian-durasi");
      if (durasiEl) {
        const ds = data?.durasiSaat;
        const n = typeof ds === "number" ? ds : parseInt(ds || "0", 10);
        durasiEl.value = (!isNaN(n) && n > 0) ? String(Math.round(n / 60)) : "0";
      }
    } catch (_) {}
  });
  socket.on("kematian:cleared", () => {
    if (typeof window.updateKematianStatus === "function") window.updateKematianStatus(false);
  });

  socket.on("data:ack", () => {
    showNotification("Paparan telah dikemaskini", "success");
  });

  socket.on("hls:playlistReady", () => {
    showNotification("Playlist HLS (index.m3u8) berjaya dicipta. Siaran sedia.", "success");
  });
  socket.on("hls:error", (data) => {
    showNotification("HLS: " + (data?.message || "Ralat"), "error");
  });

  setSocket(socket);
}

if (typeof window !== "undefined") {
  window.SocketUtils = {
    initSocket,
    reconnectSocket,
    updateConnectionStatus,
    updateReconnectingStatus,
    updateLocalConnectionStatus,
  };
  
  window.CloudSocket = {
    emitWithResponse,
    fetchData,
    fetchFile,
    getCloudSocket,
  };
}
