/**
 * WiFi Configuration Functions
 * Functions untuk configure WiFi SSID, password dan hotspot
 */

import { showNotification } from './notification.js';

const API_URL = window.Config?.API_URL || '/api';

/**
 * Scan available WiFi networks
 */
export async function scanWiFi() {
    try {
        showNotification('🔍 Mengimbas rangkaian WiFi...', 'info');
        
        const response = await fetch(`${API_URL}/wifi/scan`);
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Gagal scan WiFi');
        }
        
        const ssidSelect = document.getElementById('wifi-ssid-select');
        if (ssidSelect) {
            ssidSelect.innerHTML = '<option value="">-- Pilih atau masukkan SSID --</option>';
            result.networks.forEach(network => {
                const option = document.createElement('option');
                option.value = network.ssid;
                option.textContent = `${network.ssid} (${network.signal}%${network.inUse ? ' - Disambung' : ''})`;
                if (network.inUse) option.selected = true;
                ssidSelect.appendChild(option);
            });
        }
        
        showNotification(`✓ Ditemui ${result.networks.length} rangkaian WiFi`, 'success');
    } catch (error) {
        console.error('Error scanning WiFi:', error);
        showNotification(`✗ Gagal scan WiFi: ${error.message}`, 'error');
    }
}

/**
 * Configure WiFi connection
 */
export async function configureWiFi() {
    try {
        const ssidSelect = document.getElementById('wifi-ssid-select');
        const ssidInput = document.getElementById('wifi-ssid-input');
        const passwordInput = document.getElementById('wifi-password');
        
        let ssid = (ssidSelect && ssidSelect.value) ? ssidSelect.value : (ssidInput && ssidInput.value ? ssidInput.value.trim() : '');
        if (!ssid) {
            showNotification('✗ Sila pilih atau masukkan SSID', 'error');
            return;
        }
        
        const password = passwordInput ? passwordInput.value : '';
        if (!confirm(`Adakah anda pasti mahu menyambung ke WiFi "${ssid}"?`)) return;
        
        showNotification(`🔄 Menyambung ke ${ssid}...`, 'info');
        
        const response = await fetch(`${API_URL}/wifi/configure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ssid, password })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }
        
        if (!result.success) {
            throw new Error(result.error || 'Gagal tetapkan WiFi');
        }
        
        showNotification(result.fallback ? result.message : `✓ ${result.message}`, 'success');
        if (passwordInput) passwordInput.value = '';
        setTimeout(() => { refreshWiFiStatus(); refreshHotspotStatus && refreshHotspotStatus(); }, 2000);
    } catch (error) {
        console.error('Error configuring WiFi:', error);
        showNotification(`✗ Gagal tetapkan WiFi: ${error.message}`, 'error');
    }
}

/**
 * Enable hotspot mode
 */
export async function enableHotspot() {
    try {
        const ssidInput = document.getElementById('hotspot-ssid');
        const passwordInput = document.getElementById('hotspot-password');
        const ssid = ssidInput ? (ssidInput.value.trim() || 'iPray-Hotspot') : 'iPray-Hotspot';
        const password = passwordInput ? (passwordInput.value.trim() || 'ipray2026') : 'ipray2026';
        
        if (!confirm(`Adakah anda pasti mahu mengaktifkan hotspot "${ssid}"?`)) return;
        
        showNotification('🔄 Mengaktifkan hotspot...', 'info');
        
        const response = await fetch(`${API_URL}/wifi/hotspot/enable`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ssid, password })
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);
        if (!result.success) throw new Error(result.error || 'Gagal aktifkan hotspot');
        
        showNotification(`✓ ${result.message}`, 'success');
        setTimeout(() => { refreshWiFiStatus(); refreshHotspotStatus(); }, 2000);
    } catch (error) {
        console.error('Error enabling hotspot:', error);
        showNotification(`✗ Gagal aktifkan hotspot: ${error.message}`, 'error');
    }
}

/**
 * Disable hotspot mode
 */
export async function disableHotspot() {
    try {
        if (!confirm('Adakah anda pasti mahu menyahaktifkan hotspot?')) return;
        showNotification('🔄 Menyahaktifkan hotspot...', 'info');
        
        const response = await fetch(`${API_URL}/wifi/hotspot/disable`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);
        if (!result.success) throw new Error(result.error || 'Gagal nyahaktif hotspot');
        
        showNotification(`✓ ${result.message}`, 'success');
        setTimeout(() => { refreshWiFiStatus(); refreshHotspotStatus(); }, 2000);
    } catch (error) {
        console.error('Error disabling hotspot:', error);
        showNotification(`✗ Gagal nyahaktif hotspot: ${error.message}`, 'error');
    }
}

/**
 * Refresh hotspot status
 */
export async function refreshHotspotStatus() {
    try {
        const statusText = document.getElementById('hotspot-status-text');
        if (!statusText) return;
        statusText.textContent = 'Memuatkan...';
        
        const response = await fetch(`${API_URL}/wifi/hotspot/status`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);
        if (!result.success) throw new Error(result.error || 'Gagal mendapatkan status hotspot');
        
        const status = result.status;
        if (status.enabled) {
            statusText.textContent = `Aktif: ${status.ssid || 'iPray-Hotspot'}`;
            statusText.style.color = '#10b981';
        } else {
            statusText.textContent = 'Tidak Aktif';
            statusText.style.color = '#64748b';
        }
    } catch (error) {
        console.error('Error refreshing hotspot status:', error);
        const statusText = document.getElementById('hotspot-status-text');
        if (statusText) {
            statusText.textContent = `Error: ${error.message}`;
            statusText.style.color = '#ef4444';
        }
    }
}

/**
 * Refresh WiFi status
 */
export async function refreshWiFiStatus() {
    try {
        const statusText = document.getElementById('wifi-status-text');
        if (statusText) statusText.textContent = 'Memuatkan...';
        
        const response = await fetch(`${API_URL}/wifi/status`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);
        if (!result.success) throw new Error(result.error || 'Gagal mendapatkan status WiFi');
        
        const status = result.status;
        if (statusText) {
            if (status.connected) {
                statusText.textContent = `Disambung: ${status.ssid || 'Tidak diketahui'} (${status.device || 'wlan0'})`;
                statusText.style.color = '#10b981';
            } else if (status.deviceAvailable === false) {
                statusText.textContent = status.error || 'Peranti WiFi tidak tersedia';
                statusText.style.color = '#ef4444';
            } else if (status.error) {
                statusText.textContent = status.error;
                statusText.style.color = '#ef4444';
            } else if (!status.device) {
                statusText.textContent = 'Peranti WiFi tidak tersedia';
                statusText.style.color = '#ef4444';
            } else {
                statusText.textContent = 'Tidak disambung';
                statusText.style.color = '#ef4444';
            }
        }
    } catch (error) {
        console.error('Error refreshing WiFi status:', error);
        const statusText = document.getElementById('wifi-status-text');
        if (statusText) {
            statusText.textContent = `Error: ${error.message}`;
            statusText.style.color = '#ef4444';
        }
    }
}

/**
 * Setup WiFi UI event listeners
 */
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
