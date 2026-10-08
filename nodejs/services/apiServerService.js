const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { parseKuliahOverride } = require('./kuliahOverrideParser');
const { processKuliahHari, processKuliahMinggu, processKuliahBulanan } = require('./kuliahProcessor');
const { getWeekNumber, getTodayDayNumber } = require('./kuliahDateUtils');

/**
 * Escape string untuk selamat dibenamkan dalam petikan dwi-tanda (") shell command.
 * PENTING: backslash MESTI di-escape DAHULU sebelum aksara lain — kalau tidak, backslash
 * baharu yang disisipkan oleh escape "/$/` akan turut di-escape semula, merosakkan
 * petikan dan membenarkan pecah keluar (command injection). Nilai yang dipulangkan
 * MESTI sentiasa dibenamkan dalam petikan dwi-tanda dalam command string.
 */
function escapeShellDoubleQuoted(str) {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
}

const HOTSPOT_DEFAULTS = {
  SSID: 'iPray-Hotspot',
  PASSWORD: 'ipray2026'
};

// Skrip pemantau rangkaian di kiosk (dipasang oleh scripts/kiosk-install.sh).
// Semua tindakan yang menukar wlan0 disalurkan melaluinya supaya selaras dengan
// lock, fail keadaan dan "tahan" — elak perebutan dengan pemantau.
const NETMON_SCRIPT = path.join(process.env.HOME || '/home/ipray', 'network-monitor', 'network-monitor.js');
const HOTSPOT_PROFILE = 'ipray-hotspot';
const WIFI_PROFILE_PREFIX = 'netplan-wlan0-';

function runNetmon(args, timeoutMs = 30000) {
  const { execFile } = require('child_process');
  return new Promise((resolve) => {
    execFile('/usr/bin/node', [NETMON_SCRIPT, ...args], { timeout: timeoutMs }, (err, stdout, stderr) => {
      let parsed = null;
      try { parsed = JSON.parse((stdout || '').trim().split('\n').pop()); } catch (_) { /* ignore */ }
      resolve({ ok: !err && (!parsed || parsed.ok !== false), out: stdout || '', err: stderr || (err && err.message) || '', parsed });
    });
  });
}

function netmonAvailable() {
  return fs.existsSync(NETMON_SCRIPT);
}

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
    this.timeService = null; // Time service reference
  }

  /**
   * Overlay bits (0-7): 1=date, 2=smalltime, 4=marquee. Bina overlayConfig untuk livestream/kematian.
   */
  _overlayConfigFromBits(bits) {
    const n = typeof bits === 'string' ? parseInt(bits, 10) : bits;
    if (Number.isNaN(n) || n < 0 || n > 7) {
      return { showDate: true, showSmallTime: true, showMarquee: true };
    }
    return {
      showDate: (n & 1) !== 0,
      showSmallTime: (n & 2) !== 0,
      showMarquee: (n & 4) !== 0,
    };
  }

  /**
   * Bina payload screen flags (slidesConfig + slidesMarqueeShow) dari kandungan screen + config.
   * Guna untuk broadcast screen-flags:updated tanpa reload.
   */
  _buildScreenFlagsPayload(slidesContent, configContent) {
    const slidesConfig = this.dataService.parseSlidesConfig(slidesContent || '');
    const config = this.dataService.parseConfig(configContent || '');
    const slideTypesOrder = (slidesContent || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split('|')[0])
      .filter(Boolean);
    let visibleArray = config.SLIDES_CONFIG?.VISIBLE;
    if (!Array.isArray(visibleArray) || visibleArray.length !== slideTypesOrder.length) {
      visibleArray = slideTypesOrder.map(() => 1);
    }
    if (slideTypesOrder.length > 0) visibleArray[0] = 1;
    slideTypesOrder.forEach((type, i) => {
      if (slidesConfig[type]) slidesConfig[type].hide = !(visibleArray[i] === 1);
    });
    const firstSlideType = slideTypesOrder[0];
    const slidesMarqueeShow = firstSlideType && slidesConfig[firstSlideType] ? slidesConfig[firstSlideType].marquee !== false : true;
    return { slidesConfig, slidesMarqueeShow };
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
    this.timeService = config.timeService; // Store time service reference
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
    
    // Serve penceramah images dengan fallback ke noimage.webp
    if (this.imagesPath) {
      this.app.get('/images/penceramah/:filename', (req, res) => {
        const filename = req.params.filename;
        const imagePath = path.join(this.imagesPath, 'penceramah', filename);
        const defaultImage = path.join(this.imagesPath, 'noimage.webp');
        // Guna async fs.access untuk elak blocking event loop
        fs.access(imagePath, fs.constants.R_OK, (err) => {
          if (!err) {
            res.sendFile(imagePath);
          } else {
            fs.access(defaultImage, fs.constants.R_OK, (err2) => {
              if (!err2) {
                res.sendFile(defaultImage);
              } else {
                res.status(404).json({ error: 'Image not found' });
              }
            });
          }
        });
      });
    }
    
    // Serve images dari imagesPath melalui /images/ endpoint
    if (this.imagesPath) {
      this.app.use('/images', express.static(this.imagesPath));
    }
    
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

    // Auth — lindungi endpoint admin/tulis (panel setting) daripada akses tanpa token.
    // Laluan baca sahaja yang diperlukan oleh paparan kiosk (tiada sesi log masuk) dikecualikan.
    this.app.use('/api', this.buildAuthMiddleware());

    // Setup all routes
    this.setupRoutes();
  }

  /**
   * Middleware auth untuk /api/* — kecuali laluan baca-sahaja yang kiosk (paparan awam,
   * tiada log masuk) perlukan. Semua laluan lain (tulis fail, reboot, WiFi, dsb) mesti
   * sertakan header X-Access-Token yang sepadan dengan securityService.getAccessToken().
   */
  buildAuthMiddleware() {
    const PUBLIC_PREFIXES = [
      '/token',            // perlu boleh diakses tanpa token untuk dapatkan token itu sendiri
      '/time',             // kiosk baca jam (GET /api/time, /api/time/sync tidak termasuk — mutate, dikecualikan di bawah)
      '/data/app',         // GET /api/data/app, /api/data/app/takwim, /api/data/app/takwim/full — dibaca kiosk
    ];
    return (req, res, next) => {
      if (req.method === 'OPTIONS') return next();
      const isPublicGet = req.method === 'GET' && PUBLIC_PREFIXES.some(p => req.path === p || req.path.startsWith(p + '/'));
      if (isPublicGet) return next();
      const token = req.get('x-access-token') || req.get('X-Access-Token') || '';
      if (token && this.securityService && token === this.securityService.getAccessToken()) return next();
      return res.status(401).json({ error: 'Unauthorized — sila sertakan header X-Access-Token yang sah (dapatkan dari GET /api/token)' });
    };
  }

  /**
   * Check if running in Raspberry Pi/Linux environment with nmcli
   */
  /**
   * Semak persekitaran Raspberry Pi/Linux SEKALI sahaja dan cache hasilnya.
   * Elak spawn process baru pada setiap request WiFi API.
   */
  async isRaspberryPiEnvironment() {
    // Cache result — platform tidak berubah semasa runtime
    if (this._isRPiCached !== undefined) return this._isRPiCached;
    try {
      const os = require('os');
      if (os.platform() !== 'linux') {
        this._isRPiCached = false;
        return false;
      }
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      try {
        await execAsync('/usr/bin/nmcli --version 2>/dev/null', { timeout: 3000 });
        this._isRPiCached = true;
      } catch (_) {
        this._isRPiCached = false;
      }
      return this._isRPiCached;
    } catch (_) {
      this._isRPiCached = false;
      return false;
    }
  }

  /**
   * Get nmcli command path (with fallback)
   */
  getNmcliPath() {
    // Use full path to ensure it works even if PATH is not set correctly
    // NetworkManager's nmcli is typically in /usr/bin/nmcli on Debian/Ubuntu/Raspberry Pi OS
    return '/usr/bin/nmcli';
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
    
    // Time Service Endpoints

    // Get time info
    this.app.get('/api/time', (req, res) => {
      try {
        if (!this.timeService) {
          return res.status(503).json({ error: 'Time service not available' });
        }
        const timeInfo = this.timeService.getTimeInfo();
        res.json(timeInfo);
      } catch (error) {
        console.error('Error getting time info:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Set system clock (date/time mesin) dari setting UI
    this.app.post('/api/time/set', async (req, res) => {
      try {
        if (!this.timeService) {
          return res.status(503).json({ error: 'Time service not available' });
        }
        const { dateTime } = req.body;
        if (!dateTime || typeof dateTime !== 'string') {
          return res.status(400).json({ error: 'dateTime is required (YYYY-MM-DD HH:MM:SS or ISO string)' });
        }
        const ts = new Date(dateTime.trim()).getTime();
        if (Number.isNaN(ts)) {
          return res.status(400).json({ error: 'Invalid dateTime format' });
        }
        const year = new Date(ts).getFullYear();
        if (year < 2020 || year > 2099) {
          return res.status(400).json({ error: 'Year out of allowed range (2020-2099)' });
        }
        const ok = this.timeService.setSystemClock(ts);
        if (!ok) {
          return res.status(500).json({ error: 'Failed to set system clock (check sudo)' });
        }
        if (this.socketServerService) {
          this.socketServerService.broadcastEvent('time-system-updated', { success: true });
        }
        res.json({ success: true, message: 'System clock updated' });
      } catch (error) {
        console.error('Error setting system time:', error);
        res.status(500).json({ error: error.message });
      }
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

    // Get takwim data only (untuk refresh takwim tanpa ganggu slide) - filter hari ini sahaja
    this.app.get('/api/data/app/takwim', async (req, res) => {
      try {
        const takwimContent = await this.dataService.readFile('takwim').catch(() => '');
        const takwim = this.dataService.getTakwimForApp(takwimContent);
        res.json(takwim);
      } catch (error) {
        console.error('Error loading takwim for app:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get SEMUA data takwim (tiada filter tarikh) - elak waktu solat jadi 00 bila tarikh tak match
    this.app.get('/api/data/app/takwim/full', async (req, res) => {
      try {
        const takwimContent = await this.dataService.readFile('takwim').catch(() => '');
        const takwim = this.dataService.getTakwimForAppFull(takwimContent);
        res.json(takwim);
      } catch (error) {
        console.error('Error loading full takwim for app:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get all app data parsed (single endpoint for React app - no client-side parsing)
    // Kuliah: backend processes kuliah + kuliah-override and returns only processed lists
    this.app.get('/api/data/app', async (req, res) => {
      try {
        const [takwimContent, announcementsContent, countdownsContent, kuliahContent, kuliahOverrideContent, imagesContent, slidesContent, configContent, slideshowContent, hebahanContent] = await Promise.all([
          this.dataService.readFile('takwim').catch(() => ''),
          this.dataService.readFile('announcements').catch(() => ''),
          this.dataService.readFile('countdowns').catch(() => ''),
          this.dataService.readFile('kuliah').catch(() => ''),
          this.dataService.readFile('kuliah-override').catch(() => ''),
          this.dataService.readFile('images').catch(() => ''),
          this.dataService.readFile('slides').catch(() => ''),
          this.dataService.readFile('config').catch(() => ''),
          this.dataService.readFile('slideshow').catch(() => ''),
          this.dataService.readFile('hebahan').catch(() => '')
        ]);
        const takwim = this.dataService.getTakwimForAppFull(takwimContent);
        const overrideParsed = parseKuliahOverride(kuliahOverrideContent);
        const today = new Date();
        const currentMinutes = today.getHours() * 60 + today.getMinutes();
        const getHijri = (d) => this.dataService.getHijriForDate(takwimContent, d, currentMinutes);
        const batalOptions = { expanded: overrideParsed.expanded, hijriRules: overrideParsed.hijriRules || [], weeklyRules: overrideParsed.weeklyRules || [], getHijri };
        const announcements = this.dataService.parseAnnouncements(announcementsContent);
        const countdownsRaw = this.dataService.parseCountdowns(countdownsContent);
        const countdowns = [];
        for (const c of countdownsRaw) {
          const enriched = this.dataService.enrichCountdownForApp(c, takwimContent, today);
          if (enriched) countdowns.push(enriched);
        }
        const kuliahLines = this.dataService.parseKuliah(kuliahContent);
        let penceramahMap = {};
        try {
          const penceramahContent = await this.dataService.readFile('penceramah');
          const penceramahParsed = this.dataService.parseFileContent('penceramah', penceramahContent);
          penceramahParsed.forEach((p) => {
            if (p.uuid) penceramahMap[p.uuid] = { namaPenuh: p.namaPenuh, imageCode: p.uuid };
          });
        } catch (e) {
          console.warn('Could not load penceramah for app:', e);
        }
        const resolveKuliahLine = (line) => {
          const parts = line.split('|');
          if (parts.length >= 5) {
            if (parts.length === 5) {
              const slug = (parts[3] || '').trim();
              const title = (parts[4] || '').trim();
              const match = penceramahMap[slug];
              const namaPenuh = match ? match.namaPenuh : slug;
              return [parts[0], parts[1], parts[2], namaPenuh, slug, title].join('|');
            }
            const slug = (parts[4] || '').trim();
            const match = penceramahMap[slug] || penceramahMap[(parts[3] || '').trim()];
            if (match) {
              parts[3] = match.namaPenuh;
              if (match.imageCode && (!parts[4] || !parts[4].trim())) parts[4] = match.imageCode;
            }
          }
          return parts.join('|');
        };
        const kuliahHariResult = processKuliahHari(kuliahLines, batalOptions, today);
        const kuliahHariProcessed = (kuliahHariResult.lines || []).map(resolveKuliahLine);
        const kuliahHariReplacements = kuliahHariResult.replacements || [];
        const kuliahMingguProcessed = (processKuliahMinggu(kuliahLines, batalOptions, today) || []).map(resolveKuliahLine);
        let kuliahBulananProcessed = processKuliahBulanan(kuliahLines, batalOptions, today);
        if (Object.keys(penceramahMap).length > 0) {
          kuliahBulananProcessed = kuliahBulananProcessed.map((day) => ({
            ...day,
            entries: (day.entries || []).map((e) => {
              if (!e.penceramah) return e;
              const match = penceramahMap[(e.penceramah || '').trim()];
              if (match) return { ...e, penceramah: match.namaPenuh, imageCode: match.imageCode || e.imageCode };
              return e;
            })
          }));
        }
        const images = this.dataService.parseImages(imagesContent);
        const slidesConfig = this.dataService.parseSlidesConfig(slidesContent);
        const config = this.dataService.parseConfig(configContent);
        const slideTypesOrder = (slidesContent || '')
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => line.split('|')[0])
          .filter(Boolean);
        let visibleArray = config.SLIDES_CONFIG?.VISIBLE;
        if (!Array.isArray(visibleArray) || visibleArray.length !== slideTypesOrder.length) {
          visibleArray = slideTypesOrder.map(() => 1);
        }
        if (slideTypesOrder.length > 0) visibleArray[0] = 1;
        slideTypesOrder.forEach((type, i) => {
          if (slidesConfig[type]) slidesConfig[type].hide = !(visibleArray[i] === 1);
        });
        const firstSlideType = slideTypesOrder[0];
        const slidesMarqueeShow = firstSlideType && slidesConfig[firstSlideType] ? slidesConfig[firstSlideType].marquee !== false : true;
        const slideshowParsed = this.dataService.parseSlideshow(slideshowContent);
        const slideshow = this.dataService.filterSlideshowByValidity(slideshowParsed, new Date(), takwimContent);
        const hebahan = this.dataService.parseHebahan(hebahanContent);

        // Petugas untuk hari ini (dari jadual-petugas)
        let petugasData = [];
        try {
          const [petugasContent, jadualContent] = await Promise.all([
            this.dataService.readFile('petugas').catch(() => ''),
            this.dataService.readFile('jadual-petugas').catch(() => '')
          ]);
          const petugasParsed = this.dataService.parseFileContent('petugas', petugasContent);
          const jadualParsed = this.dataService.parseFileContent('jadual-petugas', jadualContent);
          const weekNum = getWeekNumber(today);
          const dayNum = getTodayDayNumber(today);
          const petugasMap = {};
          petugasParsed.forEach((p) => { if (p.uuid) petugasMap[p.uuid] = p; });
          const jadualToday = (jadualParsed || []).filter((j) =>
            j.weeks?.includes(weekNum) && j.days?.includes(dayNum)
          );
          const roleOrder = ['BILAL', 'IMAM'];
          jadualToday.forEach((j) => {
            const officerCode = (j.officerCode || '').trim();
            const role = (j.role || '').trim().toUpperCase() || 'BILAL';
            const officer = officerCode ? petugasMap[officerCode] : null;
            const name = officer ? (officer.namaPenuh || officer.uuid || '') : '';
            let imageSrc = '';
            if (officer && images && typeof images === 'object') {
              const path = images[(officer.uuid || '').trim()];
              if (path) imageSrc = path.startsWith('/') ? path : `/${path}`;
            }
            if (!imageSrc) imageSrc = '/img/Random_user.svg';
            petugasData.push({ label: role || 'PETUGAS', name, imageSrc, waktu: j.waktu || [] });
          });
          if (petugasData.length === 0) {
            roleOrder.forEach((r) => petugasData.push({ label: r, name: '', imageSrc: '/img/Random_user.svg' }));
          }
        } catch (e) {
          console.warn('Could not load petugas for app:', e);
          petugasData = [{ label: 'BILAL', name: '', imageSrc: '/img/Random_user.svg' }, { label: 'IMAM', name: '', imageSrc: '/img/Random_user.svg' }];
        }

        res.json({
          takwim,
          announcements,
          countdowns,
          kuliahHariProcessed,
          kuliahHariReplacements,
          kuliahMingguProcessed,
          kuliahBulananProcessed,
          images,
          slidesConfig,
          slidesMarqueeShow,
          config,
          slideshow,
          hebahan,
          petugasData
        });
      } catch (error) {
        console.error('Error loading app data:', error);
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
        
        if (this.socketServerService) {
          if (filename === 'takwim') {
            const takwimContent = await this.dataService.readFile('takwim').catch(() => '');
            const takwim = this.dataService.getTakwimForApp(takwimContent);
            this.socketServerService.broadcastTakwimRefresh({ takwimArray: takwim.takwimArray, takwimParsed: takwim.takwimParsed });
          } else {
            this.socketServerService.broadcastDataUpdate(filename, { action: 'file:save' });
          }
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
        let parsed = this.dataService.parseFileContent(filename, content);
        const columns = this.dataService.getColumns(filename);

        // Kuliah: resolve speakerCode ke nama penuh untuk table setting (format output kekal sama)
        if (filename === 'kuliah') {
          let penceramahMap = {};
          try {
            const penceramahContent = await this.dataService.readFile('penceramah');
            const penceramahParsed = this.dataService.parseFileContent('penceramah', penceramahContent);
            penceramahParsed.forEach((p) => {
              if (p.uuid) penceramahMap[p.uuid] = { namaPenuh: p.namaPenuh, imageCode: p.uuid };
            });
          } catch (e) {
            console.warn('Could not load penceramah for kuliah resolve:', e);
          }
          parsed = parsed.map((row) => {
            const resolved = { ...row };
            const speakerVal = (row.speaker || '').trim();
            const match = penceramahMap[speakerVal];
            if (match) {
              resolved.speaker = match.namaPenuh;
              if (match.imageCode && !resolved.speakerId) resolved.speakerId = match.imageCode;
            }
            return resolved;
          });
        }

        res.json({ data: parsed, columns });
      } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get today's takwim data only
    this.app.get('/api/data/takwim/today', async (req, res) => {
      try {
        const content = await this.dataService.readFile('takwim');
        const todayData = this.dataService.getTodayTakwim(content, this.timeService?.now());
        
        if (!todayData) {
          return res.json({ data: null, message: 'No data found for today' });
        }
        
        res.json({ data: todayData });
      } catch (error) {
        console.error('Error reading today takwim:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Reorder slideshow rows - mesti sebelum route generic PUT /:filename/:id
    this.app.put('/api/data/slideshow/reorder', async (req, res) => {
      try {
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
          return res.status(400).json({ error: 'orderedIds array is required' });
        }
        const result = await this.dataService.reorderRows('slideshow', orderedIds);
        if (this.socketServerService) {
          this.socketServerService.broadcastDataUpdate('slideshow', { action: 'reorder' });
        }
        res.json(result);
      } catch (error) {
        console.error('Error reordering slideshow:', error);
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
        let updatedRow = null;
        try {
          const content = await this.dataService.readFile(filename).catch(() => '');
          const parsed = this.dataService.parseFileContent ? this.dataService.parseFileContent(filename, content) : [];
          if (filename === 'hebahan') {
            const hebahan = this.dataService.parseHebahan(content);
            updatedRow = hebahan.find(r => r.id === id) || null;
          } else {
            updatedRow = Array.isArray(parsed) ? parsed.find(r => r.id === id) || null : null;
          }
        } catch (_) {}
        if (this.socketServerService) {
          if (filename === 'takwim') {
            const takwimContent = await this.dataService.readFile('takwim').catch(() => '');
            const takwim = this.dataService.getTakwimForApp(takwimContent);
            this.socketServerService.broadcastTakwimRefresh({ takwimArray: takwim.takwimArray, takwimParsed: takwim.takwimParsed });
          } else if (filename === 'config' && row && row.split('|')[0] === 'TAKWIM_ZONE') {
            // TAKWIM_ZONE sahaja: jangan broadcast data:updated supaya React tiada reload (waktu sudah dikemas kini via takwim:refresh)
          } else if (filename === 'config' && row && (row.split('|')[0]?.startsWith('HOME_TITLE') || row.split('|')[0] === 'HOME_TITLE_VISIBLE')) {
            const configKey = row.split('|')[0];
            if (configKey === 'HOME_TITLE_VISIBLE') {
              this.socketServerService.broadcastDataUpdate('config', { action: 'row:update', reason: 'HOME_TITLE_VISIBLE' });
            } else {
              const configContent = await this.dataService.readFile('config');
              const parsed = this.dataService.parseConfig(configContent);
              this.socketServerService.broadcastHomeTitleUpdate(parsed.HOME_TITLE_CONFIG);
              if (configKey === 'HOME_TITLE_DURATION_SEC') {
                this.socketServerService.broadcastDataUpdate('config', { action: 'row:update', reason: 'HOME_TITLE_DURATION_SEC' });
              }
            }
          } else if (filename === 'config' && row && row.split('|')[0]?.startsWith('MARQUEE')) {
            const configContent = await this.dataService.readFile('config');
            const parsed = this.dataService.parseConfig(configContent);
            this.socketServerService.broadcastMarqueeConfigUpdate(parsed.MARQUEE_CONFIG);
          } else if (filename === 'config' && row && row.split('|')[0] === 'OVERLAY_BG_COLOR') {
            const configContent = await this.dataService.readFile('config');
            const parsed = this.dataService.parseConfig(configContent);
            this.socketServerService.broadcastColorConfigUpdate(parsed.COLOR_CONFIG);
          } else if (filename === 'config' && row && row.split('|')[0]?.startsWith('BEEP_')) {
            const configContent = await this.dataService.readFile('config');
            const parsed = this.dataService.parseConfig(configContent);
            this.socketServerService.broadcastBeepConfigUpdate(parsed.BEEP_CONFIG);
          } else if (filename === 'config' && row && (row.startsWith('KEMATIAN_SHOW|') || row.startsWith('LIVESTREAM_SHOW|'))) {
            const key = row.split('|')[0];
            const bits = row.split('|')[1];
            const overlayConfig = this._overlayConfigFromBits(bits);
            if (key === 'KEMATIAN_SHOW') {
              this.socketServerService.broadcastKematianOverlayUpdate(overlayConfig);
            } else {
              this.socketServerService.broadcastLivestreamOverlayUpdate(overlayConfig);
            }
          } else if (filename === 'hebahan') {
            const hebahanContent = await this.dataService.readFile('hebahan').catch(() => '');
            const hebahan = this.dataService.parseHebahan(hebahanContent);
            this.socketServerService.broadcastHebahanUpdate(hebahan);
          } else if (filename === 'slides') {
            this.socketServerService.broadcastDataUpdate(filename, { action: 'row:update', rowId: id, row });
            const [slidesContent, configContent] = await Promise.all([
              this.dataService.readFile('slides').catch(() => ''),
              this.dataService.readFile('config').catch(() => '')
            ]);
            const { slidesConfig, slidesMarqueeShow } = this._buildScreenFlagsPayload(slidesContent, configContent);
            this.socketServerService.broadcastScreenFlagsUpdate(slidesConfig, slidesMarqueeShow);
          } else {
            this.socketServerService.broadcastDataUpdate(filename, { action: 'row:update', rowId: id, row });
          }
          if (this.socketServerService.broadcastSettingAck) {
            this.socketServerService.broadcastSettingAck(filename, 'update', { rowId: id });
          }
        }
        res.json({ ...result, row: updatedRow, action: 'update' });
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
        let newRow = null;
        try {
          const content = await this.dataService.readFile(filename).catch(() => '');
          if (filename === 'hebahan') {
            const hebahan = this.dataService.parseHebahan(content);
            newRow = hebahan.length > 0 ? hebahan[hebahan.length - 1] : null;
          } else {
            const parsed = this.dataService.parseFileContent(filename, content);
            newRow = Array.isArray(parsed) && parsed.length > 0 ? parsed[parsed.length - 1] : null;
          }
        } catch (_) {}
        if (this.socketServerService) {
          if (filename === 'takwim') {
            const takwimContent = await this.dataService.readFile('takwim').catch(() => '');
            const takwim = this.dataService.getTakwimForApp(takwimContent);
            this.socketServerService.broadcastTakwimRefresh({ takwimArray: takwim.takwimArray, takwimParsed: takwim.takwimParsed });
          } else if (filename === 'config' && row && row.split('|')[0] === 'TAKWIM_ZONE') {
            // TAKWIM_ZONE sahaja: jangan broadcast data:updated supaya React tiada reload
          } else if (filename === 'config' && row && (row.split('|')[0]?.startsWith('HOME_TITLE') || row.split('|')[0] === 'HOME_TITLE_VISIBLE')) {
            const configKey = row.split('|')[0];
            if (configKey === 'HOME_TITLE_VISIBLE') {
              this.socketServerService.broadcastDataUpdate('config', { action: 'row:insert', reason: 'HOME_TITLE_VISIBLE' });
            } else {
              const configContent = await this.dataService.readFile('config');
              const parsed = this.dataService.parseConfig(configContent);
              this.socketServerService.broadcastHomeTitleUpdate(parsed.HOME_TITLE_CONFIG);
              if (configKey === 'HOME_TITLE_DURATION_SEC') {
                this.socketServerService.broadcastDataUpdate('config', { action: 'row:insert', reason: 'HOME_TITLE_DURATION_SEC' });
              }
            }
          } else if (filename === 'config' && row && row.split('|')[0]?.startsWith('MARQUEE')) {
            const configContent = await this.dataService.readFile('config');
            const parsed = this.dataService.parseConfig(configContent);
            this.socketServerService.broadcastMarqueeConfigUpdate(parsed.MARQUEE_CONFIG);
          } else if (filename === 'config' && row && row.split('|')[0] === 'OVERLAY_BG_COLOR') {
            const configContent = await this.dataService.readFile('config');
            const parsed = this.dataService.parseConfig(configContent);
            this.socketServerService.broadcastColorConfigUpdate(parsed.COLOR_CONFIG);
          } else if (filename === 'config' && row && row.split('|')[0]?.startsWith('BEEP_')) {
            const configContent = await this.dataService.readFile('config');
            const parsed = this.dataService.parseConfig(configContent);
            this.socketServerService.broadcastBeepConfigUpdate(parsed.BEEP_CONFIG);
          } else if (filename === 'config' && row && (row.startsWith('KEMATIAN_SHOW|') || row.startsWith('LIVESTREAM_SHOW|'))) {
            const key = row.split('|')[0];
            const bits = row.split('|')[1];
            const overlayConfig = this._overlayConfigFromBits(bits);
            if (key === 'KEMATIAN_SHOW') {
              this.socketServerService.broadcastKematianOverlayUpdate(overlayConfig);
            } else {
              this.socketServerService.broadcastLivestreamOverlayUpdate(overlayConfig);
            }
          } else if (filename === 'hebahan') {
            const hebahanContent = await this.dataService.readFile('hebahan').catch(() => '');
            const hebahan = this.dataService.parseHebahan(hebahanContent);
            this.socketServerService.broadcastHebahanUpdate(hebahan);
          } else if (filename === 'slides') {
            this.socketServerService.broadcastDataUpdate(filename, { action: 'row:insert' });
            const [slidesContent, configContent] = await Promise.all([
              this.dataService.readFile('slides').catch(() => ''),
              this.dataService.readFile('config').catch(() => '')
            ]);
            const { slidesConfig, slidesMarqueeShow } = this._buildScreenFlagsPayload(slidesContent, configContent);
            this.socketServerService.broadcastScreenFlagsUpdate(slidesConfig, slidesMarqueeShow);
          } else {
            this.socketServerService.broadcastDataUpdate(filename, { action: 'row:insert' });
          }
          if (this.socketServerService.broadcastSettingAck) {
            this.socketServerService.broadcastSettingAck(filename, 'insert');
          }
        }
        res.json({ ...result, row: newRow, action: 'insert' });
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
        
        // Pass imagesPath untuk delete image file jika slideshow
        const result = await this.dataService.deleteRow(filename, id, {
          imagesPath: this.imagesPath
        });
        
        if (this.socketServerService) {
          if (filename === 'takwim') {
            const takwimContent = await this.dataService.readFile('takwim').catch(() => '');
            const takwim = this.dataService.getTakwimForApp(takwimContent);
            this.socketServerService.broadcastTakwimRefresh({ takwimArray: takwim.takwimArray, takwimParsed: takwim.takwimParsed });
          } else if (filename === 'hebahan') {
            const hebahanContent = await this.dataService.readFile('hebahan').catch(() => '');
            const hebahan = this.dataService.parseHebahan(hebahanContent);
            this.socketServerService.broadcastHebahanUpdate(hebahan);
          } else if (filename === 'slides') {
            this.socketServerService.broadcastDataUpdate(filename, { action: 'row:delete', rowId: id });
            const [slidesContent, configContent] = await Promise.all([
              this.dataService.readFile('slides').catch(() => ''),
              this.dataService.readFile('config').catch(() => '')
            ]);
            const { slidesConfig, slidesMarqueeShow } = this._buildScreenFlagsPayload(slidesContent, configContent);
            this.socketServerService.broadcastScreenFlagsUpdate(slidesConfig, slidesMarqueeShow);
          } else {
            this.socketServerService.broadcastDataUpdate(filename, { action: 'row:delete', rowId: id });
          }
          if (this.socketServerService.broadcastSettingAck) {
            this.socketServerService.broadcastSettingAck(filename, 'delete', { rowId: id });
          }
        }
        res.json({ ...result, rowId: id, action: 'delete' });
      } catch (error) {
        console.error('Error deleting row:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Toggle slide hide/show (slides only) - update SLIDES_VISIBLE dalam config
    this.app.post('/api/data/slides/:id/toggle-hide', async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ error: 'Invalid row ID' });
        }
        const index = id - 1;
        if (index === 0) {
          return res.json({ success: true, hide: false });
        }
        const [slidesContent, configContent] = await Promise.all([
          this.dataService.readFile('slides').catch(() => ''),
          this.dataService.readFile('config').catch(() => '')
        ]);
        const slideTypesOrder = (slidesContent || '')
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => line.split('|')[0])
          .filter(Boolean);
        const config = this.dataService.parseConfig(configContent);
        let visibleArray = config.SLIDES_CONFIG?.VISIBLE;
        if (!Array.isArray(visibleArray) || visibleArray.length !== slideTypesOrder.length) {
          visibleArray = slideTypesOrder.map(() => 1);
        }
        visibleArray[0] = 1;
        const wasHidden = visibleArray[index] !== 1;
        visibleArray[index] = wasHidden ? 1 : 0;
        const value = '[' + visibleArray.join(',') + ']';
        const configParsed = this.dataService.parseFileContent('config', configContent);
        const slidesVisibleRow = configParsed.find((r) => r.key === 'SLIDES_VISIBLE');
        const formattedRow = `SLIDES_VISIBLE|${value}`;
        if (slidesVisibleRow && slidesVisibleRow.id) {
          await this.dataService.updateRow('config', slidesVisibleRow.id, formattedRow);
          if (this.socketServerService) {
            this.socketServerService.broadcastDataUpdate('config', { action: 'row:update', rowId: slidesVisibleRow.id, row: formattedRow });
          }
        } else {
          await this.dataService.insertRow('config', formattedRow, 'end');
          if (this.socketServerService) {
            this.socketServerService.broadcastDataUpdate('config', { action: 'row:insert' });
          }
        }
        res.json({ success: true, hide: !wasHidden });
      } catch (error) {
        console.error('Error toggling slide hide:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Configure multer for file uploads (memory) - simpan file dilakukan oleh DataService
    const upload = multer({
      storage: multer.memoryStorage(),
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
    this.app.post('/api/images/upload', upload.single('image'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'Tiada fail dimuat naik. Pastikan fail image dipilih.' });
        }
        
        const category = req.query.category || req.body.category || 'penceramah';
        const saved = await this.dataService.saveUploadedImage({
          buffer: req.file.buffer,
          originalName: req.file.originalname,
          category,
          imagesPath: this.imagesPath
        });

        res.json({
          success: true,
          path: saved.path,
          filename: saved.filename,
          category: saved.category
        });
        
        // Broadcast update via Socket.IO untuk trigger React reload selepas response dikirim
        // Delay sedikit untuk ensure response sudah dikirim sebelum broadcast
        setTimeout(() => {
          if (!this.socketServerService) return;
          this.socketServerService.broadcastDataUpdate('images', { action: 'image:upload', path: saved.path, category: saved.category });
          this.dataService.readFile('takwim').catch(() => '').then(takwimContent => {
            try {
              const takwim = this.dataService.getTakwimForApp(takwimContent);
              this.socketServerService.broadcastTakwimRefresh({ takwimArray: takwim.takwimArray, takwimParsed: takwim.takwimParsed });
            } catch (_) {
              this.socketServerService.broadcastTakwimRefresh();
            }
          }).catch(() => {
            if (this.socketServerService) this.socketServerService.broadcastTakwimRefresh();
          });
        }, 100);
      } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: error.message || 'Gagal memuat naik image' });
      }
    });
    
    // System control - Reload React app
    this.app.post('/api/system/reload-react', async (req, res) => {
      try {
        // SATU broadcast data:updated (fileName bukan 'slides') sudah cukup untuk cetus reload React —
        // elak broadcast berganda yang menyebabkan beberapa reload/bip berturut-turut untuk satu tindakan
        this.socketServerService.broadcastDataUpdate('system', { action: 'reload:react' });

        const takwimContent = await this.dataService.readFile('takwim').catch(() => '');
        const takwim = this.dataService.getTakwimForApp(takwimContent);
        this.socketServerService.broadcastTakwimRefresh({ takwimArray: takwim.takwimArray, takwimParsed: takwim.takwimParsed });
        
        res.json({
          success: true,
          message: 'React app reload triggered'
        });
      } catch (error) {
        console.error('Error triggering React reload:', error);
        res.status(500).json({ error: error.message || 'Failed to trigger React reload' });
      }
    });
    
    // System control - Test TV sound (HDMI via speaker-test)
    this.app.post('/api/system/test-tv-sound', async (req, res) => {
      try {
        const { exec } = require('child_process');
        const env = { ...process.env, XDG_RUNTIME_DIR: '/run/user/1000', PULSE_RUNTIME_PATH: '/run/user/1000/pulse' };
        exec('speaker-test -t sine -f 1000 -l 1 -D default', { env }, (error, stdout, stderr) => {
          if (error) {
            console.error('TV sound test error:', error);
            return res.status(500).json({ success: false, error: 'Gagal main bunyi TV', detail: stderr || error.message });
          }
          const played = stdout.includes('Time per period');
          res.json({ success: played, message: played ? 'Bunyi berjaya dihantar ke TV' : 'Tiada output audio', detail: stdout.trim() });
        });
      } catch (error) {
        console.error('Error testing TV sound:', error);
        res.status(500).json({ error: error.message || 'Failed to test TV sound' });
      }
    });

    // System control - Reboot kiosk
    this.app.post('/api/system/reboot', async (req, res) => {
      try {
        // Broadcast system:reboot event to trigger React window reload
        this.socketServerService.broadcastSystemReboot();
        
        // Send success response first
        res.json({
          success: true,
          message: 'Reboot command initiated'
        });
        
        // Execute reboot after response (delay sedikit untuk React reload window dulu)
        setTimeout(() => {
          const { exec } = require('child_process');
          exec('sudo reboot', (error, stdout, stderr) => {
            if (error) {
              console.error('Reboot error:', error);
            }
          });
        }, 2000); // Delay 2 seconds untuk React reload window dulu
      } catch (error) {
        console.error('Error initiating reboot:', error);
        res.status(500).json({ error: error.message || 'Failed to initiate reboot' });
      }
    });
    
    // ================= Rangkaian: WiFi ↔ Hotspot =================
    // Semua tindakan yang mengubah wlan0 disalurkan melalui network-monitor.js
    // supaya selaras dengan lock, fail keadaan dan "tahan" pemantau.

    // GET /api/wifi/scan — imbasan hidup (iw; berfungsi juga dalam mod AP).
    // Gagal → pulangkan senarai cache terakhir dengan penanda.
    this.app.get('/api/wifi/scan', async (req, res) => {
      try {
        const isRPi = await this.isRaspberryPiEnvironment();
        if (!isRPi) {
          return res.json({ success: true, networks: [], available: false,
            message: 'WiFi configuration hanya tersedia dalam Raspberry Pi/Linux environment' });
        }
        if (netmonAvailable()) {
          const r = await runNetmon(['scan'], 25000);
          if (r.ok && r.parsed && r.parsed.ok) {
            return res.json({ success: true, live: true, scannedAt: r.parsed.scannedAt, networks: r.parsed.networks });
          }
        } else {
          // Fallback tanpa monitor: imbas nmcli (hanya dalam mod wifi)
          const { exec } = require('child_process');
          const { promisify } = require('util');
          const execAsync = promisify(exec);
          const nmcli = this.getNmcliPath();
          const { stdout } = await execAsync(`${nmcli} -t -f SSID,SIGNAL,SECURITY,IN-USE device wifi list`, { timeout: 15000 });
          const networks = [];
          stdout.trim().split('\n').filter(l => l.trim()).forEach(line => {
            const parts = line.split(':');
            const ssid = parts[0];
            const signalStrength = parseInt(parts[1]) || 0;
            if (ssid && ssid !== '--' && signalStrength >= 30) {
              networks.push({ ssid, signal: signalStrength, security: parts[2] || 'Open', inUse: parts[3] === '*' });
            }
          });
          networks.sort((a, b) => b.signal - a.signal);
          return res.json({ success: true, live: true, networks });
        }
        // Imbasan hidup gagal → senarai cache sebagai sandaran
        const cachePath = path.join(process.env.HOME || '/home/ipray', 'network-monitor', 'scan-cache.json');
        try {
          const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
          return res.json({ success: true, live: false, cached: true, scannedAt: cached.scannedAt, networks: cached.networks || [] });
        } catch (_) {
          return res.status(502).json({ error: 'Imbasan hidup gagal dan tiada senarai cache' });
        }
      } catch (error) {
        console.error('Error scanning WiFi:', error);
        res.status(500).json({ error: error.message || 'Gagal scan WiFi networks' });
      }
    });

    // GET /api/wifi/status — mod semasa, SSID/IP/isyarat, klien hotspot,
    // keadaan pemantau (sebab tukar, percubaan seterusnya, hasil connect-now, tahan).
    this.app.get('/api/wifi/status', async (req, res) => {
      try {
        const isRPi = await this.isRaspberryPiEnvironment();
        if (!isRPi) {
          return res.json({ success: true, status: { connected: false, ssid: null, device: null,
            connectionName: null, deviceAvailable: false, available: false,
            error: 'WiFi configuration hanya tersedia dalam Raspberry Pi/Linux environment' } });
        }
        if (netmonAvailable()) {
          const r = await runNetmon(['status'], 20000);
          if (r.parsed) {
            const m = r.parsed;
            return res.json({ success: true, status: {
              connected: m.mode === 'wifi',
              mode: m.mode,
              ssid: m.ssid,
              ip: m.ip,
              signalDbm: m.signalDbm,
              connectionName: m.connectionName,
              device: 'wlan0',
              deviceAvailable: true,
              available: true,
              hotspotClients: m.hotspotClients,
              holdActive: m.holdActive,
              holdUntil: m.holdUntil,
              lastCheckAt: m.lastCheckAt,
              lastSwitchReason: m.lastSwitchReason,
              nextTryAt: m.nextTryAt,
              deferredClients: m.deferredClients,
              connectNowInProgress: m.connectNowInProgress,
              lastConnectNow: m.lastConnectNow,
              internetCheckEnabled: m.internetCheckEnabled,
            } });
          }
        }
        // Fallback minimal tanpa monitor
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const nmcli = this.getNmcliPath();
        const status = { connected: false, ssid: null, device: null, connectionName: null,
          deviceAvailable: false, error: null, available: true };
        try {
          const { stdout: dev } = await execAsync(`${nmcli} -t -f DEVICE,TYPE,STATE device status | grep "^wlan0:"`, { timeout: 15000 });
          const parts = dev.trim().split(':');
          status.deviceAvailable = parts.length >= 3 && parts[2] !== 'unavailable';
          if (parts[2] === 'connected') {
            status.connected = true;
            status.device = 'wlan0';
            const { stdout: info } = await execAsync(`${nmcli} -t -f GENERAL.CONNECTION device show wlan0`, { timeout: 15000 });
            const cm = info.match(/GENERAL\.CONNECTION:(.+)/);
            if (cm) {
              status.connectionName = cm[1].trim();
              if (status.connectionName === 'ipray-hotspot') { status.connected = false; status.mode = 'hotspot'; status.ssid = 'iPray-Hotspot'; }
              else { status.mode = 'wifi'; const sm = status.connectionName.match(/netplan-wlan0-(.+)/); status.ssid = sm ? sm[1] : status.connectionName; }
            }
          } else {
            status.mode = 'none';
          }
        } catch (_) { status.error = 'Gagal membaca status wlan0'; }
        res.json({ success: true, status });
      } catch (error) {
        console.error('Error getting WiFi status:', error);
        res.status(500).json({ error: error.message || 'Gagal mendapatkan status WiFi' });
      }
    });

    // GET /api/wifi/profiles — senarai rangkaian WiFi tersimpan (tanpa kata laluan)
    this.app.get('/api/wifi/profiles', async (req, res) => {
      try {
        const isRPi = await this.isRaspberryPiEnvironment();
        if (!isRPi) return res.json({ success: true, profiles: [], available: false });
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const nmcli = this.getNmcliPath();
        const { stdout } = await execAsync(`${nmcli} -t -f NAME,UUID,TYPE connection show`, { timeout: 15000 });
        const profiles = [];
        for (const line of stdout.trim().split('\n')) {
          const p = line.split(':');
          if (p[2] !== '802-11-wireless' || p[0] === 'ipray-hotspot') continue;
          const prof = { name: p[0], uuid: p[1] };
          try {
            const { stdout: det } = await execAsync(`${nmcli} -t -f 802-11-wireless.ssid,connection.autoconnect,connection.autoconnect-priority connection show "${escapeShellDoubleQuoted(p[0])}"`, { timeout: 15000 });
            const ssid = det.match(/802-11-wireless\.ssid:(.*)/);
            const ac = det.match(/connection\.autoconnect:(.*)/);
            const pr = det.match(/connection\.autoconnect-priority:(.*)/);
            prof.ssid = ssid ? ssid[1].trim() : null;
            prof.autoconnect = ac ? ac[1].trim() === 'yes' : true;
            prof.priority = pr ? parseInt(pr[1].trim(), 10) : 0;
          } catch (_) { /* abaikan gagal baca detail */ }
          profiles.push(prof);
        }
        res.json({ success: true, profiles, available: true });
      } catch (error) {
        console.error('Error listing WiFi profiles:', error);
        res.status(500).json({ error: error.message || 'Gagal menyenarai profil WiFi' });
      }
    });

    // POST /api/wifi/configure — SIMPAN sahaja: cipta/kemas kini profil NM
    // tanpa mengaktifkan dan tanpa menyentuh wlan0 (keputusan reka bentuk #1).
    this.app.post('/api/wifi/configure', async (req, res) => {
      try {
        const isRPi = await this.isRaspberryPiEnvironment();
        if (!isRPi) {
          return res.status(400).json({ error: 'WiFi configuration hanya tersedia dalam Raspberry Pi/Linux environment', available: false });
        }
        const { ssid, password } = req.body;
        if (!ssid || !String(ssid).trim()) {
          return res.status(400).json({ error: 'SSID diperlukan' });
        }
        if (String(ssid).length > 32) {
          return res.status(400).json({ error: 'SSID terlalu panjang (maksimum 32 aksara)' });
        }
        if (password && String(password).length < 8) {
          return res.status(400).json({ error: 'Password WiFi minimum 8 aksara' });
        }

        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = (cmd, opts) => promisify(exec)(cmd, { timeout: 15000, ...opts });
        const nmcli = this.getNmcliPath();

        const connectionName = `${WIFI_PROFILE_PREFIX}${String(ssid).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        const esc = escapeShellDoubleQuoted;
        const secArgs = password ? `wifi-sec.key-mgmt wpa-psk wifi-sec.psk "${esc(password)}"` : '';

        // Wujudkan atau kemas kini profil — TIADA "connection up", TIADA disconnect.
        // autoconnect-priority 100 → WiFi didahulukan berbanding hotspot (-999).
        let exists = false;
        try {
          const { stdout } = await execAsync(`${nmcli} -t -f NAME connection show`);
          exists = stdout.split('\n').includes(connectionName);
        } catch (_) { /* ignore */ }

        if (exists) {
          await execAsync(`sudo ${nmcli} connection modify "${esc(connectionName)}" 802-11-wireless.ssid "${esc(ssid)}" ${secArgs} connection.autoconnect yes connection.autoconnect-priority 100 connection.autoconnect-retries 0`);
          // Rangkaian terbuka — kosongkan seksyen keselamatan lama
          if (!password) {
            await execAsync(`sudo ${nmcli} connection modify "${esc(connectionName)}" wifi-sec.key-mgmt "" wifi-sec.psk ""`).catch(() => {});
          }
        } else {
          await execAsync(`sudo ${nmcli} connection add type wifi con-name "${esc(connectionName)}" ifname wlan0 ssid "${esc(ssid)}" ${secArgs} connection.autoconnect yes connection.autoconnect-priority 100 connection.autoconnect-retries 0`);
        }

        res.json({
          success: true,
          saved: true,
          connectionName,
          message: `Rangkaian "${ssid}" disimpan. Guna "Sambung WiFi sekarang" untuk mengaktifkannya.`,
        });
      } catch (error) {
        console.error('Error saving WiFi profile:', error);
        const msg = (error && (error.stderr || error.message)) || 'Gagal menyimpan profil WiFi';
        res.status(500).json({ error: msg });
      }
    });

    // POST /api/wifi/connect-now — butang "Sambung WiFi sekarang".
    // Async: spawn connect-now di latar belakang (~45s), hasil dalam fail keadaan.
    this.app.post('/api/wifi/connect-now', async (req, res) => {
      try {
        const isRPi = await this.isRaspberryPiEnvironment();
        if (!isRPi) {
          return res.status(400).json({ error: 'Hanya tersedia dalam Raspberry Pi/Linux environment', available: false });
        }
        if (!netmonAvailable()) {
          return res.status(503).json({ error: 'Network monitor belum dipasang pada kiosk ini' });
        }
        const { name } = req.body || {};
        if (!name || !/^[\w.-]+$/.test(String(name))) {
          return res.status(400).json({ error: 'Nama profil tidak sah' });
        }
        // Sahkan profil wujud dan jenis wifi (bukan hotspot)
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const nmcli = this.getNmcliPath();
        const { stdout } = await execAsync(`${nmcli} -t -f NAME,TYPE connection show`, { timeout: 15000 });
        const found = stdout.split('\n').some(l => { const p = l.split(':'); return p[0] === name && p[1] === '802-11-wireless'; });
        if (!found) return res.status(404).json({ error: `Profil "${name}" tidak dijumpai` });

        const { spawn } = require('child_process');
        const child = spawn('/usr/bin/node', [NETMON_SCRIPT, 'connect-now', name], {
          detached: true, stdio: 'ignore',
        });
        child.unref();
        res.status(202).json({
          success: true, started: true,
          message: 'Kiosk sedang mencuba WiFi tersebut (~45s). Sambungan ke hotspot akan terputus — sambung semula ke rangkaian yang betul dan semak status.',
        });
      } catch (error) {
        console.error('Error connect-now:', error);
        res.status(500).json({ error: error.message || 'Gagal memulakan connect-now' });
      }
    });

    // POST /api/wifi/profile/delete — padam profil WiFi tersimpan.
    // Tidak boleh padam profil yang sedang aktif atau profil hotspot.
    this.app.post('/api/wifi/profile/delete', async (req, res) => {
      try {
        const isRPi = await this.isRaspberryPiEnvironment();
        if (!isRPi) {
          return res.status(400).json({ error: 'Hanya tersedia dalam Raspberry Pi/Linux environment', available: false });
        }
        const { name } = req.body || {};
        if (!name || !/^[\w.-]+$/.test(String(name)) || name === HOTSPOT_PROFILE) {
          return res.status(400).json({ error: 'Nama profil tidak sah' });
        }
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const nmcli = this.getNmcliPath();
        // Jangan padam profil yang sedang aktif
        const { stdout: act } = await execAsync(`${nmcli} -t -f NAME connection show --active`, { timeout: 15000 });
        if (act.split('\n').includes(name)) {
          return res.status(409).json({ error: 'Profil sedang aktif — sambung ke rangkaian lain dahulu' });
        }
        await execAsync(`sudo ${nmcli} connection delete "${escapeShellDoubleQuoted(name)}"`, { timeout: 15000 });
        res.json({ success: true, message: `Profil "${name}" dipadam` });
      } catch (error) {
        console.error('Error deleting WiFi profile:', error);
        res.status(500).json({ error: error.message || 'Gagal memadam profil WiFi' });
      }
    });

    // POST /api/wifi/hotspot/enable — naikkan profil ipray-hotspot sedia ada
    // melalui pemantau (tetapkan "tahan", lalai 30 minit).
    this.app.post('/api/wifi/hotspot/enable', async (req, res) => {
      try {
        const isRPi = await this.isRaspberryPiEnvironment();
        if (!isRPi) {
          return res.status(400).json({ error: 'Hotspot configuration hanya tersedia dalam Raspberry Pi/Linux environment', available: false });
        }
        const holdMin = Number.isFinite(parseInt(req.body && req.body.holdMinutes, 10)) ? parseInt(req.body.holdMinutes, 10) : 30;
        if (netmonAvailable()) {
          const r = await runNetmon(['enable-hotspot', '--hold', String(holdMin)], 45000);
          if (r.ok && r.parsed && r.parsed.ok) {
            return res.json({ success: true, message: `Hotspot "${HOTSPOT_DEFAULTS.SSID}" diaktifkan (tahan ${holdMin} min)`, holdUntil: r.parsed.holdUntil });
          }
          return res.status(500).json({ error: (r.parsed && r.parsed.error) || r.err || 'Gagal aktifkan hotspot' });
        }
        // Fallback tanpa monitor: up profil sedia ada sahaja
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const nmcli = this.getNmcliPath();
        await execAsync(`sudo ${nmcli} connection up "${HOTSPOT_PROFILE}"`, { timeout: 30000 });
        res.json({ success: true, message: `Hotspot "${HOTSPOT_DEFAULTS.SSID}" telah diaktifkan`, ssid: HOTSPOT_DEFAULTS.SSID });
      } catch (error) {
        console.error('Error enabling hotspot:', error);
        res.status(500).json({ error: error.message || 'Gagal enable hotspot' });
      }
    });

    // POST /api/wifi/hotspot/disable — turunkan hotspot (profil TIDAK dipadam),
    // kosongkan tahan supaya pemantau boleh kembali ke WiFi.
    this.app.post('/api/wifi/hotspot/disable', async (req, res) => {
      try {
        const isRPi = await this.isRaspberryPiEnvironment();
        if (!isRPi) {
          return res.json({ success: true, available: false,
            message: 'Hotspot configuration hanya tersedia dalam Raspberry Pi/Linux environment' });
        }
        if (netmonAvailable()) {
          const r = await runNetmon(['disable-hotspot'], 30000);
          if (r.ok) return res.json({ success: true, message: 'Hotspot telah dinyahaktifkan' });
          return res.status(500).json({ error: (r.parsed && r.parsed.error) || r.err || 'Gagal nyahaktif hotspot' });
        }
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const nmcli = this.getNmcliPath();
        await execAsync(`sudo ${nmcli} connection down "${HOTSPOT_PROFILE}" 2>/dev/null || true`, { timeout: 15000 });
        res.json({ success: true, message: 'Hotspot telah dinyahaktifkan' });
      } catch (error) {
        console.error('Error disabling hotspot:', error);
        res.status(500).json({ error: error.message || 'Gagal disable hotspot' });
      }
    });

    // GET /api/wifi/hotspot/status — status hotspot (enabled, ssid, klien)
    this.app.get('/api/wifi/hotspot/status', async (req, res) => {
      try {
        const isRPi = await this.isRaspberryPiEnvironment();
        if (!isRPi) {
          return res.json({ success: true, status: { enabled: false, ssid: null, connectionName: null,
            available: false, message: 'Hotspot configuration hanya tersedia dalam Raspberry Pi/Linux environment' } });
        }
        const status = { enabled: false, ssid: null, connectionName: null, available: true, clients: 0 };
        if (netmonAvailable()) {
          const r = await runNetmon(['status'], 20000);
          if (r.parsed) {
            status.enabled = r.parsed.mode === 'hotspot';
            status.ssid = status.enabled ? (r.parsed.ssid || HOTSPOT_DEFAULTS.SSID) : null;
            status.connectionName = status.enabled ? HOTSPOT_PROFILE : null;
            status.clients = r.parsed.hotspotClients || 0;
            status.holdActive = r.parsed.holdActive;
            status.ip = status.enabled ? '10.42.0.1' : null;
            return res.json({ success: true, status });
          }
        }
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const nmcli = this.getNmcliPath();
        try {
          const { stdout: active } = await execAsync(`${nmcli} -t -f NAME connection show --active`, { timeout: 15000 });
          if (active.split('\n').includes(HOTSPOT_PROFILE)) {
            status.enabled = true;
            status.ssid = HOTSPOT_DEFAULTS.SSID;
            status.connectionName = HOTSPOT_PROFILE;
            status.ip = '10.42.0.1';
          }
        } catch (_) { /* ignore */ }
        res.json({ success: true, status });
      } catch (error) {
        console.error('Error getting hotspot status:', error);
        res.status(500).json({ error: error.message || 'Gagal mendapatkan status hotspot' });
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

}

// Export singleton instance
const apiServerService = new ApiServerService();
module.exports = apiServerService;
