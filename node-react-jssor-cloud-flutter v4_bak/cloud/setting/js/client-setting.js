/**
 * Tetapan Client — tab utama panel setting.
 * Fetch senarai client dari /api/clients (data .env CLIENT_TOKENS),
 * simpan pilihan ke localStorage, reconnect socket.
 */

import { BASE_URL } from "./config.js";
import { updateConfigFromStorage } from "./config.js";
import { reconnectSocket } from "./cloud-socket.js";
import { showNotification } from "./notification.js";

let _clientList = [];

async function fetchClientList() {
  const res = await fetch(`${BASE_URL}/api/clients`, { credentials: "same-origin" });
  if (!res.ok) throw new Error("Gagal muat senarai client");
  const data = await res.json();
  return data.clients || [];
}

function updateTokenDisplay(clientId) {
  const tokenEl = document.getElementById("client-config-token");
  if (!tokenEl) return;
  const chosen = _clientList.find((c) => c.id === clientId);
  tokenEl.value = chosen ? chosen.token : "";
}

async function initClientConfigPanel() {
  const currentEl = document.getElementById("client-config-current");
  const select = document.getElementById("client-config-select");
  if (!select) return;

  const curId = localStorage.getItem("cloud_client_id") || "—";
  if (currentEl) currentEl.textContent = curId;

  select.innerHTML = '<option value="">Memuat senarai client...</option>';

  try {
    _clientList = await fetchClientList();
    select.innerHTML = "";
    if (_clientList.length === 0) {
      select.innerHTML = '<option value="">Tiada client dalam .env</option>';
      updateTokenDisplay("");
      return;
    }
    const currentId = localStorage.getItem("cloud_client_id") || "";
    _clientList.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.id;
      if (c.id === currentId) opt.selected = true;
      select.appendChild(opt);
    });
    updateTokenDisplay(select.value);
    select.onchange = () => updateTokenDisplay(select.value);
  } catch (e) {
    select.innerHTML = '<option value="">Ralat: ' + (e.message || "Gagal") + "</option>";
    updateTokenDisplay("");
    showNotification("Gagal muat senarai client. Pastikan .env CLIENT_TOKENS diset.", "error");
  }
}

function saveClientConfig() {
  const select = document.getElementById("client-config-select");
  if (!select || !select.value) {
    showNotification("Sila pilih client", "warning");
    return;
  }
  const chosen = _clientList.find((c) => c.id === select.value);
  if (!chosen) {
    showNotification("Client tidak dijumpai", "error");
    return;
  }
  localStorage.setItem("cloud_client_id", chosen.id);
  localStorage.setItem("cloud_client_token", chosen.token);
  updateConfigFromStorage();
  reconnectSocket();

  const currentEl = document.getElementById("client-config-current");
  if (currentEl) currentEl.textContent = chosen.id;

  showNotification("Client ditukar ke " + chosen.id + ". Sambungan disambung semula.", "success");
}

if (typeof window !== "undefined") {
  window.initClientConfigPanel = initClientConfigPanel;
  window.saveClientConfig = saveClientConfig;
}
