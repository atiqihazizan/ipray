const { syncTimeWithRetry } = require('../utils/ntpClient');

/**
 * Time Service
 * Hybrid time service dengan 3-layer fallback:
 * 1. NTP time (online, auto-sync)
 * 2. Manual offset dari config.txt (offline calibration)
 * 3. System time (fallback terakhir)
 */

class TimeService {
  constructor() {
    this.ntpOffset = null;           // Offset dari NTP server (ms)
    this.manualOffset = 0;            // Manual offset dari config (ms)
    this.lastNtpSync = null;          // Timestamp last successful NTP sync
    this.ntpSyncInterval = null;      // Auto-sync interval timer
    this.isOnline = false;            // Internet connectivity status
    this.timeSource = 'system';       // Current time source: 'ntp' | 'manual' | 'system'
    this.cmosIssue = null;            // CMOS battery issue detection result
    
    // Test/Debug mode (masa test bermula dari testTimestamp, kemudian jalan seperti biasa)
    this.isTestMode = false;
    this.testTimestamp = null;        // Masa "permulaan" test (e.g. 6:32)
    this.testModeStartRealTime = null; // Date.now() bila test mode diaktifkan
    this.savedOffset = null;
    
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
   * Try NTP sync (non-blocking, dengan error handling)
   */
  async tryNtpSync() {
    try {
      console.log('[TimeService] Attempting NTP sync...');
      const offset = await syncTimeWithRetry(this.ntpServer, 3, 5000);
      this.ntpOffset = offset;
      this.lastNtpSync = Date.now();
      this.isOnline = true;
      this.updateTimeSource();
      console.log(`[TimeService] ✓ NTP sync successful, offset: ${offset}ms`);
      
      // Jika CMOS issue detected dan NTP sync berjaya, log success message
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
   * Dalam test mode: masa bermula dari testTimestamp dan jalan mengikut masa sebenar (6:32 -> 6:33 -> 6:34)
   */
  now() {
    if (this.isTestMode && this.testTimestamp !== null && this.testModeStartRealTime !== null) {
      const elapsed = Date.now() - this.testModeStartRealTime;
      return this.testTimestamp + elapsed;
    }
    
    // Normal mode - 3-layer fallback
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
    return {
      timestamp: this.now(),
      source: this.isTestMode ? 'test' : this.timeSource,
      offset: this.ntpOffset !== null ? this.ntpOffset : this.manualOffset,
      lastNtpSync: this.lastNtpSync,
      isOnline: this.isOnline,
      systemTime: Date.now(),
      cmosIssue: this.cmosIssue,
      isTestMode: this.isTestMode,
      testTimestamp: this.testTimestamp,
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
   * Enable test mode dengan fixed timestamp
   * @param {number} timestamp - Fixed timestamp untuk test (ms)
   * @returns {Object} - Test mode result
   */
  enableTestMode(timestamp) {
    if (typeof timestamp !== 'number') {
      throw new Error('Timestamp must be a number');
    }

    // Save current state
    if (!this.isTestMode) {
      this.savedOffset = this.ntpOffset !== null ? this.ntpOffset : this.manualOffset;
    }

    // Enable test mode (masa akan jalan dari timestamp ini)
    this.isTestMode = true;
    this.testTimestamp = timestamp;
    this.testModeStartRealTime = Date.now();

    console.log(`[TimeService] Test mode enabled, masa bermula: ${new Date(timestamp).toISOString()}`);

    return {
      success: true,
      isTestMode: true,
      testTimestamp: this.testTimestamp,
      testTime: new Date(timestamp).toISOString()
    };
  }

  /**
   * Disable test mode dan restore normal operation
   * @returns {Object} - Reset result
   */
  disableTestMode() {
    this.isTestMode = false;
    this.testTimestamp = null;
    this.testModeStartRealTime = null;

    console.log('[TimeService] Test mode disabled');

    return {
      success: true,
      isTestMode: false,
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
    
    // Disable test mode jika active
    if (this.isTestMode) {
      this.disableTestMode();
    }
    
    console.log('[TimeService] Cleaned up');
  }
}

module.exports = TimeService;
