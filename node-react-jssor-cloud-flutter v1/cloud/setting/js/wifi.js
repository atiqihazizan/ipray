/**
 * WiFi Configuration Functions (Cloud)
 * WiFi dan hotspot hanya tersedia dari setting panel local.
 * Cloud akan menunjukkan mesej bahawa WiFi dikawal secara local.
 */

import { showNotification } from './notification.js';
import { emitWithResponse } from './cloud-socket.js';

export async function scanWiFi() {
    try {
        showNotification('WiFi scan hanya tersedia dari setting panel local', 'error');
    } catch (error) {
        console.error('Error scanning WiFi:', error);
    }
}

export async function configureWiFi() {
    showNotification('WiFi configure hanya tersedia dari setting panel local', 'error');
}

export async function enableHotspot() {
    showNotification('Hotspot hanya tersedia dari setting panel local', 'error');
}

export async function disableHotspot() {
    showNotification('Hotspot hanya tersedia dari setting panel local', 'error');
}

export async function refreshHotspotStatus() {
    const statusText = document.getElementById('hotspot-status-text');
    if (statusText) {
        statusText.textContent = 'Kawal dari setting panel local';
        statusText.style.color = '#64748b';
    }
}

export async function refreshWiFiStatus() {
    const statusText = document.getElementById('wifi-status-text');
    if (statusText) {
        statusText.textContent = 'Kawal dari setting panel local';
        statusText.style.color = '#64748b';
    }
}

export function setupWiFiUI() {
    const ssidSelect = document.getElementById('wifi-ssid-select');
    const ssidInput = document.getElementById('wifi-ssid-input');
    if (ssidSelect && ssidInput) {
        ssidSelect.addEventListener('change', () => {
            if (ssidSelect.value === '') {
                ssidInput.style.display = 'block';
                ssidInput.focus();
            } else {
                ssidInput.style.display = 'none';
                ssidInput.value = '';
            }
        });
        ssidInput.addEventListener('input', () => {
            if (ssidInput.value.trim()) ssidSelect.value = '';
        });
    }
}

if (typeof window !== 'undefined') {
    window.WiFiUtils = {
        scanWiFi,
        configureWiFi,
        refreshWiFiStatus,
        enableHotspot,
        disableHotspot,
        refreshHotspotStatus,
        setupWiFiUI
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupWiFiUI();
            refreshWiFiStatus();
            refreshHotspotStatus();
        });
    } else {
        setupWiFiUI();
        refreshWiFiStatus();
        refreshHotspotStatus();
    }
}
