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
    this.isAttached = false;
    this.deathAnnouncementData = null;
    this.liveStreamData = null;
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
        // console.log(`Socket.IO Server running at http://${host}:${this.port}`);
        // console.log(`Real-time updates enabled for data synchronization`);
        // console.log(`Socket.IO CORS: All origins allowed`);
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
        const fileName = data.fileName || data.filename;
        if (fileName === 'takwim') {
          this.io.emit('takwim:refresh', { fileName, timestamp: Date.now() });
        } else {
          socket.broadcast.emit('data:updated', {
            fileName: data.fileName,
            rowId: data.rowId,
            timestamp: data.timestamp || Date.now()
          });
        }
      });
      
      // Forward ACK dari React ke Setting panel (dan semua client lain)
      socket.on('data:ack', (data) => {
        socket.broadcast.emit('data:ack', {
          fileName: data.fileName,
          status: data.status || 'received',
          timestamp: data.timestamp || Date.now()
        });
      });

      // Handle reboot request from admin panel
      socket.on('reboot', () => {
        // console.log(`🔄 Reboot requested by client: ${socket.id}`);
        
        // Broadcast reboot event to all clients EXCEPT sender (React will receive and reload window)
        socket.broadcast.emit('reboot', {
          timestamp: Date.now()
        });
        
        // Execute reboot command after delay (to allow React to reload window first)
        // setTimeout(() => {
        //   const { exec } = require('child_process');
        //   exec('sudo reboot', (error, stdout, stderr) => {
        //     if (error) {
        //       console.error('Reboot error:', error);
        //     }
        //   });
        // }, 2000); // Delay 2 seconds untuk React reload window dulu
      });

      // Handle test sound request from admin panel
      socket.on('test-sound', () => {
        socket.broadcast.emit('test-sound', {
          timestamp: Date.now()
        });
      });
      
      // Handle kematian announcement
      socket.on('kematian:update', (data) => {
        console.log(`📡 Kematian update received:`, data);
        this.deathAnnouncementData = { ...data, active: true, timestamp: Date.now() };
        this.io.emit('kematian:updated', this.deathAnnouncementData);
      });

      socket.on('kematian:clear', () => {
        console.log(`📡 Kematian cleared`);
        this.deathAnnouncementData = null;
        this.io.emit('kematian:cleared', { timestamp: Date.now() });
      });

      // Handle live streaming
      socket.on('live:start', (data) => {
        console.log(`📡 Live stream start:`, data);
        this.liveStreamData = { ...data, active: true, timestamp: Date.now() };
        this.io.emit('live:started', this.liveStreamData);
      });

      socket.on('live:stop', () => {
        console.log(`📡 Live stream stopped`);
        this.liveStreamData = null;
        this.io.emit('live:stopped', { timestamp: Date.now() });
      });

      // Send current state to newly connected client
      if (this.deathAnnouncementData) {
        socket.emit('kematian:updated', this.deathAnnouncementData);
      }
      if (this.liveStreamData) {
        socket.emit('live:started', this.liveStreamData);
      }

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
   * Broadcast custom event
   */
  broadcastEvent(eventName, data) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized');
      return;
    }

    this.io.emit(eventName, {
      ...data,
      timestamp: Date.now()
    });

    console.log(`📡 Broadcast event: ${eventName}`);
  }

  /**
   * Broadcast system reboot event
   * This will trigger React app to reload window before system reboots
   */
  broadcastSystemReboot() {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized');
      return;
    }

    this.io.emit('system:reboot', {
      timestamp: Date.now()
    });

    console.log('📡 Broadcast system reboot - React will reload window');
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
