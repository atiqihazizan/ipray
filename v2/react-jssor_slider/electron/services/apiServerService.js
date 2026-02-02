const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * API Server Service
 * Express server untuk API endpoints (port 3001)
 * Socket.IO juga attached ke server ini untuk real-time updates
 */

class ApiServerService {
  constructor() {
    this.app = null;
    this.server = null;
    this.port = null;
    this.settingPath = null;
    this.dataService = null;
    this.securityService = null;
    this.socketServerService = null; // Add socket server reference
    this.imagesPath = null; // Path untuk images folder
  }

  /**
   * Initialize service dengan configuration
   */
  init(config) {
    this.port = config.port;
    this.settingPath = config.settingPath;
    this.dataService = config.dataService;
    this.securityService = config.securityService;
    this.socketServerService = config.socketServerService; // Store socket server reference
    this.imagesPath = config.imagesPath; // Store images path
  }

  /**
   * Setup Express app dengan routes
   */
  setupApp() {
    this.app = express();
    
    // Middleware - IMPORTANT: urlencoded mesti sebelum multer
    this.app.use(express.urlencoded({ extended: true })); // Untuk parse form data (category)
    this.app.use(express.json());
    this.app.use(express.static(this.settingPath));
    
    // CORS untuk allow requests (including WebSocket upgrade)
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type, X-Access-Token, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Credentials', 'true');
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      
      next();
    });
    
    // Setup all routes
    this.setupRoutes();
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Get access token (untuk development/testing)
    this.app.get('/api/token', (req, res) => {
      res.json({ 
        token: this.securityService.getAccessToken(),
        note: 'Gunakan token ini dalam header X-Access-Token untuk akses port 3000 dari browser'
      });
    });
    
    // List all data files
    this.app.get('/api/files', async (req, res) => {
      try {
        const files = await this.dataService.listFiles();
        res.json({ files });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get raw file content
    this.app.get('/api/files/:filename', async (req, res) => {
      try {
        const filename = req.params.filename;
        const content = await this.dataService.readFile(filename);
        res.json({ filename: `${filename}.txt`, content });
      } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Save entire file content
    this.app.post('/api/files/:filename', async (req, res) => {
      try {
        const filename = req.params.filename;
        const { content } = req.body;
        
        if (content === undefined) {
          return res.status(400).json({ error: 'Content is required' });
        }
        
        const result = await this.dataService.writeFile(filename, content);
        
        // Broadcast update via Socket.IO (hanya takwim:refresh, cukup untuk trigger reload)
        if (this.socketServerService) {
          this.socketServerService.broadcastTakwimRefresh();
          console.log(`📡 Broadcasting update for ${filename} (file saved)`);
        }
        
        res.json(result);
      } catch (error) {
        console.error('Error writing file:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get parsed data as array
    this.app.get('/api/data/:filename', async (req, res) => {
      try {
        const filename = req.params.filename;
        const content = await this.dataService.readFile(filename);
        const parsed = this.dataService.parseFileContent(filename, content);
        const columns = this.dataService.getColumns(filename);
        
        res.json({ data: parsed, columns });
      } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Update single row
    this.app.put('/api/data/:filename/:id', async (req, res) => {
      try {
        const filename = req.params.filename;
        const id = parseInt(req.params.id);
        const { row } = req.body;
        
        if (!row) {
          return res.status(400).json({ error: 'Row data is required' });
        }
        
        const result = await this.dataService.updateRow(filename, id, row);
        
        // Broadcast update via Socket.IO (hanya takwim:refresh, cukup untuk trigger reload)
        if (this.socketServerService) {
          this.socketServerService.broadcastTakwimRefresh();
          console.log(`📡 Broadcasting update for ${filename} row #${id}`);
        }
        
        res.json(result);
      } catch (error) {
        console.error('Error updating row:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Insert new row
    this.app.post('/api/data/:filename/insert', async (req, res) => {
      try {
        const filename = req.params.filename;
        const { row, position = 'end' } = req.body;
        
        if (!row) {
          return res.status(400).json({ error: 'Row data is required' });
        }
        
        const result = await this.dataService.insertRow(filename, row, position);
        
        // Broadcast update via Socket.IO (hanya takwim:refresh, cukup untuk trigger reload)
        if (this.socketServerService) {
          this.socketServerService.broadcastTakwimRefresh();
          console.log(`📡 Broadcasting insert for ${filename}`);
        }
        
        res.json(result);
      } catch (error) {
        console.error('Error inserting row:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Delete row
    this.app.delete('/api/data/:filename/:id', async (req, res) => {
      try {
        const filename = req.params.filename;
        const id = parseInt(req.params.id);
        
        const result = await this.dataService.deleteRow(filename, id);
        
        // Broadcast update via Socket.IO (hanya takwim:refresh, cukup untuk trigger reload)
        if (this.socketServerService) {
          this.socketServerService.broadcastTakwimRefresh();
          console.log(`📡 Broadcasting delete for ${filename} row #${id}`);
        }
        
        res.json(result);
      } catch (error) {
        console.error('Error deleting row:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Configure multer for file uploads
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        try {
          const category = req.query.category || req.body?.category || 'penceramah';
          const destPath = path.join(this.imagesPath, category);
          
          // Create directory if it doesn't exist
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          
          cb(null, destPath);
        } catch (error) {
          console.error('Error setting destination:', error);
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        try {
          const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
          cb(null, sanitizedName);
        } catch (error) {
          console.error('Error setting filename:', error);
          cb(error);
        }
      }
    });
    
    const upload = multer({
      storage: storage,
      limits: { 
        fileSize: 10 * 1024 * 1024 // 10MB limit
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Hanya fail image dibenarkan (JPEG, PNG, GIF, WebP, SVG). Diterima: ${file.mimetype}`));
        }
      }
    });
    
    // Upload image endpoint
    this.app.post('/api/images/upload', upload.single('image'), (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'Tiada fail dimuat naik. Pastikan fail image dipilih.' });
        }
        
        const category = req.query.category || req.body.category || 'penceramah';
        const actualPath = req.file.path;
        
        // Verify file was saved correctly
        if (!fs.existsSync(actualPath)) {
          console.error('File tidak wujud selepas upload:', actualPath);
          return res.status(500).json({ error: 'Fail tidak dapat disimpan' });
        }
        
        // Verify file size > 0
        const stats = fs.statSync(actualPath);
        if (stats.size === 0) {
          console.error('File kosong selepas upload');
          fs.unlinkSync(actualPath);
          return res.status(500).json({ error: 'Fail kosong. Upload mungkin gagal.' });
        }
        
        const imagePath = `/images/${category}/${req.file.filename}`;
        
        res.json({
          success: true,
          path: imagePath,
          filename: req.file.filename,
          category: category
        });
        
        // Broadcast update via Socket.IO untuk trigger React reload selepas response dikirim
        // Delay sedikit untuk ensure response sudah dikirim sebelum broadcast
        setTimeout(() => {
          if (this.socketServerService) {
            this.socketServerService.broadcastTakwimRefresh();
          }
        }, 100);
      } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: error.message || 'Gagal memuat naik image' });
      }
    });
    
    // Error handler untuk multer - mesti di akhir setupRoutes
    // Error dari multer middleware akan di-catch di sini
    
    // Delete image file endpoint
    this.app.delete('/api/images/delete', (req, res) => {
      try {
        const { imagePath } = req.body;
        
        if (!imagePath) {
          return res.status(400).json({ error: 'Image path diperlukan' });
        }
        
        // Remove /images/ prefix dan build full path
        const relativePath = imagePath.replace(/^\/images\//, '');
        const fullPath = path.join(this.imagesPath, relativePath);
        
        // Security check - ensure path is within imagesPath
        if (!fullPath.startsWith(this.imagesPath)) {
          return res.status(403).json({ error: 'Path tidak dibenarkan' });
        }
        
        // Check if file exists
        if (!fs.existsSync(fullPath)) {
          return res.status(404).json({ error: 'Fail tidak ditemui' });
        }
        
        // Delete file
        fs.unlinkSync(fullPath);
        
        res.json({
          success: true,
          message: 'Fail berjaya dipadam'
        });
        
        // Broadcast update via Socket.IO untuk trigger React reload selepas response dikirim
        setTimeout(() => {
          if (this.socketServerService) {
            this.socketServerService.broadcastTakwimRefresh();
          }
        }, 100);
      } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Download image from URL endpoint
    this.app.post('/api/images/download', async (req, res) => {
      try {
        const { imageUrl, category = 'penceramah', filename } = req.body;
        
        if (!imageUrl) {
          return res.status(400).json({ error: 'Image URL diperlukan' });
        }
        
        // Validate URL
        let parsedUrl;
        try {
          parsedUrl = new URL(imageUrl);
        } catch (error) {
          return res.status(400).json({ error: 'URL tidak sah' });
        }
        
        // Only allow http and https
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          return res.status(400).json({ error: 'Hanya HTTP/HTTPS URL dibenarkan' });
        }
        
        // Determine destination folder
        const destPath = path.join(this.imagesPath, category);
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        
        // Generate filename
        let finalFilename = filename;
        if (!finalFilename) {
          // Extract filename from URL or generate one
          const urlPath = parsedUrl.pathname;
          const urlFilename = urlPath.split('/').pop() || 'image';
          const ext = path.extname(urlFilename) || '.jpg';
          finalFilename = `downloaded_${Date.now()}${ext}`;
        }
        
        // Sanitize filename
        finalFilename = finalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fullPath = path.join(destPath, finalFilename);
        
        // Download file
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        await new Promise((resolve, reject) => {
          const file = fs.createWriteStream(fullPath);
          
          const request = client.get(imageUrl, (response) => {
            // Check content type
            const contentType = response.headers['content-type'] || '';
            if (!contentType.startsWith('image/')) {
              file.close();
              fs.unlinkSync(fullPath);
              return reject(new Error('URL bukan image file'));
            }
            
            // Check status code
            if (response.statusCode !== 200) {
              file.close();
              fs.unlinkSync(fullPath);
              return reject(new Error(`HTTP ${response.statusCode}: Gagal memuat turun`));
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
              file.close();
              resolve();
            });
          });
          
          request.on('error', (error) => {
            file.close();
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
            reject(error);
          });
          
          file.on('error', (error) => {
            file.close();
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
            reject(error);
          });
          
          // Timeout after 30 seconds
          request.setTimeout(30000, () => {
            request.destroy();
            file.close();
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
            reject(new Error('Request timeout'));
          });
        });
        
        const imagePath = `/images/${category}/${finalFilename}`;
        
        res.json({
          success: true,
          path: imagePath,
          filename: finalFilename,
          category: category
        });
        
        // Broadcast update via Socket.IO untuk trigger React reload selepas response dikirim
        setTimeout(() => {
          if (this.socketServerService) {
            this.socketServerService.broadcastTakwimRefresh();
          }
        }, 100);
      } catch (error) {
        console.error('Error downloading image:', error);
        res.status(500).json({ error: error.message || 'Gagal memuat turun image' });
      }
    });
    
    // Error handler untuk multer
    this.app.use((error, req, res, next) => {
      if (error instanceof multer.MulterError) {
        console.error('Multer error:', error);
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Fail terlalu besar. Maksimum 10MB.' });
        }
        return res.status(400).json({ error: `Upload error: ${error.message}` });
      }
      if (error) {
        console.error('Upload error:', error);
        return res.status(400).json({ error: error.message || 'Gagal memuat naik image' });
      }
      next();
    });
  }

  /**
   * Start API server
   */
  start() {
    return new Promise((resolve, reject) => {
      // Setup app if not already done
      if (!this.app) {
        this.setupApp();
      }
      
      // Listen on 0.0.0.0 to allow access from outside (network access)
      // Use 'localhost' if you only want local access
      const host = '0.0.0.0'; // Allow access from network
      this.server = this.app.listen(this.port, host, () => {
        console.log(`API Server running at http://${host}:${this.port}`);
        console.log(`Server accessible from network at http://localhost:${this.port}`);
        
        // Attach Socket.IO to this server after it starts
        if (this.socketServerService) {
          try {
            this.socketServerService.attachToServer(this.server);
          } catch (error) {
            console.error('Error attaching Socket.IO to server:', error);
            // Don't reject - server is running, just Socket.IO attachment failed
          }
        }
        
        resolve();
      });

      this.server.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Stop server
   */
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('API Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get server instance
   */
  getServer() {
    return this.server;
  }

  /**
   * Get Express app
   */
  getApp() {
    return this.app;
  }
}

// Export singleton instance
const apiServerService = new ApiServerService();
module.exports = apiServerService;
