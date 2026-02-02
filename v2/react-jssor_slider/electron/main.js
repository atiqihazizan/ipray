const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

// Import services
const securityService = require('./services/securityService');
const DataService = require('./services/dataService');
const windowService = require('./services/windowService');
const publicServerService = require('./services/publicServerService');
const apiServerService = require('./services/apiServerService');
const socketServerService = require('./services/socketServerService');

// Global constants
const PUBLIC_PORT = 3000;
const SETTING_PORT = 3001; // API Server dan Socket.IO share port ini

/**
 * Detect application mode
 * Mode 1: Development (absolutely) - DEV_MODE=true atau (!app.isPackaged && PRE_PROD_MODE !== true && PROD_MODE !== true)
 * Mode 2: Develop + Pre Production - PRE_PROD_MODE=true (still local, path dari electron/data + images)
 * Mode 3: Production + ASAR - PROD_MODE=true atau app.isPackaged === true (path dari resources/data + images)
 * 
 * PROD_MODE environment variable boleh digunakan untuk force production mode secara manual
 */
const FORCE_PROD_MODE = process.env.PROD_MODE === 'true';
const PRE_PROD_MODE = process.env.PRE_PROD_MODE === 'true';
const DEV_MODE = FORCE_PROD_MODE ? false : (process.env.DEV_MODE === 'true' || (!app.isPackaged && !PRE_PROD_MODE));
const PROD_MODE = FORCE_PROD_MODE || (app.isPackaged && !PRE_PROD_MODE);

// Determine paths based on mode
let publicPath, settingPath, dataPath, imagesPath;
let appMode;

if (DEV_MODE) {
  // Mode 1: Development (absolutely)
  appMode = 'DEVELOPMENT';
  publicPath = path.join(__dirname, 'public');
  settingPath = path.join(__dirname, 'setting');
  dataPath = path.join(__dirname, 'data');
  imagesPath = path.join(__dirname, 'images');
} else if (PRE_PROD_MODE) {
  // Mode 2: Develop + Pre Production (still local, path dari electron/data + images)
  appMode = 'PRE_PRODUCTION';
  publicPath = path.join(__dirname, 'public');
  settingPath = path.join(__dirname, 'setting');
  dataPath = path.join(__dirname, 'data');
  imagesPath = path.join(__dirname, 'images');
} else {
  // Mode 3: Production + ASAR (path di luar AppImage file)
  appMode = 'PRODUCTION';
  // Get directory di mana AppImage berada (di luar AppImage file)
  // process.execPath untuk AppImage akan return path ke AppImage file sendiri
  // path.dirname(process.execPath) akan dapat directory di mana AppImage berada
  const appImageDir = path.dirname(process.execPath);
  publicPath = path.join(__dirname, 'public'); // Public tetap dalam ASAR
  settingPath = path.join(__dirname, 'setting'); // Setting tetap dalam ASAR
  dataPath = path.join(appImageDir, 'data'); // Data di luar AppImage (boleh write)
  imagesPath = path.join(appImageDir, 'images'); // Images di luar AppImage (boleh write)
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
        // Get ASAR data path untuk copy initial files
        const asarDataPath = path.join(__dirname, 'data');
        const asarImagesPath = path.join(__dirname, 'images');
        
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
        
        // Copy initial data files dari ASAR jika folder kosong (first run)
        const dataFiles = fs.existsSync(dataPath) ? fs.readdirSync(dataPath).filter(f => f.endsWith('.txt')) : [];
        if (dataFiles.length === 0 && fs.existsSync(asarDataPath)) {
          console.log('Copying initial data files from ASAR...');
          const asarFiles = fs.readdirSync(asarDataPath).filter(f => f.endsWith('.txt'));
          asarFiles.forEach(file => {
            try {
              const src = path.join(asarDataPath, file);
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
        
        // Copy initial images dari ASAR jika folder kosong (first run)
        const penceramahFiles = fs.existsSync(penceramahPath) ? fs.readdirSync(penceramahPath) : [];
        const slidesFiles = fs.existsSync(slidesPath) ? fs.readdirSync(slidesPath) : [];
        const asarPenceramahPath = path.join(asarImagesPath, 'penceramah');
        const asarSlidesPath = path.join(asarImagesPath, 'slides');
        
        if (penceramahFiles.length === 0 && fs.existsSync(asarPenceramahPath)) {
          console.log('Copying initial penceramah images from ASAR...');
          const asarImages = fs.readdirSync(asarPenceramahPath);
          asarImages.forEach(file => {
            try {
              const src = path.join(asarPenceramahPath, file);
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
        
        if (slidesFiles.length === 0 && fs.existsSync(asarSlidesPath)) {
          console.log('Copying initial slides images from ASAR...');
          const asarImages = fs.readdirSync(asarSlidesPath);
          asarImages.forEach(file => {
            try {
              const src = path.join(asarSlidesPath, file);
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
    if (FORCE_PROD_MODE) {
      console.log(`⚠️  Production mode forced via PROD_MODE=true`);
    } else if (app.isPackaged) {
      console.log(`✓ Production mode (app.isPackaged = true)`);
    } else {
      console.log(`ℹ️  Development mode (set PROD_MODE=true to force production)`);
    }
    console.log(`═══════════════════════════════════════`);
  } catch (error) {
    console.error('Error starting servers:', error);
    app.quit();
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
  } catch (error) {
    console.error('Error stopping servers:', error);
  }
}

/**
 * App lifecycle
 */
app.whenReady().then(async () => {
  // Start all servers
  await startServers();
  
  // Initialize window service
  windowService.init({
    publicPort: PUBLIC_PORT,
    accessToken: securityService.getAccessToken(),
    devMode: DEV_MODE || PRE_PROD_MODE // Enable dev features untuk development dan pre-production
  });
  
  // Tunggu sebentar untuk servers start, kemudian buat window jika perlu
  setTimeout(() => {
    windowService.createWindow();
  }, 1000);
});

app.on('window-all-closed', () => {
  stopServers();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopServers();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowService.createWindow();
  }
});
