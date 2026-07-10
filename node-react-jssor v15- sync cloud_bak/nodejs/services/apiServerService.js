const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { parseKuliahOverride } = require('./kuliahOverrideParser');
const { processKuliahHari, processKuliahMinggu, processKuliahBulanan } = require('./kuliahProcessor');
const { getWeekCode, getDayCode } = require('./kuliahDateUtils');

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
    
    // Serve penceramah images dengan fallback ke noimage.png
    if (this.imagesPath) {
      this.app.get('/images/penceramah/:filename', (req, res, next) => {
        const filename = req.params.filename;
        const imagePath = path.join(this.imagesPath, 'penceramah', filename);
        
        // Check jika file wujud
        if (fs.existsSync(imagePath)) {
          // File wujud, serve as usual
          res.sendFile(imagePath);
        } else {
          // File tidak wujud, serve noimage.png dari images folder
          const defaultImage = path.join(this.imagesPath, 'noimage.png');
          if (fs.existsSync(defaultImage)) {
            res.sendFile(defaultImage);
          } else {
            // Fallback: jika noimage.png juga tidak wujud
            res.status(404).json({ error: 'Image not found' });
          }
        }
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
    
    // Setup all routes
    this.setupRoutes();
  }

  /**
   * Check if running in Raspberry Pi/Linux environment with nmcli
   */
  async isRaspberryPiEnvironment() {
    try {
      const os = require('os');
      const platform = os.platform();
      
      // Check if running on Linux
      if (platform !== 'linux') {
        return false;
      }
      
      // Check if nmcli exists
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      try {
        await execAsync('/usr/bin/nmcli --version 2>/dev/null');
        return true;
      } catch (err) {
        // Try alternative path
        try {
          await execAsync('which nmcli 2>/dev/null');
          return true;
        } catch (err2) {
          return false;
        }
      }
    } catch (error) {
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
    
    // Get calibrated time info
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
    
    // Force NTP sync
    this.app.get('/api/time/sync', async (req, res) => {
      try {
        if (!this.timeService) {
          return res.status(503).json({ error: 'Time service not available' });
        }
        const result = await this.timeService.syncNtp();

        // Notify clients via socket supaya frontend update masa serta-merta
        if (this.socketServerService) {
          this.socketServerService.broadcastEvent('time-offset-updated', result);
        }

        res.json(result);
      } catch (error) {
        console.error('Error syncing NTP:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Update manual offset
    this.app.post('/api/time/offset', async (req, res) => {
      try {
        if (!this.timeService) {
          return res.status(503).json({ error: 'Time service not available' });
        }
        const { offsetMs } = req.body;
        if (offsetMs === undefined) {
          return res.status(400).json({ error: 'offsetMs is required' });
        }
        const result = await this.timeService.updateManualOffset(offsetMs);
        
        // Notify clients via socket
        if (this.socketServerService) {
          this.socketServerService.broadcastEvent('time-offset-updated', result);
        }
        
        res.json(result);
      } catch (error) {
        console.error('Error updating manual offset:', error);
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
        if (year < 2020 || year > 2030) {
          return res.status(400).json({ error: 'Year out of allowed range (2020-2030)' });
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
          let dateTimeRaw;
          let event = c.event;
          let windowDays = c.windowDays ?? 0;
          if (c.type === 'COUNTDOWN_HIJRI') {
            const gregorianDate = this.dataService.getNextGregorianForHijriDate(
              takwimContent, c.month, c.day, today
            );
            if (!gregorianDate) continue;
            dateTimeRaw = `${gregorianDate} 00:00`;
          } else if (c.type === 'COUNTDOWN_MASIHI') {
            const gregorianDate = this.dataService.getNextGregorianForMonthDay(c.month, c.day, today);
            if (!gregorianDate) continue;
            dateTimeRaw = `${gregorianDate} 00:00`;
          } else {
            dateTimeRaw = c.dateTimeRaw || '';
            if (!dateTimeRaw) continue;
          }
          const { daysRemaining, countdownText } = this.dataService.getCountdownFromDate(dateTimeRaw, today);
          if (countdownText === 'LEWAT') continue;
          if (windowDays > 0 && daysRemaining > windowDays) continue;
          countdowns.push({
            type: 'COUNTDOWN',
            dateTimeRaw,
            event,
            windowDays,
            raw: c.raw,
            daysRemaining,
            countdownText
          });
        }
        const kuliahLines = this.dataService.parseKuliah(kuliahContent);
        let penceramahMap = {};
        try {
          const penceramahContent = await this.dataService.readFile('penceramah');
          const penceramahParsed = this.dataService.parseFileContent('penceramah', penceramahContent);
          penceramahParsed.forEach((p) => {
            if (p.kod) penceramahMap[p.kod] = { namaPenuh: p.namaPenuh, imageCode: p.imageCode || '' };
          });
        } catch (e) {
          console.warn('Could not load penceramah for app:', e);
        }
        const resolveKuliahLine = (line) => {
          const parts = line.split('|');
          if (parts.length >= 5) {
            const speakerVal = (parts[3] || '').trim();
            const match = penceramahMap[speakerVal];
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
              if (match) return { ...e, penceramah: match.namaPenuh };
              return e;
            })
          }));
        }
        const images = this.dataService.parseImages(imagesContent);
        const slidesConfig = this.dataService.parseSlidesConfig(slidesContent);
        const config = this.dataService.parseConfig(configContent);
        const slideshowParsed = this.dataService.parseSlideshow(slideshowContent);
        const slideshow = this.dataService.filterSlideshowByValidity(slideshowParsed, new Date());
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
          const week = getWeekCode(today);
          const day = getDayCode(today);
          const petugasMap = {};
          petugasParsed.forEach((p) => { if (p.kod) petugasMap[p.kod] = p; });
          const jadualToday = (jadualParsed || []).filter((j) => (j.week || '').trim() === week && (j.day || '').trim() === day);
          const roleOrder = ['BILAL', 'IMAM'];
          jadualToday.forEach((j) => {
            const officerCode = (j.officerCode || '').trim();
            const role = (j.role || '').trim().toUpperCase() || 'BILAL';
            const officer = officerCode ? petugasMap[officerCode] : null;
            const name = officer ? (officer.namaPenuh || officer.kod || '') : '';
            let imageSrc = '';
            if (officer && officer.imageCode && images && typeof images === 'object') {
              const path = images[(officer.imageCode || '').trim()];
              if (path) imageSrc = path.startsWith('/') ? path : `/${path}`;
            }
            if (!imageSrc) imageSrc = '/img/Random_user.svg';
            petugasData.push({ label: role || 'PETUGAS', name, imageSrc });
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
            this.socketServerService.broadcastTakwimRefresh();
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
              if (p.kod) penceramahMap[p.kod] = { namaPenuh: p.namaPenuh, imageCode: p.imageCode };
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
        const todayData = this.dataService.getTodayTakwim(content);
        
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
        
        if (this.socketServerService) {
          if (filename === 'takwim') {
            this.socketServerService.broadcastTakwimRefresh();
          } else if (filename === 'config' && row && row.split('|')[0]?.startsWith('HOME_TITLE')) {
            const configContent = await this.dataService.readFile('config');
            const parsed = this.dataService.parseConfig(configContent);
            this.socketServerService.broadcastHomeTitleUpdate(parsed.HOME_TITLE_CONFIG);
          } else if (filename === 'config' && row && row.split('|')[0]?.startsWith('MARQUEE')) {
            const configContent = await this.dataService.readFile('config');
            const parsed = this.dataService.parseConfig(configContent);
            this.socketServerService.broadcastMarqueeConfigUpdate(parsed.MARQUEE_CONFIG);
          } else if (filename === 'hebahan') {
            const hebahanContent = await this.dataService.readFile('hebahan').catch(() => '');
            const hebahan = this.dataService.parseHebahan(hebahanContent);
            this.socketServerService.broadcastHebahanUpdate(hebahan);
          } else {
            this.socketServerService.broadcastDataUpdate(filename, { action: 'row:update', rowId: id, row });
          }
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
        
        if (this.socketServerService) {
          if (filename === 'takwim') {
            this.socketServerService.broadcastTakwimRefresh();
          } else if (filename === 'config' && row && row.split('|')[0]?.startsWith('HOME_TITLE')) {
            const configContent = await this.dataService.readFile('config');
            const parsed = this.dataService.parseConfig(configContent);
            this.socketServerService.broadcastHomeTitleUpdate(parsed.HOME_TITLE_CONFIG);
          } else if (filename === 'config' && row && row.split('|')[0]?.startsWith('MARQUEE')) {
            const configContent = await this.dataService.readFile('config');
            const parsed = this.dataService.parseConfig(configContent);
            this.socketServerService.broadcastMarqueeConfigUpdate(parsed.MARQUEE_CONFIG);
          } else if (filename === 'hebahan') {
            const hebahanContent = await this.dataService.readFile('hebahan').catch(() => '');
            const hebahan = this.dataService.parseHebahan(hebahanContent);
            this.socketServerService.broadcastHebahanUpdate(hebahan);
          } else {
            this.socketServerService.broadcastDataUpdate(filename, { action: 'row:insert' });
          }
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
        
        // Pass imagesPath untuk delete image file jika slideshow
        const result = await this.dataService.deleteRow(filename, id, {
          imagesPath: this.imagesPath
        });
        
        if (this.socketServerService) {
          if (filename === 'takwim') {
            this.socketServerService.broadcastTakwimRefresh();
          } else if (filename === 'hebahan') {
            const hebahanContent = await this.dataService.readFile('hebahan').catch(() => '');
            const hebahan = this.dataService.parseHebahan(hebahanContent);
            this.socketServerService.broadcastHebahanUpdate(hebahan);
          } else {
            this.socketServerService.broadcastDataUpdate(filename, { action: 'row:delete', rowId: id });
          }
        }
        
        res.json(result);
      } catch (error) {
        console.error('Error deleting row:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Toggle slide hide/show (slides only) - update terus tanpa buka dialog
    this.app.post('/api/data/slides/:id/toggle-hide', async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ error: 'Invalid row ID' });
        }
        const result = await this.dataService.toggleSlideHide('slides', id);
        if (this.socketServerService) {
          this.socketServerService.broadcastDataUpdate('slides', { action: 'row:update', rowId: id });
        }
        res.json(result);
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
          if (this.socketServerService) {
            this.socketServerService.broadcastDataUpdate('images', { action: 'image:upload', path: saved.path, category: saved.category });
            this.socketServerService.broadcastTakwimRefresh();
          }
        }, 100);
      } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: error.message || 'Gagal memuat naik image' });
      }
    });
    
    // System control - Reload React app
    this.app.post('/api/system/reload-react', async (req, res) => {
      try {
        // Broadcast data:updated untuk semua data types untuk trigger React reload
        const dataTypes = ['slides', 'kuliah', 'images', 'announcements', 'countdowns', 'takwim', 'config', 'petugas', 'jadual-petugas'];
        
        dataTypes.forEach(filename => {
          this.socketServerService.broadcastDataUpdate(filename, { action: 'reload:react' });
        });
        
        this.socketServerService.broadcastTakwimRefresh();
        
        res.json({
          success: true,
          message: 'React app reload triggered'
        });
      } catch (error) {
        console.error('Error triggering React reload:', error);
        res.status(500).json({ error: error.message || 'Failed to trigger React reload' });
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
    
    // WiFi Configuration - Scan available networks
    this.app.get('/api/wifi/scan', async (req, res) => {
      try {
        // Check if running in Raspberry Pi/Linux environment
        const isRPi = await this.isRaspberryPiEnvironment();
        if (!isRPi) {
          return res.json({
            success: true,
            networks: [],
            message: 'WiFi configuration hanya tersedia dalam Raspberry Pi/Linux environment',
            available: false
          });
        }
        
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const nmcli = this.getNmcliPath();
        
        // First check if WiFi device is available
        try {
          const { stdout: devices } = await execAsync(`${nmcli} -t -f DEVICE device status`);
          if (!devices.includes('wlan0')) {
            return res.status(400).json({ 
              error: 'WiFi device (wlan0) tidak tersedia atau telah di-unplug',
              deviceAvailable: false
            });
          }
        } catch (err) {
          return res.status(400).json({ 
            error: 'WiFi device tidak tersedia',
            deviceAvailable: false
          });
        }
        
        // Scan WiFi networks
        const { stdout, stderr } = await execAsync(`${nmcli} -t -f SSID,SIGNAL,SECURITY,IN-USE device wifi list`);
        
        if (stderr) {
          console.error('WiFi scan error:', stderr);
        }
        
        // Parse output
        const networks = [];
        const lines = stdout.trim().split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          const parts = line.split(':');
          if (parts.length >= 3) {
            const ssid = parts[0];
            const signal = parts[1];
            const security = parts[2] || '';
            const inUse = parts[3] === '*';
            
            if (ssid && ssid !== '--') {
              const signalStrength = parseInt(signal) || 0;
              
              // Filter: hanya ambil networks dengan signal 30% ke atas
              if (signalStrength >= 30) {
                networks.push({
                  ssid: ssid,
                  signal: signalStrength,
                  security: security || 'Open',
                  inUse: inUse
                });
              }
            }
          }
        });
        
        // Sort by signal strength (descending)
        networks.sort((a, b) => b.signal - a.signal);
        
        res.json({
          success: true,
          networks: networks,
          totalScanned: lines.length,
          filtered: networks.length
        });
      } catch (error) {
        console.error('Error scanning WiFi:', error);
        res.status(500).json({ error: error.message || 'Gagal scan WiFi networks' });
      }
    });
    
    // WiFi Configuration - Get current WiFi status
    this.app.get('/api/wifi/status', async (req, res) => {
      try {
        // Check if running in Raspberry Pi/Linux environment
        const isRPi = await this.isRaspberryPiEnvironment();
        if (!isRPi) {
          return res.json({
            success: true,
            status: {
              connected: false,
              ssid: null,
              device: null,
              connectionName: null,
              deviceAvailable: false,
              error: 'WiFi configuration hanya tersedia dalam Raspberry Pi/Linux environment',
              available: false
            }
          });
        }
        
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        let status = {
          connected: false,
          ssid: null,
          device: null,
          connectionName: null,
          deviceAvailable: false,
          error: null,
          available: true
        };
        
        const nmcli = this.getNmcliPath();
        
        // Method 1: Check active WiFi connections
        try {
          const { stdout: activeConnections } = await execAsync(`${nmcli} -t -f NAME,DEVICE,TYPE connection show --active | grep 802-11-wireless`);
          
          if (activeConnections.trim()) {
            const lines = activeConnections.trim().split('\n');
            for (const line of lines) {
              const parts = line.split(':');
              if (parts.length >= 3 && parts[2] === '802-11-wireless') {
                status.connected = true;
                status.connectionName = parts[0];
                status.device = parts[1];
                
                // Get SSID from connection
                try {
                  const { stdout: connInfo } = await execAsync(`${nmcli} -t -f 802-11-wireless.ssid connection show "${parts[0]}"`);
                  const ssidMatch = connInfo.match(/802-11-wireless\.ssid:(.+)/);
                  if (ssidMatch) {
                    status.ssid = ssidMatch[1].trim();
                  } else {
                    // Fallback: extract SSID from connection name (format: netplan-wlan0-SSID)
                    const nameMatch = parts[0].match(/netplan-wlan0-(.+)/);
                    if (nameMatch) {
                      status.ssid = nameMatch[1];
                    }
                  }
                } catch (err) {
                  console.error('Error getting SSID from connection:', err);
                  // Fallback: extract SSID from connection name
                  const nameMatch = parts[0].match(/netplan-wlan0-(.+)/);
                  if (nameMatch) {
                    status.ssid = nameMatch[1];
                  }
                }
                break;
              }
            }
          }
        } catch (err) {
          // If no active connections found, check device status as fallback
          console.log('No active WiFi connections found, checking device status...');
        }
        
        // Method 2: Fallback - Check device status directly
        if (!status.connected) {
          try {
            // First check if wlan0 device exists
            let deviceExists = false;
            try {
              const { stdout: allDevices } = await execAsync(`${nmcli} -t -f DEVICE device status`);
              if (allDevices.includes('wlan0')) {
                deviceExists = true;
                status.deviceAvailable = true;
              }
            } catch (err) {
              console.error('Error checking devices:', err);
            }
            
            if (!deviceExists) {
              // Device not available (unplugged or not present)
              status.device = null;
              status.deviceAvailable = false;
              status.error = 'WiFi device (wlan0) tidak tersedia atau telah di-unplug';
            } else {
              // Device exists, check status
              const { stdout: deviceStatus } = await execAsync(`${nmcli} -t -f DEVICE,TYPE,STATE device status | grep "^wlan0:"`);
              
              if (deviceStatus.trim()) {
                const parts = deviceStatus.trim().split(':');
                if (parts.length >= 3) {
                  status.device = 'wlan0';
                  
                  if (parts[2] === 'connected') {
                    status.connected = true;
                    
                    // Get connection name from device
                    try {
                      const { stdout: deviceInfo } = await execAsync(`${nmcli} -t -f GENERAL.CONNECTION device show wlan0`);
                      const connectionMatch = deviceInfo.match(/GENERAL\.CONNECTION:(.+)/);
                      
                      if (connectionMatch) {
                        const connectionName = connectionMatch[1].trim();
                        status.connectionName = connectionName;
                        
                        // Get SSID from connection
                        try {
                          const { stdout: connInfo } = await execAsync(`${nmcli} -t -f 802-11-wireless.ssid connection show "${connectionName}"`);
                          const ssidMatch = connInfo.match(/802-11-wireless\.ssid:(.+)/);
                          if (ssidMatch) {
                            status.ssid = ssidMatch[1].trim();
                          } else {
                            // Fallback: extract from connection name
                            const nameMatch = connectionName.match(/netplan-wlan0-(.+)/);
                            if (nameMatch) {
                              status.ssid = nameMatch[1];
                            }
                          }
                        } catch (err) {
                          console.error('Error getting SSID:', err);
                          // Fallback: extract from connection name
                          const nameMatch = connectionName.match(/netplan-wlan0-(.+)/);
                          if (nameMatch) {
                            status.ssid = nameMatch[1];
                          }
                        }
                      }
                    } catch (err) {
                      console.error('Error getting connection name:', err);
                    }
                  } else if (parts[2] === 'unavailable' || parts[2] === 'unmanaged') {
                    status.deviceAvailable = false;
                    status.error = 'WiFi device tidak tersedia atau tidak diuruskan';
                  } else {
                    status.error = `WiFi device status: ${parts[2]}`;
                  }
                }
              } else {
                status.deviceAvailable = false;
                status.error = 'WiFi device wlan0 tidak ditemui';
              }
            }
          } catch (err) {
            console.error('Error checking device status:', err);
            // Check if it's a device not found error
            if (err.message && (err.message.includes('unplug') || err.message.includes('not found') || err.message.includes('No such device'))) {
              status.deviceAvailable = false;
              status.error = 'WiFi device tidak tersedia atau telah di-unplug';
            } else {
              status.deviceAvailable = false;
              status.error = `Error checking device: ${err.message}`;
            }
          }
        }
        
        res.json({
          success: true,
          status: status
        });
      } catch (error) {
        console.error('Error getting WiFi status:', error);
        res.status(500).json({ error: error.message || 'Gagal mendapatkan status WiFi' });
      }
    });
    
    // WiFi Configuration - Configure WiFi connection
    this.app.post('/api/wifi/configure', async (req, res) => {
      try {
        // Check if running in Raspberry Pi/Linux environment
        const isRPi = await this.isRaspberryPiEnvironment();
        if (!isRPi) {
          return res.status(400).json({ 
            error: 'WiFi configuration hanya tersedia dalam Raspberry Pi/Linux environment',
            available: false
          });
        }
        
        const { ssid, password } = req.body;
        
        if (!ssid) {
          return res.status(400).json({ error: 'SSID diperlukan' });
        }
        
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const nmcli = this.getNmcliPath();
        
        // Check if WiFi device is available
        try {
          const { stdout: devices } = await execAsync(`${nmcli} -t -f DEVICE device status`);
          if (!devices.includes('wlan0')) {
            return res.status(400).json({ 
              error: 'WiFi device (wlan0) tidak tersedia atau telah di-unplug. Sila pastikan WiFi adapter tersambung.',
              deviceAvailable: false
            });
          }
        } catch (err) {
          return res.status(400).json({ 
            error: 'WiFi device tidak tersedia',
            deviceAvailable: false
          });
        }
        
        // Escape SSID and password untuk security (handle special characters)
        const escapedSsid = ssid.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`').replace(/\\/g, '\\\\');
        const escapedPassword = password ? password.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`').replace(/\\/g, '\\\\') : '';
        
        // Generate connection name (remove special chars untuk connection name)
        const connectionName = `netplan-wlan0-${ssid.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        const escapedConnectionName = connectionName.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
        
        // Delete existing connection with same name if exists
        try {
          await execAsync(`sudo ${nmcli} connection delete "${escapedConnectionName}" 2>/dev/null || true`);
        } catch (err) {
          // Ignore error if connection doesn't exist
        }
        
        // Disconnect current WiFi connection if any
        try {
          await execAsync(`sudo ${nmcli} device disconnect wlan0 2>/dev/null || true`);
        } catch (err) {
          // Ignore error if no active connection
        }
        
        // Create and connect to WiFi network
        let command;
        if (password) {
          // For secured networks: create connection with key-mgmt and password
          command = `sudo ${nmcli} connection add type wifi con-name "${escapedConnectionName}" ifname wlan0 ssid "${escapedSsid}" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "${escapedPassword}"`;
        } else {
          // For open networks: create connection without security
          command = `sudo ${nmcli} connection add type wifi con-name "${escapedConnectionName}" ifname wlan0 ssid "${escapedSsid}"`;
        }
        
        // First, create the connection
        const { stdout: addStdout, stderr: addStderr } = await execAsync(command);
        
        // Remove ANSI escape codes
        const cleanAddStdout = addStdout.replace(/\x1B\[[0-9;]*[JKmsu]/g, '').trim();
        const cleanAddStderr = addStderr.replace(/\x1B\[[0-9;]*[JKmsu]/g, '').trim();
        
        // Check for errors when adding connection
        if (cleanAddStderr && !cleanAddStderr.includes('successfully') && !cleanAddStderr.includes('Connection')) {
          if (cleanAddStderr.includes('connection already exists')) {
            // Connection already exists, try to activate it
            console.log('Connection already exists, activating...');
          } else {
            console.error('Error adding connection:', cleanAddStderr);
            return res.status(500).json({ error: cleanAddStderr || 'Gagal menambah connection WiFi' });
          }
        }
        
        // Now activate the connection
        const activateCommand = `sudo ${nmcli} connection up "${escapedConnectionName}"`;
        const { stdout: activateStdout, stderr: activateStderr } = await execAsync(activateCommand);
        
        // Remove ANSI escape codes
        const cleanActivateStdout = activateStdout.replace(/\x1B\[[0-9;]*[JKmsu]/g, '').trim();
        const cleanActivateStderr = activateStderr.replace(/\x1B\[[0-9;]*[JKmsu]/g, '').trim();
        
        // Combine output for checking
        const combinedOutput = (cleanActivateStdout + ' ' + cleanActivateStderr).toLowerCase();
        
        // Check for permission errors first
        if (combinedOutput.includes('insufficient privileges') || 
            combinedOutput.includes('permission denied') ||
            combinedOutput.includes('sudo: a password is required') ||
            combinedOutput.includes('not authorized')) {
          return res.status(500).json({ 
            error: 'Tidak mempunyai permission. Pastikan user ipray mempunyai sudo privileges tanpa password untuk nmcli commands. Sila setup sudoers file untuk allow nmcli tanpa password.' 
          });
        }
        
        // Check for success messages
        if (combinedOutput.includes('successfully') || 
            combinedOutput.includes('connection activated') ||
            combinedOutput.includes('device') && combinedOutput.includes('activated')) {
          res.json({
            success: true,
            message: `Berjaya menyambung ke ${ssid}`,
            ssid: ssid
          });
          return;
        }
        
        // Check for specific error messages
        if (cleanActivateStderr && !cleanActivateStderr.includes('successfully') && !cleanActivateStderr.includes('Connection activated')) {
          // Common error messages
          if (cleanActivateStderr.includes('No network with SSID') || cleanActivateStderr.includes('network not found')) {
            return res.status(400).json({ error: `Network "${ssid}" tidak ditemui. Sila pastikan SSID betul dan dalam range.` });
          }
          if (cleanActivateStderr.includes('Secrets were required') || cleanActivateStderr.includes('password required')) {
            return res.status(400).json({ error: 'Password diperlukan untuk network ini.' });
          }
          if (cleanActivateStderr.includes('802-11-wireless-security') || cleanActivateStderr.includes('key-mgmt')) {
            return res.status(400).json({ error: 'Password tidak sah atau format security tidak disokong.' });
          }
          if (cleanActivateStderr.includes('connection activation failed')) {
            return res.status(500).json({ error: 'Gagal activate connection. Sila pastikan SSID dan password betul.' });
          }
          
          console.error('WiFi connect error:', cleanActivateStderr);
          return res.status(500).json({ error: cleanActivateStderr || 'Gagal menyambung ke WiFi' });
        }
        
        // If we reach here, assume success (no error messages found)
        res.json({
          success: true,
          message: `Berjaya menyambung ke ${ssid}`,
          ssid: ssid
        });
      } catch (error) {
        console.error('Error configuring WiFi:', error);
        
        // Check for permission errors
        if (error.message && (error.message.includes('Insufficient privileges') || error.message.includes('permission denied'))) {
          return res.status(500).json({ 
            error: 'Tidak mempunyai permission. Pastikan user ipray mempunyai sudo privileges tanpa password untuk nmcli commands.' 
          });
        }
        
        // Auto-fallback to hotspot jika WiFi connection gagal
        console.log('WiFi connection failed, attempting to enable hotspot as fallback...');
        try {
          const { exec } = require('child_process');
          const { promisify } = require('util');
          const execAsync = promisify(exec);
          
          const connectionName = 'ipray-hotspot';
          const escapedConnectionName = connectionName.replace(/"/g, '\\"');
          
          const nmcli = this.getNmcliPath();
          
          // Check if hotspot already exists
          let hotspotExists = false;
          try {
            await execAsync(`${nmcli} -t -f NAME connection show | grep "${connectionName}"`);
            hotspotExists = true;
          } catch (err) {
            // Hotspot doesn't exist, create it
            const hotspotCommand = `sudo ${nmcli} connection add type wifi ifname wlan0 con-name "${escapedConnectionName}" autoconnect yes ssid "iPray-Hotspot" mode ap wifi-sec.key-mgmt wpa-psk wifi-sec.psk "ipray2026" ipv4.method shared`;
            await execAsync(hotspotCommand);
            hotspotExists = true;
          }
          
          if (hotspotExists) {
            // Activate hotspot
            await execAsync(`sudo ${nmcli} connection up "${escapedConnectionName}"`);
            
            return res.status(200).json({
              success: true,
              message: `WiFi connection gagal. Hotspot "iPray-Hotspot" telah diaktifkan sebagai fallback. Password: ipray2026`,
              fallback: true,
              hotspot: {
                ssid: 'iPray-Hotspot',
                password: 'ipray2026'
              }
            });
          }
        } catch (hotspotError) {
          console.error('Error enabling hotspot fallback:', hotspotError);
          // Continue to return original error
        }
        
        res.status(500).json({ error: error.message || 'Gagal configure WiFi' });
      }
    });
    
    // WiFi Hotspot - Enable hotspot mode (fallback jika WiFi gagal)
    this.app.post('/api/wifi/hotspot/enable', async (req, res) => {
      try {
        // Check if running in Raspberry Pi/Linux environment
        const isRPi = await this.isRaspberryPiEnvironment();
        if (!isRPi) {
          return res.status(400).json({ 
            error: 'Hotspot configuration hanya tersedia dalam Raspberry Pi/Linux environment',
            available: false
          });
        }
        
        const { ssid = 'iPray-Hotspot', password = 'ipray2026' } = req.body;
        
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const nmcli = this.getNmcliPath();
        
        // Check if WiFi device is available
        try {
          const { stdout: devices } = await execAsync(`${nmcli} -t -f DEVICE device status`);
          if (!devices.includes('wlan0')) {
            return res.status(400).json({ 
              error: 'WiFi device (wlan0) tidak tersedia atau telah di-unplug. Sila pastikan WiFi adapter tersambung.',
              deviceAvailable: false
            });
          }
        } catch (err) {
          return res.status(400).json({ 
            error: 'WiFi device tidak tersedia',
            deviceAvailable: false
          });
        }
        
        // Escape SSID and password
        const escapedSsid = ssid.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`').replace(/\\/g, '\\\\');
        const escapedPassword = password.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`').replace(/\\/g, '\\\\');
        
        const connectionName = 'ipray-hotspot';
        const escapedConnectionName = connectionName.replace(/"/g, '\\"');
        
        // Delete existing hotspot connection if exists
        try {
          await execAsync(`sudo ${nmcli} connection delete "${escapedConnectionName}" 2>/dev/null || true`);
        } catch (err) {
          // Ignore error
        }
        
        // Disconnect current WiFi connection
        try {
          await execAsync(`sudo ${nmcli} device disconnect wlan0 2>/dev/null || true`);
        } catch (err) {
          // Ignore error
        }
        
        // Create hotspot connection (access point mode)
        const command = `sudo ${nmcli} connection add type wifi ifname wlan0 con-name "${escapedConnectionName}" autoconnect yes ssid "${escapedSsid}" mode ap wifi-sec.key-mgmt wpa-psk wifi-sec.psk "${escapedPassword}" ipv4.method shared`;
        
        const { stdout: addStdout, stderr: addStderr } = await execAsync(command);
        
        // Remove ANSI escape codes
        const cleanAddStdout = addStdout.replace(/\x1B\[[0-9;]*[JKmsu]/g, '').trim();
        const cleanAddStderr = addStderr.replace(/\x1B\[[0-9;]*[JKmsu]/g, '').trim();
        
        // Check for errors
        if (cleanAddStderr && !cleanAddStdout.includes('successfully')) {
          console.error('Error creating hotspot:', cleanAddStderr);
          return res.status(500).json({ error: cleanAddStderr || 'Gagal create hotspot' });
        }
        
        // Activate hotspot
        const activateCommand = `sudo ${nmcli} connection up "${escapedConnectionName}"`;
        const { stdout: activateStdout, stderr: activateStderr } = await execAsync(activateCommand);
        
        // Remove ANSI escape codes
        const cleanActivateStdout = activateStdout.replace(/\x1B\[[0-9;]*[JKmsu]/g, '').trim();
        const cleanActivateStderr = activateStderr.replace(/\x1B\[[0-9;]*[JKmsu]/g, '').trim();
        
        const combinedOutput = (cleanActivateStdout + ' ' + cleanActivateStderr).toLowerCase();
        
        if (combinedOutput.includes('successfully') || combinedOutput.includes('activated')) {
          res.json({
            success: true,
            message: `Hotspot "${ssid}" telah diaktifkan`,
            ssid: ssid,
            password: password
          });
        } else {
          console.error('Error activating hotspot:', cleanActivateStderr);
          res.status(500).json({ error: cleanActivateStderr || 'Gagal activate hotspot' });
        }
      } catch (error) {
        console.error('Error enabling hotspot:', error);
        res.status(500).json({ error: error.message || 'Gagal enable hotspot' });
      }
    });
    
    // WiFi Hotspot - Disable hotspot mode
    this.app.post('/api/wifi/hotspot/disable', async (req, res) => {
      try {
        // Check if running in Raspberry Pi/Linux environment
        const isRPi = await this.isRaspberryPiEnvironment();
        if (!isRPi) {
          return res.json({
            success: true,
            message: 'Hotspot configuration hanya tersedia dalam Raspberry Pi/Linux environment',
            available: false
          });
        }
        
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const nmcli = this.getNmcliPath();
        const connectionName = 'ipray-hotspot';
        const escapedConnectionName = connectionName.replace(/"/g, '\\"');
        
        // Disconnect hotspot
        try {
          await execAsync(`sudo ${nmcli} connection down "${escapedConnectionName}" 2>/dev/null || true`);
        } catch (err) {
          // Ignore error
        }
        
        // Delete hotspot connection
        try {
          await execAsync(`sudo ${nmcli} connection delete "${escapedConnectionName}" 2>/dev/null || true`);
        } catch (err) {
          // Ignore error
        }
        
        res.json({
          success: true,
          message: 'Hotspot telah dinyahaktifkan'
        });
      } catch (error) {
        console.error('Error disabling hotspot:', error);
        res.status(500).json({ error: error.message || 'Gagal disable hotspot' });
      }
    });
    
    // WiFi Hotspot - Get hotspot status
    this.app.get('/api/wifi/hotspot/status', async (req, res) => {
      try {
        // Check if running in Raspberry Pi/Linux environment
        const isRPi = await this.isRaspberryPiEnvironment();
        if (!isRPi) {
          return res.json({
            success: true,
            status: {
              enabled: false,
              ssid: null,
              connectionName: null,
              available: false,
              message: 'Hotspot configuration hanya tersedia dalam Raspberry Pi/Linux environment'
            }
          });
        }
        
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const nmcli = this.getNmcliPath();
        let status = {
          enabled: false,
          ssid: null,
          connectionName: null,
          available: true
        };
        
        try {
          const { stdout } = await execAsync(`${nmcli} -t -f NAME,TYPE connection show | grep ipray-hotspot`);
          if (stdout.trim()) {
            const parts = stdout.trim().split(':');
            if (parts.length >= 2) {
              status.connectionName = parts[0];
              
              // Check if connection is active
              try {
                const { stdout: activeConnections } = await execAsync(`${nmcli} -t -f NAME connection show --active`);
                if (activeConnections.includes(status.connectionName)) {
                  status.enabled = true;
                  
                  // Get SSID from connection
                  try {
                    const { stdout: connInfo } = await execAsync(`${nmcli} -t -f 802-11-wireless.ssid connection show "${status.connectionName}"`);
                    const ssidMatch = connInfo.match(/802-11-wireless\.ssid:(.+)/);
                    if (ssidMatch) {
                      status.ssid = ssidMatch[1].trim();
                    }
                  } catch (err) {
                    // Ignore error
                  }
                }
              } catch (err) {
                // Ignore error
              }
            }
          }
        } catch (err) {
          // Hotspot connection doesn't exist
        }
        
        res.json({
          success: true,
          status: status
        });
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
   * System Time Management - Get current system time
   */
  async getSystemTime() {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      // Get ISO 8601 format with timezone
      const { stdout } = await execAsync('date -Iseconds');
      return { iso: stdout.trim() };
    } catch (error) {
      throw new Error(`Failed to get system time: ${error.message}`);
    }
  }

  /**
   * System Time Management - Set system time
   */
  async setSystemTime(isoLocal) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Validate format: YYYY-MM-DDTHH:MM
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(isoLocal)) {
      throw new Error('Invalid datetime format. Expected: YYYY-MM-DDTHH:MM');
    }
    
    // Convert to timedatectl format: "YYYY-MM-DD HH:MM:00"
    const formatted = isoLocal.replace('T', ' ') + ':00';
    
    try {
      // Use timedatectl to set time (requires sudo privileges)
      await execAsync(`sudo timedatectl set-time "${formatted}"`);
      
      // Get updated time
      const result = await this.getSystemTime();
      return result;
    } catch (error) {
      // If timedatectl fails, try alternative method with date command
      try {
        // Format for date command: MMDDhhmmYYYY.ss
        const parts = isoLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
        if (parts) {
          const [, year, month, day, hour, minute] = parts;
          const dateFormat = `${month}${day}${hour}${minute}${year}.00`;
          await execAsync(`sudo date ${dateFormat}`);
          
          const result = await this.getSystemTime();
          return result;
        }
        throw new Error('Invalid date format');
      } catch (altError) {
        throw new Error(`Failed to set system time: ${error.message}. Alternative method also failed: ${altError.message}`);
      }
    }
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
