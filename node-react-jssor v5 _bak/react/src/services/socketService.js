import { io } from 'socket.io-client';
import { getSocketUrl } from './apiBase';
import audioService from './audioService.js';

/**
 * Socket.IO Service untuk React Frontend
 * Menguruskan real-time connection dengan Node.js Socket.IO server
 */

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  /**
   * Connect to Socket.IO server
   * @param {string} url - Socket.IO server URL (default: auto-detect dari environment)
   */
  connect(url = null) {
    // Auto-detect URL berdasarkan environment
    if (!url) {
      url = getSocketUrl();
    }
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    // Disconnect existing socket if any (suppress errors during cleanup)
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
      this.socket = null;
    }

    this.socket = io(url, {
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // Keep trying to reconnect
      timeout: 20000,
      forceNew: false,
      autoConnect: true
    });

    // Setup event listeners
    this.setupEventListeners();

    return this.socket;
  }

  /**
   * Setup default event listeners
   */
  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.notifyListeners('connect', { id: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      // Suppress disconnect logs untuk normal disconnects atau transport issues
      // (React StrictMode akan cause temporary disconnects during development)
      const suppressReasons = [
        'io client disconnect',
        'transport close',
        'transport error',
        'ping timeout'
      ];
      
      this.isConnected = false;
      this.notifyListeners('disconnect', { reason });
    });

    this.socket.on('connect_error', (error) => {
      // Suppress error logging untuk common connection errors (akan auto-reconnect)
      const errorMessage = error.message || String(error);
      if (errorMessage.includes('ECONNREFUSED') || 
          errorMessage.includes('WebSocket is closed') ||
          errorMessage.includes('transport close')) {
        // Server belum start atau connection closed, akan auto-reconnect
        return;
      }
      this.isConnected = false;
      this.notifyListeners('error', { error });
    });

    // Listen for data updates
    this.socket.on('data:updated', (data) => {
      audioService.play({ sound: 'notify', playCount: 1, volume: 1 }).catch(() => {});
      this.notifyListeners('data:updated', data);
    });

    // Listen for takwim refresh
    this.socket.on('takwim:refresh', (data) => {
      audioService.play({ sound: 'notify', playCount: 1, volume: 1 }).catch(() => {});
      this.notifyListeners('takwim:refresh', data);
    });

    // Listen for reboot
    this.socket.on('reboot', (data) => {
      audioService.play({ sound: 'notify', playCount: 1, volume: 1 }).catch(() => {});
      this.notifyListeners('reboot', data);
    });

    // Listen for time calibration events (test mode / offset) - React mesti terima untuk update masa
    this.socket.on('time-offset-updated', (data) => {
      console.log('[Socket] time-offset-updated diterima', data);
      this.notifyListeners('time-offset-updated', data);
    });
    this.socket.on('time-test-mode-enabled', (data) => {
      console.log('[Socket] time-test-mode-enabled diterima', data);
      this.notifyListeners('time-test-mode-enabled', data);
    });
    this.socket.on('time-test-mode-disabled', (data) => {
      console.log('[Socket] time-test-mode-disabled diterima', data);
      this.notifyListeners('time-test-mode-disabled', data);
    });
    this.socket.on('time-system-updated', (data) => {
      console.log('[Socket] time-system-updated diterima', data);
      this.notifyListeners('time-system-updated', data);
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect() {
    if (this.socket) {
      // Suppress disconnect errors during cleanup (React StrictMode double-invoke)
      const wasConnected = this.socket.connected;
      try {
        this.socket.disconnect();
      } catch (error) {
        // Ignore disconnect errors during cleanup
      }
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Subscribe to events
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Unsubscribe from event
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Notify all listeners for an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  notifyListeners(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          // Ignore listener errors
        }
      });
    }
  }

  /**
   * Emit event to server
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      // Ignore emit when not connected
    }
  }

  /**
   * Get connection status
   */
  getIsConnected() {
    return this.isConnected;
  }

  /**
   * Get socket instance
   */
  getSocket() {
    return this.socket;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
