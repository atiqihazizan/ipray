const fs = require('fs');
const path = require('path');

// Import services
const securityService = require('./services/securityService');
const DataService = require('./services/dataService');
const TimeService = require('./services/timeService');
const publicServerService = require('./services/publicServerService');
const apiServerService = require('./services/apiServerService');
const socketServerService = require('./services/socketServerService');
const rtspToHlsService = require('./services/rtspToHlsService');
// Cloud client - pastikan connection ke cloud bila app start
const { ensureCloudConnection, setOnRegisteredCallback } = require('./services/cloudClient');

// Global constants
const PUBLIC_PORT = 3000;
const SETTING_PORT = 3001; // API Server dan Socket.IO share port ini

/**
 * Detect application mode
 * Mode 1: Development - Default mode (path dari nodejs/data + images)
 * Mode 2: Production - PROD_MODE=true (path dari process.cwd()/data + images)
 * Mode 3: Electron - ELECTRON_MODE=true (path data+images bersebelahan EXE, di luar asar)
 */
const ELECTRON_MODE = process.env.ELECTRON_MODE === 'true' || !!process.versions.electron;
const PROD_MODE = !ELECTRON_MODE && process.env.PROD_MODE === 'true';
const DEV_MODE = !PROD_MODE && !ELECTRON_MODE;

// Determine paths based on mode
let publicPath, settingPath, dataPath, imagesPath, hlsPath, rtspHlsLogPath;
let appMode;

if (ELECTRON_MODE) {
  appMode = 'ELECTRON';
  const exeDir = process.env.ELECTRON_EXE_DIR || process.cwd();
  publicPath = path.join(__dirname, 'public');
  settingPath = path.join(__dirname, 'setting');
  dataPath = path.join(exeDir, 'data');
  imagesPath = path.join(exeDir, 'images');
  // HLS output mesti luar asar (app.asar read-only) — tulis di sebelah .exe
  hlsPath = path.join(exeDir, 'public', 'hls');
  // Log RTSP→HLS ke fail supaya pengguna boleh semak dalam Electron (tanpa terminal)
  rtspHlsLogPath = path.join(exeDir, 'logs', 'rtsp-hls.log');
} else if (PROD_MODE) {
  appMode = 'PRODUCTION';
  const appDir = process.cwd();
  publicPath = path.join(__dirname, 'public');
  settingPath = path.join(__dirname, 'setting');
  dataPath = path.join(appDir, 'data');
  imagesPath = path.join(appDir, 'images');
  hlsPath = null;
  rtspHlsLogPath = null;
} else {
  appMode = 'DEVELOPMENT';
  publicPath = path.join(__dirname, 'public');
  settingPath = path.join(__dirname, 'setting');
  dataPath = path.join(__dirname, 'data');
  imagesPath = path.join(__dirname, 'images');
  hlsPath = null;
  rtspHlsLogPath = null;
}

// Initialize data service (set on app ready)
let dataService = null;
let timeService = null;

/**
 * Start all servers
 */
async function startServers() {
  try {
    // Ensure data and images directories exist (production / electron mode)
    if (PROD_MODE || ELECTRON_MODE) {
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

        // Folder HLS untuk CCTV (RTSP→HLS) — mesti boleh tulis, luar asar
        if (hlsPath && !fs.existsSync(hlsPath)) {
          fs.mkdirSync(hlsPath, { recursive: true });
          console.log(`Created HLS directory: ${hlsPath}`);
        }
        if (hlsPath) {
          const hlsCctvPath = path.join(hlsPath, 'cctv');
          if (!fs.existsSync(hlsCctvPath)) {
            fs.mkdirSync(hlsCctvPath, { recursive: true });
            console.log(`Created HLS CCTV directory: ${hlsCctvPath}`);
          }
        }
        if (rtspHlsLogPath) {
          const logsDir = path.dirname(rtspHlsLogPath);
          if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
            console.log(`Created logs directory: ${logsDir}`);
          }
          console.log(`Log RTSP/HLS: ${rtspHlsLogPath} (buka fail ini dalam Electron untuk semak ralat FFmpeg)`);
        }
      } catch (error) {
        console.error('Error setting up production directories:', error);
      }
    }

    // Initialize and start public server (localhost only, tanpa token)
    publicServerService.init({
      publicPath,
      imagesPath,
      hlsPath, // Electron: /hls/ dilayan dari sini (luar asar)
      port: PUBLIC_PORT
    });
    await publicServerService.start();

    // Folder HLS/cctv dalam mod dev (publicPath/hls/cctv) — index.m3u8 akan wujud bila siaran RTSP bermula
    if (!ELECTRON_MODE) {
      const devHlsCctv = path.join(publicPath, 'hls', 'cctv');
      if (!fs.existsSync(devHlsCctv)) {
        fs.mkdirSync(devHlsCctv, { recursive: true });
        console.log(`Created HLS CCTV directory (dev): ${devHlsCctv}`);
      }
    }

    // Initialize data service with writable paths (perlu dahulu untuk baca config)
    dataService = new DataService(dataPath);

    // Load config untuk time service dan FFMPEG_PATH (path penuh ffmpeg.exe dalam Electron)
    let configContent = '';
    try {
      configContent = await dataService.readFile('config');
    } catch (error) {
      console.warn('Config file not found, using defaults');
    }
    const config = dataService.parseConfig(configContent);
    const datetimeConfig = config.DATETIME_CONFIG || {};

    // RTSP→HLS untuk CCTV. Utamakan: config.FFMPEG_PATH > bundled bin/ > PATH sistem
    const ffmpegExe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    let ffmpegPath = (config.FFMPEG_PATH && String(config.FFMPEG_PATH).trim()) || null;
    if (!ffmpegPath) {
      // Electron: resources/bin/ffmpeg(.exe) — disalin oleh extraResources
      // Dev/Prod: nodejs/bin/ffmpeg(.exe)
      const candidates = ELECTRON_MODE
        ? [path.join(process.resourcesPath || path.join(process.env.ELECTRON_EXE_DIR || process.cwd(), 'resources'), 'bin', ffmpegExe)]
        : [path.join(__dirname, 'bin', ffmpegExe)];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) { ffmpegPath = candidate; break; }
      }
    }
    rtspToHlsService.init({
      publicPath,
      port: PUBLIC_PORT,
      hlsOutputPath: hlsPath,
      logPath: rtspHlsLogPath,
      ffmpegPath: ffmpegPath || undefined
    });
    if (ffmpegPath) {
      console.log('FFmpeg path: ' + ffmpegPath);
    }

    // Initialize time service
    timeService = new TimeService();
    await timeService.init({
      dataService,
      manualOffset: datetimeConfig.MANUAL_OFFSET_MS || 0,
      ntpEnabled: datetimeConfig.NTP_ENABLED !== undefined ? datetimeConfig.NTP_ENABLED : true,
      ntpServer: datetimeConfig.NTP_SERVER || 'pool.ntp.org',
      ntpSyncIntervalMs: datetimeConfig.NTP_SYNC_INTERVAL_MS || 3600000
    });

    // Initialize Socket.IO service (will be attached to API server)
    socketServerService.init({
      port: SETTING_PORT,
      dataService // Supaya data:update(takwim) boleh emit payload hari semasa
    });
    
    // Initialize and start API server (Socket.IO akan auto-attach selepas server start)
    apiServerService.init({
      port: SETTING_PORT,
      settingPath,
      dataService,
      securityService,
      socketServerService, // Pass socket server reference untuk broadcasting
      imagesPath, // Pass images path untuk upload/delete
      timeService // Pass time service reference
    });
    await apiServerService.start(); // Socket.IO akan auto-attach di sini
    
    console.log(`═══════════════════════════════════════`);
    console.log(`App Mode: ${appMode}`);
    console.log(`Data Path: ${dataPath}`);
    console.log(`Images Path: ${imagesPath}`);
    console.log(`Public Server: http://localhost:${PUBLIC_PORT}`);
    console.log(`API Server: http://localhost:${SETTING_PORT}`);
    if (ELECTRON_MODE) {
      console.log(`✓ Electron mode (data & images di luar asar)`);
    } else if (PROD_MODE) {
      console.log(`✓ Production mode`);
    } else {
      console.log(`ℹ️  Development mode (set PROD_MODE=true for production)`);
    }
    console.log(`═══════════════════════════════════════`);
    console.log(`Servers started successfully!`);

    // Pastikan connection ke cloud (log status, tapi jangan matikan app jika gagal)
    try {
      await ensureCloudConnection(5000);
      console.log('[Cloud] Connected to cloud as client:', process.env.CLIENT_ID || 'unknown');
    } catch (err) {
      console.error('[Cloud] Failed to connect to cloud:', err.message || err);
    }

    // Initialize cloud socket handler (skrip asing - terima CRUD dari cloud setting panel)
    try {
      const cloudSocketHandler = require('./services/cloudSocketHandler');
      cloudSocketHandler.init({ dataService, socketServerService, timeService, imagesPath });
      console.log('[Cloud] Cloud socket handler initialized');
    } catch (err) {
      console.error('[Cloud] Failed to initialize cloud socket handler:', err.message || err);
    }

    // Bila sambungan cloud berjaya, upload semua fail data dari local ke server
    setOnRegisteredCallback(() => {
      dataService.syncAllDataFilesToCloud().catch(err => {
        console.error('[Cloud] Full sync on connect failed:', err.message || err);
      });
    });
  } catch (error) {
    console.error('Error starting servers:', error);
    process.exit(1);
  }
}

/** Masa tunggu shutdown (ms) - lepas ini force exit supaya systemctl restart tidak stuck */
const SHUTDOWN_TIMEOUT_MS = 3000;

/**
 * Stop all servers.
 * Urutan: Socket.IO dulu (putus client), kemudian HTTP servers supaya server.close() tidak tunggu lama.
 */
async function stopServers() {
  try {
    rtspToHlsService.stop();
    await socketServerService.stop();
    await publicServerService.stop();
    await apiServerService.stop();
    if (timeService) {
      timeService.cleanup();
    }
    console.log('All servers stopped.');
  } catch (error) {
    console.error('Error stopping servers:', error);
  }
}

function doShutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down (max ${SHUTDOWN_TIMEOUT_MS}ms)...`);
  let done = false;
  const forceExit = () => {
    if (done) return;
    done = true;
    console.warn('Shutdown timeout - forcing exit');
    process.exit(0);
  };
  const timeoutId = setTimeout(forceExit, SHUTDOWN_TIMEOUT_MS);
  stopServers()
    .then(() => {
      if (done) return;
      done = true;
      clearTimeout(timeoutId);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Shutdown error:', err);
      if (!done) {
        done = true;
        clearTimeout(timeoutId);
        process.exit(1);
      }
    });
}

process.on('SIGINT', () => doShutdown('SIGINT'));
process.on('SIGTERM', () => doShutdown('SIGTERM'));

// Start servers
startServers();
