const { execSync } = require('child_process');
const { syncTimeWithRetry } = require('../utils/ntpClient');

/**
 * Time Service
 * NTP sync + set jam mesin (Raspberry Pi). Selepas NTP berjaya, jam mesin di-update
 * supaya seluruh app guna Date.now() = masa mesin. Fallback: manual offset / system time.
 */

class TimeService {
  constructor() {
    this.ntpOffset = null;           // Offset dari NTP server (ms); 0 bila jam mesin sudah di-set
    this.manualOffset = 0;            // Manual offset dari config (ms)
    this.lastNtpSync = null;          // Timestamp last successful NTP sync
    this.ntpSyncInterval = null;      // Auto-sync interval timer
    this.isOnline = false;            // Internet connectivity status
    this.timeSource = 'system';       // Current time source: 'ntp' | 'manual' | 'system'
    this.systemClockSet = false;      // True bila jam mesin berjaya di-update (Raspi)
    this.cmosIssue = null;            // CMOS battery issue detection result

    // Config
    this.ntpEnabled = true;
    this.ntpServer = 'pool.ntp.org';
    this.ntpSyncIntervalMs = 3600000; // 1 hour default
    
    // DataService reference (untuk read/write config)
    this.dataService = null;
  }

  /**
   * Initialize time service
   * @param {Object} config - Configuration object
   * @param {Object} config.dataService - DataService instance
   * @param {number} config.manualOffset - Manual offset dari config.txt (ms)
   * @param {boolean} config.ntpEnabled - Enable NTP sync
   * @param {string} config.ntpServer - NTP server hostname
   * @param {number} config.ntpSyncIntervalMs - Auto-sync interval (ms)
   */
  async init(config = {}) {
    this.dataService = config.dataService;
    this.manualOffset = config.manualOffset || 0;
    this.ntpEnabled = config.ntpEnabled !== undefined ? config.ntpEnabled : true;
    this.ntpServer = config.ntpServer || 'pool.ntp.org';
    this.ntpSyncIntervalMs = config.ntpSyncIntervalMs || 3600000;

    // Detect CMOS battery issue
    this.cmosIssue = this.detectCmosBatteryIssue();
    if (this.cmosIssue.detected) {
      console.warn(`⚠️  ${this.cmosIssue.message}`);
    }

    // Try NTP sync jika enabled
    if (this.ntpEnabled) {
      await this.tryNtpSync();
    }

    // Setup auto-sync
    this.setupAutoSync();

    // Log initial time source
    console.log(`[TimeService] Initialized with source: ${this.timeSource}`);
    if (this.timeSource === 'ntp') {
      console.log(`[TimeService] NTP offset: ${this.ntpOffset}ms`);
    } else if (this.timeSource === 'manual') {
      console.log(`[TimeService] Manual offset: ${this.manualOffset}ms`);
    }
  }

  /**
   * Detect CMOS battery issue
   * @returns {Object} - { detected: boolean, systemYear: number, message: string }
   */
  detectCmosBatteryIssue() {
    const now = Date.now();
    const year = new Date(now).getFullYear();
    
    if (year < 2020) {
      return {
        detected: true,
        systemYear: year,
        message: `CMOS battery mungkin rosak (tahun sistem: ${year})`
      };
    }
    
    return {
      detected: false,
      systemYear: year,
      message: ''
    };
  }

  /**
   * Set jam mesin (Raspberry Pi / Linux sahaja). Guna selepas NTP berjaya atau dari setting UI.
   * Pada macOS/Windows, skip (tiada sudo) supaya tiada prompt password semasa dev.
   * @param {number} timestampMs - Unix timestamp (ms) yang betul
   * @returns {boolean} - true jika berjaya
   */
  setSystemClock(timestampMs) {
    if (process.platform !== 'linux') {
      // Hanya set jam sistem pada Linux (Raspi). macOS/Windows guna offset dalam app sahaja.
      return false;
    }
    try {
      const d = new Date(timestampMs);
      const str = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0') + ':' +
        String(d.getSeconds()).padStart(2, '0');
      execSync(`sudo date -s "${str}"`, { stdio: 'pipe', timeout: 5000 });
      this.systemClockSet = true;
      return true;
    } catch (e) {
      this.systemClockSet = false;
      return false;
    }
  }

  /**
   * Try NTP sync (non-blocking, dengan error handling)
   */
  async tryNtpSync() {
    try {
      console.log('[TimeService] Attempting NTP sync...');
      const offset = await syncTimeWithRetry(this.ntpServer, 3, 5000);
      this.ntpOffset = offset;
      this.lastNtpSync = Date.now();
      this.isOnline = true;
      // if (this.setSystemClock(Date.now() + offset)) {
      //   this.ntpOffset = 0;
      //   console.log('[TimeService] ✓ System clock updated');
      // }
      // Guna offset dalam app sahaja; tiada setSystemClock() supaya tidak minta password (sudo) di mana-mana platform.
      this.updateTimeSource();
      console.log(`[TimeService] ✓ NTP sync successful, offset: ${offset}ms`);
      
      if (this.cmosIssue && this.cmosIssue.detected) {
        console.log('[TimeService] ✓ Time fixed via NTP sync');
      }
    } catch (error) {
      console.warn(`[TimeService] NTP sync failed: ${error.message}`);
      this.isOnline = false;
      this.updateTimeSource();
      
      // Jika CMOS issue dan NTP fail, check manual offset
      if (this.cmosIssue && this.cmosIssue.detected) {
        if (this.manualOffset !== 0) {
          console.log('[TimeService] ⚠️  Using manual offset (offline mode)');
        } else {
          console.error('[TimeService] 🔴 CRITICAL: Invalid time & no calibration available');
        }
      }
    }
  }

  /**
   * Setup auto-sync interval
   */
  setupAutoSync() {
    // Clear existing interval
    if (this.ntpSyncInterval) {
      clearInterval(this.ntpSyncInterval);
      this.ntpSyncInterval = null;
    }

    // Setup new interval jika NTP enabled
    if (this.ntpEnabled && this.ntpSyncIntervalMs > 0) {
      this.ntpSyncInterval = setInterval(() => {
        this.tryNtpSync();
      }, this.ntpSyncIntervalMs);
      // .unref() supaya interval ini tidak halang Node.js exit semasa graceful shutdown
      if (this.ntpSyncInterval.unref) this.ntpSyncInterval.unref();

      console.log(`[TimeService] Auto-sync enabled (interval: ${this.ntpSyncIntervalMs / 1000}s)`);
    }
  }

  /**
   * Update time source based on priority
   */
  updateTimeSource() {
    if (this.ntpOffset !== null) {
      this.timeSource = 'ntp';
    } else if (this.manualOffset !== 0) {
      this.timeSource = 'manual';
    } else {
      this.timeSource = 'system';
    }
  }

  /**
   * Get calibrated time (current timestamp dengan offset)
   */
  now() {
    // 3-layer fallback
    if (this.ntpOffset !== null) {
      // Priority 1: NTP time
      return Date.now() + this.ntpOffset;
    } else if (this.manualOffset !== 0) {
      // Priority 2: Manual offset
      return Date.now() + this.manualOffset;
    } else {
      // Priority 3: System time
      return Date.now();
    }
  }

  /**
   * Get time info untuk API response
   * @returns {Object} - Time info object
   */
  getTimeInfo() {
    const timestamp = this.systemClockSet ? Date.now() : this.now();
    return {
      timestamp,
      source: this.timeSource,
      offset: this.ntpOffset !== null ? this.ntpOffset : this.manualOffset,
      lastNtpSync: this.lastNtpSync,
      isOnline: this.isOnline,
      systemClockSet: this.systemClockSet,
      systemTime: Date.now(),
      cmosIssue: this.cmosIssue,
      config: {
        ntpEnabled: this.ntpEnabled,
        ntpServer: this.ntpServer,
        ntpSyncIntervalMs: this.ntpSyncIntervalMs,
        manualOffsetMs: this.manualOffset
      }
    };
  }

  /**
   * Force NTP sync (untuk API endpoint)
   * @returns {Promise<Object>} - Sync result
   */
  async syncNtp() {
    if (!this.ntpEnabled) {
      throw new Error('NTP sync is disabled in config');
    }

    try {
      await this.tryNtpSync();
      return {
        success: true,
        offset: this.ntpOffset,
        lastNtpSync: this.lastNtpSync,
        source: this.timeSource
      };
    } catch (error) {
      throw new Error(`NTP sync failed: ${error.message}`);
    }
  }

  /**
   * Update manual offset (untuk API endpoint)
   * @param {number} offsetMs - New manual offset (ms)
   * @returns {Promise<Object>} - Update result
   */
  async updateManualOffset(offsetMs) {
    if (typeof offsetMs !== 'number') {
      throw new Error('Offset must be a number');
    }

    // Validation: max offset ±7 days
    const MAX_OFFSET = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    if (Math.abs(offsetMs) > MAX_OFFSET) {
      throw new Error(`Offset too large (max: ±${MAX_OFFSET / 1000 / 60 / 60 / 24} days)`);
    }

    // Update manual offset
    this.manualOffset = offsetMs;
    this.updateTimeSource();

    // Save ke config.txt jika dataService available
    if (this.dataService) {
      try {
        // Read current config
        const content = await this.dataService.readFile('config');
        const lines = content.split('\n');
        
        // Find dan update DATETIME_MANUAL_OFFSET_MS line
        let found = false;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('DATETIME_MANUAL_OFFSET_MS|')) {
            lines[i] = `DATETIME_MANUAL_OFFSET_MS|${offsetMs}`;
            found = true;
            break;
          }
        }
        
        // Jika tidak jumpa, tambah line baru
        if (!found) {
          lines.push(`DATETIME_MANUAL_OFFSET_MS|${offsetMs}`);
        }
        
        // Write updated config
        await this.dataService.writeFile('config', lines.join('\n'));
        console.log(`[TimeService] Manual offset updated: ${offsetMs}ms`);
      } catch (error) {
        console.warn(`[TimeService] Failed to save manual offset to config: ${error.message}`);
      }
    }

    return {
      success: true,
      manualOffset: this.manualOffset,
      source: this.timeSource
    };
  }

  /**
   * Cleanup (stop auto-sync)
   */
  cleanup() {
    if (this.ntpSyncInterval) {
      clearInterval(this.ntpSyncInterval);
      this.ntpSyncInterval = null;
    }
    console.log('[TimeService] Cleaned up');
  }
}

module.exports = TimeService;
