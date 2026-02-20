import { getApiBase } from './apiBase';

/**
 * Time Service (Client-side)
 * Fetch calibrated time dari server dan cache offset dalam memory.
 * Bila offline: kekal guna offset dari sync terakhir (masa tak ikut jam peranti yang mungkin lambat).
 * Fallback ke Date.now() hanya bila belum pernah sync berjaya (first load offline).
 */

class TimeService {
  constructor() {
    this.offset = 0;                  // Time offset dari server (ms)
    this.lastSync = null;             // Timestamp last successful sync
    this.syncInterval = null;         // Auto-refresh interval timer
    this.syncIntervalMs = 300000;     // 5 minit default
    this.isInitialized = false;       // Flag untuk track initialization
    this.timeSource = 'system';       // Time source: 'ntp' | 'manual' | 'system' | 'test'
    this.usingFallback = false;       // Flag jika guna fallback (Date.now)
    
    // Test mode (masa test jalan dari base, kemudian naik seperti biasa)
    this.isTestMode = false;
    this.testTimestamp = null;           // Masa "base" (dari server saat sync)
    this.testModeStartRealTime = null;    // Date.now() bila kita set test state
  }

  /**
   * Initialize time service
   * Fetch calibrated time dari server
   */
  async init() {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.syncWithServer();
      this.isInitialized = true;
      
      // Setup auto-refresh setiap 5 minit
      this.setupAutoSync();
      
      console.log('[TimeService] Initialized successfully');
    } catch (error) {
      console.warn('[TimeService] Init failed, using system time:', error.message);
      this.usingFallback = true;
      this.isInitialized = true;
    }
  }

  /**
   * Sync time dengan server
   */
  async syncWithServer() {
    try {
      const API_BASE = getApiBase();
      const res = await fetch(`${API_BASE}/time?t=${Date.now()}`);
      
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      
      const data = await res.json();
      
      // Calculate offset: server timestamp - local timestamp
      const localTime = Date.now();
      this.offset = data.timestamp - localTime;
      this.lastSync = localTime;
      this.timeSource = data.source || 'system';
      this.usingFallback = false;
      
      // Update test mode: guna timestamp semasa dari server sebagai base, masa akan jalan
      if (data.isTestMode) {
        this.isTestMode = true;
        this.testTimestamp = data.timestamp; // masa semasa dari server (sudah advance)
        this.testModeStartRealTime = Date.now();
      } else {
        this.isTestMode = false;
        this.testTimestamp = null;
        this.testModeStartRealTime = null;
      }
      
      console.log(`[TimeService] Synced with server (source: ${this.timeSource}, offset: ${this.offset}ms)`);
    } catch (error) {
      console.warn('[TimeService] Sync failed:', error.message);
      // Offline: hanya guna fallback jika belum pernah sync berjaya; jika ada lastSync, kekal guna cached offset
      if (this.lastSync == null) {
        this.usingFallback = true;
      }
      throw error;
    }
  }

  /**
   * Setup auto-sync interval
   */
  setupAutoSync() {
    // Clear existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Setup new interval
    this.syncInterval = setInterval(() => {
      this.syncWithServer().catch(() => {
        // Silent fail - akan guna cached offset
      });
    }, this.syncIntervalMs);
  }

  /**
   * Get calibrated time
   * @returns {number} - Calibrated timestamp (ms)
   */
  now() {
    // Test mode: masa bermula dari base dan jalan (6:32 -> 6:33 -> 6:34)
    if (this.isTestMode && this.testTimestamp !== null && this.testModeStartRealTime !== null) {
      const elapsed = Date.now() - this.testModeStartRealTime;
      return this.testTimestamp + elapsed;
    }
    
    if (this.usingFallback) {
      // Fallback: guna system time
      return Date.now();
    }
    
    // Return calibrated time
    return Date.now() + this.offset;
  }

  /**
   * Get time info
   * @returns {Object} - Time info object
   */
  getTimeInfo() {
    return {
      timestamp: this.now(),
      offset: this.offset,
      lastSync: this.lastSync,
      timeSource: this.timeSource,
      usingFallback: this.usingFallback,
      systemTime: Date.now()
    };
  }

  /**
   * Force sync dengan server
   * @returns {Promise<Object>} - Sync result
   */
  async forceSync() {
    try {
      await this.syncWithServer();
      return {
        success: true,
        offset: this.offset,
        timeSource: this.timeSource
      };
    } catch (error) {
      throw new Error(`Sync failed: ${error.message}`);
    }
  }

  /**
   * Enable test mode dengan fixed timestamp
   * @param {number} timestamp - Fixed timestamp untuk test (ms)
   * @returns {Promise<Object>} - Test mode result
   */
  async enableTestMode(timestamp) {
    try {
      const API_BASE = getApiBase();
      const res = await fetch(`${API_BASE}/time/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp })
      });
      
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      
      const result = await res.json();
      
      // Update local state
      this.isTestMode = true;
      this.testTimestamp = timestamp;
      this.timeSource = 'test';
      
      console.log('[TimeService] Test mode enabled');
      return result;
    } catch (error) {
      console.error('[TimeService] Failed to enable test mode:', error);
      throw error;
    }
  }

  /**
   * Disable test mode (reset)
   * @returns {Promise<Object>} - Reset result
   */
  async disableTestMode() {
    try {
      const API_BASE = getApiBase();
      const res = await fetch(`${API_BASE}/time/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      
      const result = await res.json();
      
      // Update local state
      this.isTestMode = false;
      this.testTimestamp = null;
      
      // Sync dengan server untuk dapat actual time
      await this.syncWithServer();
      
      console.log('[TimeService] Test mode disabled');
      return result;
    } catch (error) {
      console.error('[TimeService] Failed to disable test mode:', error);
      throw error;
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('[TimeService] Cleaned up');
  }
}

// Export singleton instance
const timeService = new TimeService();

export default timeService;
