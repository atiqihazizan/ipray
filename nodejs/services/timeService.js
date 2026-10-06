const { execSync } = require('child_process');

/**
 * Time Service
 * Guna system clock terus (Linux systemd-timesyncd handle NTP sync).
 * Manual set dari UI untuk user adjust masa. CMOS battery detection untuk validation.
 */

class TimeService {
  constructor() {
    this.cmosIssue = null;            // CMOS battery issue detection result
    this.dataService = null;          // DataService reference (untuk read/write config)
  }

  /**
   * Initialize time service
   * @param {Object} config - Configuration object
   * @param {Object} config.dataService - DataService instance
   */
  async init(config = {}) {
    this.dataService = config.dataService;

    // Detect CMOS battery issue
    this.cmosIssue = this.detectCmosBatteryIssue();
    if (this.cmosIssue.detected) {
      console.warn(`⚠️  ${this.cmosIssue.message}`);
    }

    console.log('[TimeService] Initialized - using system clock (Linux NTP handled by systemd-timesyncd)');
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
   * Set jam mesin (Raspberry Pi / Linux sahaja). Guna dari setting UI.
   * Pada macOS/Windows, skip (tiada sudo) supaya tiada prompt password semasa dev.
   * @param {number} timestampMs - Unix timestamp (ms) yang betul
   * @returns {boolean} - true jika berjaya
   */
  setSystemClock(timestampMs) {
    if (process.platform !== 'linux') {
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
      execSync(`sudo hwclock -w`, { stdio: 'pipe', timeout: 5000 });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get current time (system clock)
   */
  now() {
    return Date.now();
  }

  /**
   * Get time info untuk API response
   * @returns {Object} - Time info object
   */
  getTimeInfo() {
    return {
      timestamp: Date.now(),
      source: 'system',
      systemTime: Date.now(),
      cmosIssue: this.cmosIssue
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    console.log('[TimeService] Cleaned up');
  }
}

module.exports = TimeService;
