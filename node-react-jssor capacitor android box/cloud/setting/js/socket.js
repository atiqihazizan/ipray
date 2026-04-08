/**
 * Socket.IO Functions
 * Function untuk Socket.IO connection dan real-time updates
 */

import { setSocket, getCurrentFileName } from "./state.js";
import { showNotification } from "./notification.js";
import * as TableUtils from "./table-utils.js";

/**
 * Update connection status indicator
 * @param {boolean} isConnected - Status connection
 */
export function updateConnectionStatus(isConnected) {
  const statusEl = document.getElementById("connection-status");
  if (!statusEl) return;

  const statusDot =
    document.getElementById("status-dot") || statusEl.previousElementSibling;

  if (isConnected) {
    statusEl.textContent = "Connected";
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

/**
 * Tunjuk status sedang reconnect dan bilangan percubaan
 * @param {number} attempt - Nombor percubaan reconnect
 */
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
 * Initialize Socket.IO connection
 */
export function initSocket() {
  const SOCKET_URL = window.Config.SOCKET_URL;

  const socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
  });

  socket.on("connect", () => {
    console.log("✅ Socket.IO connected");
    updateConnectionStatus(true);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket.IO disconnected");
    updateConnectionStatus(false);
  });

  socket.on("reconnect_attempt", (attempt) => {
    console.log(`🔄 Reconnecting... percubaan ${attempt}`);
    updateReconnectingStatus(attempt);
  });

  socket.on("reconnect", () => {
    console.log("✅ Socket.IO reconnected");
    updateConnectionStatus(true);
  });

  socket.on("connect_error", (error) => {
    console.error("Socket.IO connection error:", error);
    updateConnectionStatus(false);
  });

  // Listen for data updates from other clients — kemaskini tbody sahaja (thead kekal)
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

  // Hebahan: backend emit hebahan:updated — reload tbody hebahan sahaja
  socket.on("hebahan:updated", () => {
    if (document.getElementById("hebahan-tbody")) {
      TableUtils.reloadTbody("hebahan");
    }
  });

  // ACK selepas CRUD dari setting panel — notifikasi sahaja (broadcast dari backend)
  socket.on("setting:ack", () => {
    showNotification("Paparan telah dikemaskini", "success");
  });

  socket.on("live:started", () => {
    if (typeof window.updateLivestreamPlayState === "function") window.updateLivestreamPlayState(true);
  });
  socket.on("live:stopped", () => {
    if (typeof window.updateLivestreamPlayState === "function") window.updateLivestreamPlayState(false);
  });

  // Terima ACK dari React — pengesahan paparan telah menerima dan memproses data
  socket.on("data:ack", (data) => {
    const label = data.fileName ? ` (${data.fileName})` : "";
    showNotification(`Paparan telah dikemaskini`, "success");
    // console.log('data:ack', data);
  });

  // Notifikasi HLS (RTSP→CCTV): playlist berjaya dicipta atau ralat
  socket.on("hls:playlistReady", () => {
    showNotification("Playlist HLS (index.m3u8) berjaya dicipta. Siaran sedia.", "success");
  });
  socket.on("hls:error", (data) => {
    showNotification("HLS: " + (data?.message || "Ralat"), "error");
  });

  setSocket(socket);
}

// Export untuk browser environment
if (typeof window !== "undefined") {
  window.SocketUtils = {
    initSocket,
    updateConnectionStatus,
    updateReconnectingStatus,
  };
}
