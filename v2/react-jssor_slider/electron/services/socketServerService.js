const http = require('http');
const { Server } = require('socket.io');

/**
 * Socket.IO Server Service
 * Real-time communication server (attached to Express server on port 3001)
 */

class SocketServerService {
  constructor() {
    this.httpServer = null;
    this.io = null;
    this.port = null;
    this.isAttached = false; // Track if attached to existing server
  }

  /**
   * Initialize service dengan configuration
   */
  init(config) {
    this.port = config.port;
  }

  /**
   * Attach Socket.IO to existing HTTP server (Express server)
   * @param {http.Server} httpServer - Express HTTP server instance
   */
  attachToServer(httpServer) {
    if (!httpServer) {
      throw new Error('HTTP server is required');
    }

    this.httpServer = httpServer;
    this.isAttached = true; // Mark as attached to existing server
    
    this.io = new Server(this.httpServer, {
      cors: {
        origin: '*', // Allow all origins untuk access dari luar
        methods: ['GET', 'POST'],
        credentials: false // Set false untuk allow all origins
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true, // Support older Socket.IO clients
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    // Setup event handlers
    this.setupEventHandlers();
    
    console.log(`Socket.IO attached to server on port ${this.port || '3001'}`);
    console.log(`Real-time updates enabled for data synchronization`);
    console.log(`Socket.IO CORS: All origins allowed`);
  }

  /**
   * Start Socket.IO server (standalone mode - for backward compatibility)
   * @deprecated Use attachToServer() instead
   */
  start() {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer();
      this.isAttached = false; // Mark as standalone server
      
      this.io = new Server(this.httpServer, {
        cors: {
          origin: '*', // Allow all origins untuk access dari luar
          methods: ['GET', 'POST'],
          credentials: false
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true,
        pingTimeout: 60000,
        pingInterval: 25000
      });
      
      // Setup event handlers
      this.setupEventHandlers();
      
      // Listen on 0.0.0.0 to allow access from network
      const host = '0.0.0.0';
      this.httpServer.listen(this.port, host, () => {
        console.log(`Socket.IO Server running at http://${host}:${this.port}`);
        console.log(`Real-time updates enabled for data synchronization`);
        console.log(`Socket.IO CORS: All origins allowed`);
        resolve();
      });

      this.httpServer.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Socket.IO client connected: ${socket.id}`);
      
      // Handle data update from setting panel
      socket.on('data:update', (data) => {
        console.log(`📡 Data update received:`, data);
        
        // Broadcast to all connected clients (kecuali sender)
        socket.broadcast.emit('data:updated', {
          fileName: data.fileName,
          rowId: data.rowId,
          timestamp: data.timestamp || Date.now()
        });
        
        // Also broadcast to React frontend with specific event
        this.io.emit('takwim:refresh', {
          fileName: data.fileName,
          timestamp: Date.now()
        });
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`🔌 Socket.IO client disconnected: ${socket.id}`);
      });
      
      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket.IO error:`, error);
      });
    });
  }

  /**
   * Broadcast data update event
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
   * Stop server
   * Note: If attached to Express server, only close Socket.IO, not the HTTP server
   */
  stop() {
    return new Promise((resolve) => {
      if (this.io) {
        this.io.close();
        this.io = null;
      }
      
      // Only close HTTP server if we created it (standalone mode)
      // If attached to Express server, don't close it here
      if (this.isAttached) {
        // Attached to existing server - just close Socket.IO
        console.log('Socket.IO detached from server');
        this.httpServer = null;
        this.isAttached = false;
        resolve();
      } else if (this.httpServer && this.httpServer.listening) {
        // Standalone server - close the HTTP server
        this.httpServer.close(() => {
          console.log('Socket.IO Server stopped');
          this.httpServer = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get Socket.IO instance
   */
  getIO() {
    return this.io;
  }

  /**
   * Get HTTP server instance
   */
  getHttpServer() {
    return this.httpServer;
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount() {
    if (!this.io) return 0;
    return this.io.sockets.sockets.size;
  }
}

// Export singleton instance
const socketServerService = new SocketServerService();
module.exports = socketServerService;
