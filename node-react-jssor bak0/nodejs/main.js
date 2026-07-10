const fs = require('fs');
const path = require('path');

// Import services
const securityService = require('./services/securityService');
const DataService = require('./services/dataService');
const publicServerService = require('./services/publicServerService');
const apiServerService = require('./services/apiServerService');
const socketServerService = require('./services/socketServerService');

// Global constants
const PUBLIC_PORT = 3000;
const SETTING_PORT = 3001; // API Server dan Socket.IO share port ini

/**
 * Detect application mode
 * Mode 1: Development - Default mode (path dari nodejs/data + images)
 * Mode 2: Production - PROD_MODE=true (path dari process.cwd()/data + images)
 */
const PROD_MODE = process.env.PROD_MODE === 'true';
const DEV_MODE = !PROD_MODE;

// Determine paths based on mode
let publicPath, settingPath, dataPath, imagesPath;
let appMode;

if (DEV_MODE) {
  // Development mode (path dari nodejs/data + images)
  appMode = 'DEVELOPMENT';
  publicPath = path.join(__dirname, 'public');
  settingPath = path.join(__dirname, 'setting');
  dataPath = path.join(__dirname, 'data');
  imagesPath = path.join(__dirname, 'images');
} else {
  // Production mode (path dari process.cwd()/data + images)
  appMode = 'PRODUCTION';
  const appDir = process.cwd();
  publicPath = path.join(__dirname, 'public');
  settingPath = path.join(__dirname, 'setting');
  dataPath = path.join(appDir, 'data'); // Data di luar (boleh write)
  imagesPath = path.join(appDir, 'images'); // Images di luar (boleh write)
}

// Initialize data service (set on app ready)
let dataService = null;

/**
 * Start all servers
 */
async function startServers() {
  try {
    // Ensure data and images directories exist in production mode
    if (PROD_MODE) {
      try {
        // Get initial data path untuk copy initial files
        const initialDataPath = path.join(__dirname, 'data');
        const initialImagesPath = path.join(__dirname, 'images');
        
        // Create data directory jika tidak wujud
        if (!fs.existsSync(dataPath)) {
          fs.mkdirSync(dataPath, { recursive: true });
          console.log(`Created data directory: ${dataPath}`);
        }
        
        // Create images directory jika tidak wujud
        if (!fs.existsSync(imagesPath)) {
          fs.mkdirSync(imagesPath, { recursive: true });
          console.log(`Created images directory: ${imagesPath}`);
        }
        
        // Copy initial data files jika folder kosong (first run)
        const dataFiles = fs.existsSync(dataPath) ? fs.readdirSync(dataPath).filter(f => f.endsWith('.txt')) : [];
        if (dataFiles.length === 0 && fs.existsSync(initialDataPath)) {
          console.log('Copying initial data files...');
          const initialFiles = fs.readdirSync(initialDataPath).filter(f => f.endsWith('.txt'));
          initialFiles.forEach(file => {
            try {
              const src = path.join(initialDataPath, file);
              const dest = path.join(dataPath, file);
              fs.copyFileSync(src, dest);
              console.log(`  ✓ Copied: ${file}`);
            } catch (error) {
              console.error(`  ✗ Failed to copy ${file}:`, error.message);
            }
          });
        }
        
        // Create subdirectories untuk images
        const penceramahPath = path.join(imagesPath, 'penceramah');
        const slidesPath = path.join(imagesPath, 'slides');
        if (!fs.existsSync(penceramahPath)) {
          fs.mkdirSync(penceramahPath, { recursive: true });
        }
        if (!fs.existsSync(slidesPath)) {
          fs.mkdirSync(slidesPath, { recursive: true });
        }
        
        // Copy initial images jika folder kosong (first run)
        const penceramahFiles = fs.existsSync(penceramahPath) ? fs.readdirSync(penceramahPath) : [];
        const slidesFiles = fs.existsSync(slidesPath) ? fs.readdirSync(slidesPath) : [];
        const initialPenceramahPath = path.join(initialImagesPath, 'penceramah');
        const initialSlidesPath = path.join(initialImagesPath, 'slides');
        
        if (penceramahFiles.length === 0 && fs.existsSync(initialPenceramahPath)) {
          console.log('Copying initial penceramah images...');
          const initialImages = fs.readdirSync(initialPenceramahPath);
          initialImages.forEach(file => {
            try {
              const src = path.join(initialPenceramahPath, file);
              const dest = path.join(penceramahPath, file);
              if (fs.statSync(src).isFile()) {
                fs.copyFileSync(src, dest);
                console.log(`  ✓ Copied: penceramah/${file}`);
              }
            } catch (error) {
              console.error(`  ✗ Failed to copy penceramah/${file}:`, error.message);
            }
          });
        }
        
        if (slidesFiles.length === 0 && fs.existsSync(initialSlidesPath)) {
          console.log('Copying initial slides images...');
          const initialImages = fs.readdirSync(initialSlidesPath);
          initialImages.forEach(file => {
            try {
              const src = path.join(initialSlidesPath, file);
              const dest = path.join(slidesPath, file);
              if (fs.statSync(src).isFile()) {
                fs.copyFileSync(src, dest);
                console.log(`  ✓ Copied: slides/${file}`);
              }
            } catch (error) {
              console.error(`  ✗ Failed to copy slides/${file}:`, error.message);
            }
          });
        }
      } catch (error) {
        console.error('Error setting up production directories:', error);
      }
    }
    
    // Initialize and start public server (localhost only, tanpa token)
    publicServerService.init({
      publicPath,
      imagesPath, // Path untuk images folder (penceramah + slides)
      port: PUBLIC_PORT
      // securityService tidak diperlukan - server hanya listen pada localhost
    });
    await publicServerService.start();
    
    // Initialize data service with writable paths
    dataService = new DataService(dataPath);

    // Initialize Socket.IO service (will be attached to API server)
    socketServerService.init({
      port: SETTING_PORT // Socket.IO akan share port dengan API server
    });
    
    // Initialize and start API server (Socket.IO akan auto-attach selepas server start)
    apiServerService.init({
      port: SETTING_PORT,
      settingPath,
      dataService,
      securityService,
      socketServerService, // Pass socket server reference untuk broadcasting
      imagesPath // Pass images path untuk upload/delete
    });
    await apiServerService.start(); // Socket.IO akan auto-attach di sini
    
    console.log(`═══════════════════════════════════════`);
    console.log(`App Mode: ${appMode}`);
    console.log(`Data Path: ${dataPath}`);
    console.log(`Images Path: ${imagesPath}`);
    console.log(`Public Server: http://localhost:${PUBLIC_PORT}`);
    console.log(`API Server: http://localhost:${SETTING_PORT}`);
    if (PROD_MODE) {
      console.log(`✓ Production mode`);
    } else {
      console.log(`ℹ️  Development mode (set PROD_MODE=true for production)`);
    }
    console.log(`═══════════════════════════════════════`);
    console.log(`Servers started successfully!`);
  } catch (error) {
    console.error('Error starting servers:', error);
    process.exit(1);
  }
}

/**
 * Stop all servers
 */
async function stopServers() {
  try {
    await publicServerService.stop();
    await apiServerService.stop();
    await socketServerService.stop();
    console.log('All servers stopped.');
  } catch (error) {
    console.error('Error stopping servers:', error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await stopServers();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await stopServers();
  process.exit(0);
});

// Start servers
startServers();
