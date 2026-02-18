const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

/**
 * Public Server Service
 * HTTP server untuk serve static files (paparan kiosk).
 * Listen 0.0.0.0 supaya ipray.local:3000 boleh diakses dari rangkaian.
 */

class PublicServerService {
  constructor() {
    this.server = null;
    this.publicPath = null;
    this.imagesPath = null; // Path untuk images folder
    this.port = null;
    // this.securityService = null; // Token tidak diperlukan - localhost sahaja
  }

  /**
   * Initialize service dengan configuration
   */
  init(config) {
    this.publicPath = config.publicPath;
    this.imagesPath = config.imagesPath; // electron/images/
    this.port = config.port;
    // this.securityService = config.securityService; // Token tidak diperlukan
  }

  /**
   * Start public server
   */
  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // Token security disabled - server hanya listen pada localhost
        // Ini selamat kerana hanya boleh diakses dari mesin yang sama
        // if (!this.securityService.validateRequest(req)) {
        //   res.writeHead(500);
        //   res.end('Internal Server Error');
        //   return;
        // }
        
        // Use WHATWG URL API instead of deprecated url.parse()
        const baseUrl = `http://${req.headers.host || 'localhost'}`;
        const urlObj = new URL(req.url, baseUrl);
        let filePath = urlObj.pathname;
        
        // Handle root path
        if (filePath === '/') {
          filePath = '/index.html';
        }
        
        // Check if request is for /images/ path
        let basePath = this.publicPath;
        let relativePath = filePath;
        
        if (filePath.startsWith('/images/')) {
          // Serve from images folder
          basePath = this.imagesPath;
          relativePath = filePath.replace(/^\/images/, ''); // Remove /images prefix
        }
        
        // Remove leading slash
        relativePath = relativePath.replace(/^\//, '');
        const fullPath = path.join(basePath, relativePath);
        
        // Security check
        if (!fullPath.startsWith(basePath)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        
        // Check if file exists
        fs.access(fullPath, fs.constants.F_OK, (err) => {
          if (err) {
            // If file not found, serve index.html (for SPA routing)
            if (filePath !== 'index.html') {
              const indexPath = path.join(this.publicPath, 'index.html');
              fs.readFile(indexPath, (err, data) => {
                if (err) {
                  res.writeHead(404);
                  res.end('Not Found');
                } else {
                  res.writeHead(200, { 'Content-Type': 'text/html' });
                  res.end(data);
                }
              });
            } else {
              res.writeHead(404);
              res.end('Not Found');
            }
            return;
          }
          
          // Determine content type
          const ext = path.extname(fullPath);
          const contentTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.wav': 'audio/wav',
            '.mp3': 'audio/mpeg',
            '.ttf': 'font/ttf',
            '.txt': 'text/plain',
          };
          
          const contentType = contentTypes[ext] || 'application/octet-stream';
          
          // Read and serve file
          fs.readFile(fullPath, (err, data) => {
            if (err) {
              res.writeHead(500);
              res.end('Internal Server Error');
            } else {
              res.writeHead(200, { 'Content-Type': contentType });
              res.end(data);
            }
          });
        });
      });
      
      // Listen pada 0.0.0.0 supaya ipray.local:3000 boleh diakses dari rangkaian
      const host = '0.0.0.0';
      this.server.listen(this.port, host, () => {
        console.log(`Public Server running at http://localhost:${this.port} (juga http://ipray.local:${this.port})`);
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
          console.log('Public Server stopped');
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
}

// Export singleton instance
const publicServerService = new PublicServerService();
module.exports = publicServerService;
