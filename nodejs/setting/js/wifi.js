/**
 * Rangkaian (WiFi ↔ Hotspot) — panel tetapan
 * "Simpan" hanya menyimpan profil WiFi; "Sambung WiFi sekarang" menukar mod.
 * Bila kiosk bertukar mod, fetch gagal — UI cuba semula sehingga kiosk menjawab.
 */

import { showNotification } from './notification.js';

const API_URL = window.Config?.API_URL || '/api';

let _statusPollTimer = null;

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function setBanner(mode, html) {
    const el = document.getElementById('net-status-banner');
    if (!el) return;
    const colors = { wifi: '#065f46', hotspot: '#92400e', none: '#7f1d1d', unknown: '#1e293b' };
    el.style.background = colors[mode] || colors.unknown;
    el.innerHTML = html;
}

function setBadge(id, active, label) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = label;
    el.style.background = active ? '#059669' : '#334155';
    el.style.color = active ? '#ecfdf5' : '#94a3b8';
}

function fmtTime(ts) {
    if (!ts) return '-';
    try { return new Date(ts).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }); }
    catch (_) { return '-'; }
}

/**
 * Imbas rangkaian kelihatan (iw; cache jika imbasan hidup gagal)
 */
export async function scanWiFi() {
    try {
        const noteEl = document.getElementById('wifi-scan-note');
        if (noteEl) noteEl.textContent = '';
        showNotification('🔍 Mengimbas rangkaian WiFi... (dalam mod hotspot mungkin ganggu ~1–4s)', 'info');

        const response = await fetch(`${API_URL}/wifi/scan`);
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Gagal scan WiFi');
        }

        const ssidSelect = document.getElementById('wifi-ssid-select');
        if (ssidSelect) {
            ssidSelect.innerHTML = '<option value="">-- Pilih rangkaian --</option>';
            result.networks.forEach(n => {
                const opt = document.createElement('option');
                opt.value = n.ssid;
                const sig = n.signalPct != null ? `${n.signalPct}%` : (n.signal != null ? `${n.signal}%` : `${n.signalDbm}dBm`);
                const ch = n.channel ? ` ch${n.channel}` : '';
                opt.textContent = `${n.ssid} (${sig}${ch}${n.security && n.security !== 'Open' ? ', ' + n.security : ''})`;
                ssidSelect.appendChild(opt);
            });
        }
        if (noteEl) {
            noteEl.textContent = result.cached
                ? `⚠ Imbasan hidup gagal — ini senarai tersimpan pada ${result.scannedAt || '?'}`
                : `Diimbas ${result.scannedAt ? new Date(result.scannedAt).toLocaleTimeString('ms-MY') : 'baru sahaja'}`;
        }
        showNotification(`✓ Ditemui ${result.networks.length} rangkaian${result.cached ? ' (cache)' : ''}`, 'success');
    } catch (error) {
        console.error('Error scanning WiFi:', error);
        showNotification(`✗ Gagal scan WiFi: ${error.message}`, 'error');
    }
}

/**
 * Simpan profil WiFi — TIDAK mengubah sambungan semasa
 */
export async function saveWiFi() {
    try {
        const ssidSelect = document.getElementById('wifi-ssid-select');
        const passwordInput = document.getElementById('wifi-password');
        const ssid = ssidSelect && ssidSelect.value ? ssidSelect.value : '';
        if (!ssid) {
            showNotification('✗ Sila imbas dan pilih rangkaian dahulu', 'error');
            return;
        }
        const password = passwordInput ? passwordInput.value : '';
        const response = await fetch(`${API_URL}/wifi/configure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ssid, password })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Gagal simpan WiFi');
        }
        showNotification(`✓ ${result.message}`, 'success');
        if (passwordInput) passwordInput.value = '';
        refreshSavedProfiles();
    } catch (error) {
        console.error('Error saving WiFi:', error);
        showNotification(`✗ Gagal simpan WiFi: ${error.message}`, 'error');
    }
}

/**
 * "Sambung WiFi sekarang" — async; kiosk bertukar mod, telepon boleh terputus
 */
export async function connectNowWiFi(name, ssid) {
    const label = ssid || name;
    if (!confirm(`Sambung ke WiFi "${label}" SEKARANG?\n\nSambungan ke hotspot/WiFi semasa akan TERPUTUS. Kiosk cuba sehingga ~45 saat; jika gagal, hotspot dihidupkan semula.`)) return;
    try {
        showNotification(`🔄 Kiosk sedang mencuba "${label}"...`, 'info');
        const response = await fetch(`${API_URL}/wifi/connect-now`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Gagal memulakan percubaan');
        }
        setBanner('unknown', `⏳ Kiosk bertukar mod… percubaan ke "${esc(label)}" sedang berjalan.<br>Sambungan mungkin terputus — sambung semula ke rangkaian yang betul. UI ini akan cuba semula sendiri.`);
        pollUntilKioskAnswers();
    } catch (error) {
        console.error('Error connect-now:', error);
        showNotification(`✗ ${error.message}`, 'error');
    }
}

/**
 * Padam profil WiFi tersimpan
 */
export async function deleteWiFiProfile(name, ssid) {
    const label = ssid || name;
    if (!confirm(`Padam rangkaian tersimpan "${label}"?`)) return;
    try {
        const response = await fetch(`${API_URL}/wifi/profile/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Gagal padam profil');
        }
        showNotification(`✓ ${result.message}`, 'success');
        refreshSavedProfiles();
    } catch (error) {
        console.error('Error deleting WiFi profile:', error);
        showNotification(`✗ ${error.message}`, 'error');
    }
}

/**
 * Senarai rangkaian tersimpan (profil NM, tanpa kata laluan)
 */
export async function refreshSavedProfiles() {
    const list = document.getElementById('wifi-profiles-list');
    if (!list) return;
    try {
        const r = await fetch(`${API_URL}/wifi/profiles`);
        const data = await r.json();
        if (!r.ok || !data.success) throw new Error(data.error || 'Gagal senarai profil');
        if (!data.profiles.length) {
            list.innerHTML = '<span style="color:#94a3b8;">Tiada rangkaian tersimpan.</span>';
            return;
        }
        list.innerHTML = data.profiles.map(p => `
            <div style="display:flex; align-items:center; gap:10px; padding:8px 10px; border:1px solid #e2e8f0; border-radius:8px; background:#fff;">
                <span style="flex:1; font-weight:500;">${esc(p.ssid || p.name)}</span>
                <button type="button" data-name="${esc(p.name)}" data-ssid="${esc(p.ssid || p.name)}" onclick="connectNowWiFi(this.dataset.name, this.dataset.ssid)" class="btn-reboot" style="background:#10b981; padding:6px 12px; font-size:12px;">Sambung sekarang</button>
                <button type="button" data-name="${esc(p.name)}" data-ssid="${esc(p.ssid || p.name)}" onclick="deleteWiFiProfile(this.dataset.name, this.dataset.ssid)" class="btn-reboot" style="background:#ef4444; padding:6px 12px; font-size:12px;">Padam</button>
            </div>`).join('');
    } catch (e) {
        list.innerHTML = `<span style="color:#ef4444;">${esc(e.message)}</span>`;
    }
}

/**
 * Status rangkaian menyeluruh (banner + teks status + badge + profil)
 */
export async function refreshNetworkStatus() {
    const statusText = document.getElementById('wifi-status-text');
    const banner = document.getElementById('net-status-banner');
    if (!statusText && !banner) return; // tab Rangkaian tidak dimuatkan
    if (statusText) statusText.textContent = 'Memuatkan...';
    refreshSavedProfiles();
    try {
        const r = await fetch(`${API_URL}/wifi/status`);
        const data = await r.json();
        if (!r.ok || !data.success) throw new Error(data.error || 'Gagal status');
        const s = data.status || {};

        const modeLabel = { wifi: 'WiFi', hotspot: 'Hotspot', none: 'Tiada sambungan' }[s.mode] || 'Tidak diketahui';
        let banner = `<strong>Mod: ${modeLabel}</strong>`;
        if (s.ssid) banner += ` — ${esc(s.ssid)}`;
        if (s.ip) banner += ` · IP ${esc(s.ip)}`;
        if (s.signalDbm != null) banner += ` · ${s.signalDbm} dBm`;
        banner += '<br>';
        if (s.mode === 'hotspot') {
            banner += `Klien pada hotspot: ${s.hotspotClients ?? 0}`;
            if (s.holdActive) banner += ` · ⏸ tahan hingga ${fmtTime(s.holdUntil)}`;
            else if (s.deferredClients > 0) banner += ` · ⏸ percubaan WiFi ditangguh (ada klien)`;
            else if (s.nextTryAt) banner += ` · percubaan WiFi seterusnya ~${fmtTime(s.nextTryAt)}`;
            banner += '<br>';
        }
        if (s.connectNowInProgress) banner += `⏳ "Sambung WiFi sekarang" sedang berjalan…<br>`;
        if (s.lastConnectNow) {
            const lcn = s.lastConnectNow;
            banner += `Percubaan terakhir: ${lcn.ok ? '✓ berjaya' : '✗ gagal'} ke "${esc(lcn.profile)}" (${fmtTime(lcn.at)})${lcn.reason ? ' — ' + esc(lcn.reason) : ''}<br>`;
        }
        if (s.lastSwitchReason) banner += `<span style="opacity:.8">Sebab: ${esc(s.lastSwitchReason)}${s.lastCheckAt ? ' · disemak ' + fmtTime(s.lastCheckAt) : ''}</span>`;
        setBanner(s.mode === 'wifi' ? 'wifi' : s.mode === 'hotspot' ? 'hotspot' : 'none', banner);

        setBadge('wifi-mode-badge', s.mode === 'wifi', s.mode === 'wifi' ? 'aktif' : 'tidak aktif');
        setBadge('hotspot-mode-badge', s.mode === 'hotspot', s.mode === 'hotspot' ? 'aktif' : 'tidak aktif');
        if (statusText) {
            statusText.textContent = s.mode === 'wifi'
                ? `Disambung: ${s.ssid || '?'}${s.ip ? ` (${s.ip})` : ''}`
                : s.mode === 'hotspot' ? 'Mod hotspot aktif' : (s.error || 'Tiada sambungan');
            statusText.style.color = s.mode === 'wifi' ? '#10b981' : (s.mode === 'hotspot' ? '#f59e0b' : '#ef4444');
        }
        const hs = document.getElementById('hotspot-status-text');
        if (hs) {
            hs.textContent = s.mode === 'hotspot' ? `Aktif: ${s.ssid || 'iPray-Hotspot'} (${s.hotspotClients ?? 0} klien)` : 'Tidak Aktif';
            hs.style.color = s.mode === 'hotspot' ? '#10b981' : '#64748b';
        }
    } catch (e) {
        if (statusText) { statusText.textContent = `Error: ${e.message}`; statusText.style.color = '#ef4444'; }
        setBanner('unknown', `⚠ Tidak dapat menghubungi kiosk — ${esc(e.message)}.<br>Kiosk mungkin sedang bertukar mod; sambung semula ke rangkaian yang betul.`);
    }
}

/**
 * Cuba semula status sehingga kiosk menjawab (selepas connect-now / tukar mod)
 */
export function pollUntilKioskAnswers() {
    if (_statusPollTimer) clearInterval(_statusPollTimer);
    let tries = 0;
    _statusPollTimer = setInterval(async () => {
        tries++;
        try {
            const r = await fetch(`${API_URL}/wifi/status`);
            if (r.ok) {
                clearInterval(_statusPollTimer);
                _statusPollTimer = null;
                refreshNetworkStatus();
            }
        } catch (_) { /* kiosk masih bertukar */ }
        if (tries > 30) { clearInterval(_statusPollTimer); _statusPollTimer = null; }
    }, 4000);
}

/**
 * Hidupkan hotspot (tahan pemantau 30 minit supaya tidak berebut)
 */
export async function enableHotspot() {
    if (!confirm('Hidupkan hotspot SEKARANG?\n\nWiFi semasa akan TERPUTUS dan pemantau ditahan ~30 minit daripada kembali ke WiFi.')) return;
    try {
        showNotification('🔄 Mengaktifkan hotspot...', 'info');
        const response = await fetch(`${API_URL}/wifi/hotspot/enable`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ holdMinutes: 30 })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.error || 'Gagal aktifkan hotspot');
        showNotification(`✓ ${result.message}`, 'success');
        setBanner('unknown', '⏳ Kiosk bertukar ke mod hotspot… sambung semula ke "iPray-Hotspot" (http://10.42.0.1/).');
        pollUntilKioskAnswers();
    } catch (error) {
        console.error('Error enabling hotspot:', error);
        showNotification(`✗ Gagal aktifkan hotspot: ${error.message}`, 'error');
    }
}

/**
 * Matikan hotspot — WiFi tersimpan akan disambung semula secara automatik
 */
export async function disableHotspot() {
    if (!confirm('Matikan hotspot? Kiosk akan cuba sambung semula ke WiFi tersimpan.')) return;
    try {
        showNotification('🔄 Menyahaktifkan hotspot...', 'info');
        const response = await fetch(`${API_URL}/wifi/hotspot/disable`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.error || 'Gagal nyahaktif hotspot');
        showNotification(`✓ ${result.message}`, 'success');
        setBanner('unknown', '⏳ Kiosk mematikan hotspot dan mencuba WiFi tersimpan… sambungan ini akan terputus.');
        pollUntilKioskAnswers();
    } catch (error) {
        console.error('Error disabling hotspot:', error);
        showNotification(`✗ Gagal nyahaktif hotspot: ${error.message}`, 'error');
    }
}

// Alias kekal untuk keserasian dengan pemanggil lama
export const configureWiFi = saveWiFi;
export const refreshWiFiStatus = refreshNetworkStatus;
export const refreshHotspotStatus = refreshNetworkStatus;

export function setupWiFiUI() { /* tiada input SSID manual lagi — imbas sahaja */ }

if (typeof window !== 'undefined') {
    window.WiFiUtils = {
        scanWiFi,
        saveWiFi,
        configureWiFi: saveWiFi,
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
    window.scanWiFi = scanWiFi;
    window.saveWiFi = saveWiFi;
    window.configureWiFi = saveWiFi;
    window.connectNowWiFi = connectNowWiFi;
    window.deleteWiFiProfile = deleteWiFiProfile;
    window.refreshSavedProfiles = refreshSavedProfiles;
    window.refreshNetworkStatus = refreshNetworkStatus;
    window.refreshWiFiStatus = refreshNetworkStatus;
    window.refreshHotspotStatus = refreshNetworkStatus;
    window.enableHotspot = enableHotspot;
    window.disableHotspot = disableHotspot;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { setupWiFiUI(); refreshNetworkStatus(); });
    } else {
        setupWiFiUI();
        refreshNetworkStatus();
    }
}
