/**
 * Socket.IO Service untuk Electron
 * Menguruskan real-time communication antara setting panel dan React frontend
 */

class SocketService {
  constructor() {
    this.io = null;
    this.clients = new Map();
  }

  /**
   * Initialize Socket.IO server
   * @param {object} io - Socket.IO server instance
   */
  init(io) {
    this.io = io;
    console.log('✅ SocketService initialized');
  }

  /**
   * Broadcast data update to all connected clients
   * @param {string} fileName - Nama fail yang dikemaskini
   * @param {object} data - Data yang dikemaskini
   */
  broadcastDataUpdate(fileName, data) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized');
      return;
    }

    this.io.emit('data:updated', {
      fileName,
      data,
      timestamp: Date.now()
    });

    console.log(`📡 Broadcast data update: ${fileName}`);
  }

  /**
   * Broadcast takwim refresh event
   * Ini akan trigger React frontend untuk reload takwim data
   */
  broadcastTakwimRefresh() {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized');
      return;
    }

    this.io.emit('takwim:refresh', {
      timestamp: Date.now()
    });

    console.log('📡 Broadcast takwim refresh');
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount() {
    if (!this.io) return 0;
    return this.io.sockets.sockets.size;
  }

  /**
   * Get all connected client IDs
   */
  getConnectedClientIds() {
    if (!this.io) return [];
    return Array.from(this.io.sockets.sockets.keys());
  }
}

// Export singleton instance
const socketService = new SocketService();
module.exports = socketService;
