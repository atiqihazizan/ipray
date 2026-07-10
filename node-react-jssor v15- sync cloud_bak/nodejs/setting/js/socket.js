/**
 * Socket.IO Functions
 * Function untuk Socket.IO connection dan real-time updates
 */

import { setSocket, getCurrentFileName } from "./state.js";
import { showNotification } from "./notification.js";
import { loadTable } from "./table.js";

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
      statusDot.classList.remove("bg-red-500");
      statusDot.classList.add("bg-green-500", "animate-pulse");
      statusDot.style.background = "#22c55e";
    }
  } else {
    statusEl.textContent = "Disconnected";
    if (statusDot) {
      statusDot.classList.remove("bg-green-500", "animate-pulse");
      statusDot.classList.add("bg-red-500");
      statusDot.style.background = "#ef4444";
    }
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
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("✅ Socket.IO connected");
    updateConnectionStatus(true);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket.IO disconnected");
    updateConnectionStatus(false);
  });

  socket.on("connect_error", (error) => {
    console.error("Socket.IO connection error:", error);
    updateConnectionStatus(false);
  });

  // Listen for data updates from other clients
  socket.on("data:updated", (data) => {
    // console.log('📡 Data updated event received:', data);
    const currentFileName = getCurrentFileName();
    if (data.fileName === currentFileName) {
      // showNotification(`✓ Data dikemaskini oleh sistem`, "info");
      // Auto reload current table after 1 second
      // setTimeout(() => {
        loadTable(currentFileName);
      // }, 500);
    }
  });

  // Terima ACK dari React — pengesahan paparan telah menerima dan memproses data
  socket.on("data:ack", (data) => {
    const label = data.fileName ? ` (${data.fileName})` : "";
    showNotification(`✓ Paparan telah dikemas kini${label}`, "success");
  });

  setSocket(socket);
}

// Export untuk browser environment
if (typeof window !== "undefined") {
  window.SocketUtils = {
    initSocket,
    updateConnectionStatus,
  };
}
