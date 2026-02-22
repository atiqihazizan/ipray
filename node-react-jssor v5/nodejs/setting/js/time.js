/**
 * Time Calibration Module
 * Handle time calibration, testing, and sync
 */

let timeInfo = null;
let updateInterval = null;
let isTestMode = false;
let originalOffset = 0;

/**
 * Load time info dari server
 */
export async function loadTimeInfo() {
    try {
        const response = await fetch('/api/time');
        if (!response.ok) throw new Error('Failed to load time info');
        
        timeInfo = await response.json();
        updateTimeDisplay();
        return timeInfo;
    } catch (error) {
        console.error('Error loading time info:', error);
        showError('Gagal memuatkan maklumat masa');
        return null;
    }
}

/**
 * Update time display
 */
function updateTimeDisplay() {
    if (!timeInfo) return;
    
    // Format timestamps
    const systemTime = new Date(timeInfo.systemTime);
    const calibratedTime = new Date(timeInfo.timestamp);
    
    // Update displays
    document.getElementById('system-time').textContent = formatDateTime(systemTime);
    document.getElementById('calibrated-time').textContent = formatDateTime(calibratedTime);
    
    // Update source badge
    const sourceBadge = document.getElementById('time-source');
    const sourceText = {
        'ntp': 'Internet (Auto)',
        'manual': 'Manual',
        'system': 'Sistem',
        'test': 'Test Mode'
    }[timeInfo.source] || 'Tidak Diketahui';
    
    sourceBadge.textContent = sourceText;
    sourceBadge.className = `time-source-badge ${timeInfo.source}`;
    
    // Update test mode indicator
    const resetBtn = document.getElementById('reset-btn');
    if (timeInfo.isTestMode) {
        isTestMode = true;
        if (resetBtn) resetBtn.style.display = 'inline-flex';
        showTestStatus('Test Mode Aktif - Masa ditetapkan secara manual', 'info');
    } else {
        isTestMode = false;
        if (resetBtn) resetBtn.style.display = 'none';
        hideTestStatus();
    }
    
    // Update status
    const statusEl = document.getElementById('time-status');
    if (timeInfo.isTestMode) {
        statusEl.innerHTML = `🧪 Test Mode Aktif`;
        statusEl.style.color = '#8b5cf6';
    } else if (timeInfo.cmosIssue && timeInfo.cmosIssue.detected) {
        statusEl.innerHTML = `⚠️ CMOS battery mungkin rosak (tahun sistem: ${timeInfo.cmosIssue.systemYear})`;
        statusEl.style.color = '#dc2626';
    } else if (timeInfo.source === 'ntp') {
        const lastSync = timeInfo.lastNtpSync ? new Date(timeInfo.lastNtpSync) : null;
        const syncText = lastSync ? `Sync terakhir: ${formatTime(lastSync)}` : 'Belum sync';
        statusEl.innerHTML = `✓ ${syncText}`;
        statusEl.style.color = '#10b981';
    } else if (timeInfo.source === 'manual') {
        statusEl.innerHTML = `ℹ️ Menggunakan offset manual: ${Math.round(timeInfo.offset / 1000)}s`;
        statusEl.style.color = '#f59e0b';
    } else {
        statusEl.innerHTML = `ℹ️ Menggunakan masa sistem`;
        statusEl.style.color = '#6b7280';
    }
}

/**
 * Format datetime untuk display
 */
function formatDateTime(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format time sahaja
 */
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Set system clock (date/time mesin) - POST /api/time/set, then socket emits time-system-updated -> window reload
 */
async function setSystemTime() {
    const input = document.getElementById('system-datetime');
    const value = input && input.value ? input.value.trim() : '';
    if (!value) {
        showError('Sila pilih tarikh dan masa');
        return;
    }
    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) {
            showError('Format tarikh/masa tidak sah');
            return;
        }
        const dateTimeStr = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0') + ' ' +
            String(d.getHours()).padStart(2, '0') + ':' +
            String(d.getMinutes()).padStart(2, '0') + ':' +
            String(d.getSeconds()).padStart(2, '0');
        const response = await fetch('/api/time/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dateTime: dateTimeStr })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || 'Gagal set masa mesin');
        }
        showSuccess('Masa mesin berjaya dikemas kini. Paparan akan dimuat semula.');
        if (input) input.value = '';
    } catch (error) {
        console.error('Error setting system time:', error);
        showError('Gagal set masa mesin: ' + error.message);
    }
}

/**
 * Test prayer time
 */
async function testPrayerTime() {
    const input = document.getElementById('test-time');
    const testTime = input.value;
    
    if (!testTime) {
        showError('Sila pilih waktu untuk test');
        return;
    }
    
    try {
        // Parse test time (HH:MM format)
        const [hours, minutes] = testTime.split(':').map(Number);
        
        // Create test datetime (today dengan waktu yang dipilih)
        const now = new Date();
        const testDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
        const testTimestamp = testDate.getTime();
        
        // Call API untuk enable test mode
        const response = await fetch('/api/time/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timestamp: testTimestamp })
        });
        
        if (!response.ok) throw new Error('Failed to enable test mode');
        
        // Update state
        isTestMode = true;
        
        // Reload time info
        await loadTimeInfo();
        
        // Update UI
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.style.display = 'inline-flex';
        
        showTestStatus(`Test mode aktif. Masa ditetapkan ke ${formatTime(testDate)}. Tunggu audio play...`, 'info');
    } catch (error) {
        console.error('Error testing prayer time:', error);
        showError('Gagal test waktu solat: ' + error.message);
    }
}

/**
 * Reset time (disable test mode)
 */
async function resetTime() {
    if (!isTestMode) {
        showError('Tidak dalam test mode');
        return;
    }
    
    try {
        // Call API untuk disable test mode
        const response = await fetch('/api/time/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Failed to reset test mode');
        
        // Update state
        isTestMode = false;
        
        // Reload time info
        await loadTimeInfo();
        
        // Update UI
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.style.display = 'none';
        const testInput = document.getElementById('test-time');
        if (testInput) testInput.value = '';
        hideTestStatus();
        
        showSuccess('Masa berjaya direset');
    } catch (error) {
        console.error('Error resetting time:', error);
        showError('Gagal reset masa: ' + error.message);
    }
}

/**
 * Sync with internet (NTP)
 */
async function syncWithInternet() {
    const statusEl = document.getElementById('sync-status');
    statusEl.style.display = 'block';
    statusEl.className = 'sync-status info';
    statusEl.textContent = 'Sedang sync dengan internet...';
    
    try {
        const response = await fetch('/api/time/sync');
        if (!response.ok) throw new Error('Sync failed');
        
        const result = await response.json();
        
        await loadTimeInfo();
        
        statusEl.className = 'sync-status success';
        statusEl.textContent = '✓ Sync berjaya! Masa kini menggunakan Internet (NTP).';
        
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
        
    } catch (error) {
        console.error('Error syncing with internet:', error);
        statusEl.className = 'sync-status error';
        statusEl.textContent = '✗ Sync gagal. Pastikan ada sambungan internet.';
    }
}

/**
 * Show error message
 */
function showError(message) {
    alert('❌ ' + message);
}

/**
 * Show success message
 */
function showSuccess(message) {
    alert('✓ ' + message);
}

/**
 * Show test status
 */
function showTestStatus(message, type = 'info') {
    const statusEl = document.getElementById('test-status');
    statusEl.style.display = 'block';
    statusEl.className = `test-status ${type}`;
    statusEl.textContent = message;
}

/**
 * Hide test status
 */
function hideTestStatus() {
    const statusEl = document.getElementById('test-status');
    statusEl.style.display = 'none';
}

/**
 * Start auto-update
 */
export function startAutoUpdate() {
    // Update every second
    updateInterval = setInterval(() => {
        if (timeInfo) {
            // Update calibrated time display (increment)
            timeInfo.timestamp += 1000;
            timeInfo.systemTime += 1000;
            updateTimeDisplay();
        }
    }, 1000);
}

/**
 * Stop auto-update
 */
export function stopAutoUpdate() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
}

/**
 * Initialize time tab
 */
export async function initTimeTab() {
    await loadTimeInfo();
    startAutoUpdate();
    
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateTimeValue = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const systemDatetimeInput = document.getElementById('system-datetime');
    if (systemDatetimeInput) systemDatetimeInput.value = dateTimeValue;
}

/**
 * Cleanup time tab
 */
export function cleanupTimeTab() {
    stopAutoUpdate();
}

// Export functions untuk global access
if (typeof window !== 'undefined') {
    window.setSystemTime = setSystemTime;
    window.testPrayerTime = testPrayerTime;
    window.resetTime = resetTime;
    window.syncWithInternet = syncWithInternet;
}
