/**
 * Rangkaian / WiFi Functions (Cloud)
 * WiFi dan hotspot hanya tersedia dari setting panel local kiosk.
 * Cloud menunjukkan status sahaja (jika tersedia) — kawalan tetap local.
 */

import { showNotification } from './notification.js';
import { emitWithResponse } from './cloud-socket.js';

const LOCAL_ONLY = 'Konfigurasi rangkaian hanya tersedia dari setting panel local kiosk';

export async function scanWiFi() {
    showNotification(LOCAL_ONLY, 'error');
}

export async function saveWiFi() {
    showNotification(LOCAL_ONLY, 'error');
}

export const configureWiFi = saveWiFi;

export async function connectNowWiFi() {
    showNotification(LOCAL_ONLY, 'error');
}

export async function deleteWiFiProfile() {
    showNotification(LOCAL_ONLY, 'error');
}

export async function enableHotspot() {
    showNotification(LOCAL_ONLY, 'error');
}

export async function disableHotspot() {
    showNotification(LOCAL_ONLY, 'error');
}

export async function refreshSavedProfiles() {
    const list = document.getElementById('wifi-profiles-list');
    if (list) list.innerHTML = '<span style="color:#94a3b8;">Kawal dari setting panel local</span>';
}

export async function refreshNetworkStatus() {
    const statusText = document.getElementById('wifi-status-text');
    const hsText = document.getElementById('hotspot-status-text');
    // Cuba dapatkan status melalui cloud socket (boleh gagal — kekal local-only)
    try {
        const res = await emitWithResponse('cloud:wifi:status', {});
        // emitWithResponse resolve dengan payload.data terus
        const m = res || {};
        if (m.mode) {
            const label = { wifi: 'WiFi', hotspot: 'Hotspot', none: 'Tiada sambungan' }[m.mode] || m.mode;
            if (statusText) {
                statusText.textContent = `Mod: ${label}${m.ssid ? ` — ${m.ssid}` : ''}`;
                statusText.style.color = '#10b981';
            }
            if (hsText) hsText.textContent = '';
            return;
        }
    } catch (_) { /* status cloud tidak tersedia — papar mesej local-only */ }
    if (statusText) {
        statusText.textContent = 'Kawal dari setting panel local';
        statusText.style.color = '#64748b';
    }
    if (hsText) hsText.textContent = '';
}

export const refreshWiFiStatus = refreshNetworkStatus;
export const refreshHotspotStatus = refreshNetworkStatus;

export function setupWiFiUI() { /* tiada input SSID manual — imbas sahaja di local */ }

if (typeof window !== 'undefined') {
    window.WiFiUtils = {
        scanWiFi,
        saveWiFi,
        configureWiFi,
        connectNowWiFi,
        deleteWiFiProfile,
        refreshSavedProfiles,
        refreshNetworkStatus,
        refreshWiFiStatus,
        refreshHotspotStatus,
        enableHotspot,
        disableHotspot,
        setupWiFiUI
    };
    window.refreshNetworkStatus = refreshNetworkStatus;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { setupWiFiUI(); refreshNetworkStatus(); });
    } else {
        setupWiFiUI();
        refreshNetworkStatus();
    }
}
