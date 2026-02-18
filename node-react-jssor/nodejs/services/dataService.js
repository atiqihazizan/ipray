const fs = require('fs');
const path = require('path');

/** Default config (fallback bila config.txt kosong atau tiada) */
const DEFAULT_PRAYER_TIME_CONFIG = {
  HOLD_DURATION: 60000,
  BLINK_DURATION: 15000,
  BEEP_COUNT: 5,
  WARNING_START_SECONDS: 30,
  WARNING_BEEP_COUNT: 0,
  AZAN_DURATION_MIN: 0.5,
  IQAMAH_DURATION_MIN: 2,
  SOLAT_DURATION_MIN: 3,
};
const DEFAULT_COLOR_CONFIG = {
  DEFAULT: '#FFFF00',
  NEXT_PRAYER: '#90EE90',
  WARNING_PRAYER: '#FF0000',
};

/** Hari dalam bulan (index 0 unused, 1=Jan..12=Dec) untuk getYearDays */
const MONTH_DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Data Service
 * Menguruskan file operations (read, write) untuk data files
 */

class DataService {
  constructor(dataPath) {
    this.dataPath = dataPath;
    this.allowedFiles = ['slides', 'kuliah', 'images', 'announcements', 'takwim', 'config', 'slideshow', 'kuliah-batal'];
    this.filenameAliases = {
      announcement: 'announcements',
      announcements: 'announcements',
      image: 'images',
      images: 'images',
      penceramah: 'images',
      slide: 'slides',
      slides: 'slides',
      takwim: 'takwim',
      kuliah: 'kuliah',
      'kuliah-batal': 'kuliah-batal',
      config: 'config',
      slideshow: 'slideshow'
    };
  }

  /**
   * Normalize filename (alias + strip extension)
   */
  normalizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
      return null;
    }
    let name = filename.trim().toLowerCase();
    if (name.endsWith('.txt')) {
      name = name.slice(0, -4);
    }
    return this.filenameAliases[name] || name;
  }

  /**
   * Validate filename
   */
  isValidFilename(filename) {
    return this.allowedFiles.includes(filename);
  }

  /**
   * Get file path
   */
  getFilePath(filename) {
    return path.join(this.dataPath, `${filename}.txt`);
  }

  /**
   * Read file content
   */
  readFile(filename) {
    return new Promise((resolve, reject) => {
      const normalized = this.normalizeFilename(filename);
      if (!normalized || !this.isValidFilename(normalized)) {
        return reject(new Error('Invalid filename'));
      }

      const filePath = this.getFilePath(normalized);
      
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading file:', err);
          return reject(new Error('Failed to read file'));
        }
        resolve(data);
      });
    });
  }

  /**
   * Write file content
   */
  writeFile(filename, content) {
    return new Promise((resolve, reject) => {
      const normalized = this.normalizeFilename(filename);
      if (!normalized || !this.isValidFilename(normalized)) {
        return reject(new Error('Invalid filename'));
      }

      if (content === undefined) {
        return reject(new Error('Content is required'));
      }

      const filePath = this.getFilePath(normalized);
            
      // Write new content
      fs.writeFile(filePath, content, 'utf8', (err) => {
        if (err) {
          console.error('Error writing file:', err);
          return reject(new Error('Failed to write file'));
        }
        resolve({
          success: true,
          filename: `${normalized}.txt`
        });
      });
    });
  }

  /**
   * List all data files
   */
  listFiles() {
    return new Promise((resolve, reject) => {
      fs.readdir(this.dataPath, (err, files) => {
        if (err) {
          return reject(new Error('Failed to list files'));
        }
        const txtFiles = files.filter(f => f.endsWith('.txt'));
        resolve(txtFiles);
      });
    });
  }

  /**
   * Parse file content to array based on file type
   */
  parseFileContent(filename, content) {
    const normalized = this.normalizeFilename(filename);
    if (!normalized) {
      return [];
    }
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const parsed = [];
    
    lines.forEach((line, index) => {
      // Skip comment lines untuk semua file types
      if (line.trim().startsWith('#')) {
        return;
      }
      
      const parts = line.split('|');
      
      if (normalized === 'slides') {
        parsed.push({
          id: index + 1,
          type: parts[0] || '',
          image: parts[1] || '',
          duration: parts[2] || '',
          checkbox: parts[3] || '',
          hide: parts[4] === '1' ? '1' : '0',
          raw: line
        });
      } else if (normalized === 'kuliah') {
        parsed.push({
          id: index + 1,
          week: parts[0] || '',
          day: parts[1] || '',
          type: parts[2] || '',
          speaker: parts[3] || '',
          speakerId: parts[4] || '',
          title: parts[5] || '',
          raw: line
        });
      } else if (normalized === 'kuliah-batal') {
        // Skip empty lines
        if (!line.trim()) {
          return;
        }
        parsed.push({
          id: index + 1,
          date: parts[0] || '',
          type: parts[1] || '',
          notes: parts[2] || '',
          raw: line
        });
      } else if (normalized === 'images') {
        parsed.push({
          id: index + 1,
          imageCode: parts[0] || '',
          imagePath: parts[1] || '',
          raw: line
        });
      } else if (normalized === 'announcements') {
        parsed.push({
          id: index + 1,
          type: parts[0] || '',
          title: parts[1] || '',
          speaker: parts[2] || '',
          category: parts[3] || '',
          datetime: parts[4] || '',
          location: parts[5] || '',
          audience: parts[6] || '',
          raw: line
        });
      } else if (normalized === 'takwim') {
        // Takwim format: Skip 2 baris pertama (header)
        // Format: DD-MM-YYYY DD-MM-HHHH\tImsak\tSubuh\tSyuruk\tZohor\tAsar\tMaghrib\tIsyak
        if (index < 2) {
          // Skip 2 baris pertama (header lines)
          return;
        }
        
        // Parse dengan tab separator
        const tabParts = line.split('\t');
        if (tabParts.length >= 8) {
          // Split date dan hijri (format: DD-MM-YYYY DD-MM-HHHH)
          const dateHijri = tabParts[0].trim();
          const dateHijriParts = dateHijri.split(/\s+/);
          const date = dateHijriParts[0] || ''; // DD-MM-YYYY
          const hijri = dateHijriParts[1] || ''; // DD-MM-HHHH
          
          // Parse tarikh dari format DD-MM-YYYY
          if (date && date.trim() !== '') {
            parsed.push({
              id: parsed.length + 1, // Use parsed.length + 1 since we're skipping rows
              date: date,
              hijri: hijri,
              imsak: tabParts[1] || '',
              subuh: tabParts[2] || '',
              syuruk: tabParts[3] || '',
              zohor: tabParts[4] || '',
              asar: tabParts[5] || '',
              maghrib: tabParts[6] || '',
              isyak: tabParts[7] || '',
              raw: line
            });
          }
        }
      } else if (normalized === 'config') {
        // Config format: KEY|VALUE
        parsed.push({
          id: index + 1,
          key: parts[0] || '',
          value: parts[1] || '',
          raw: line
        });
      } else if (normalized === 'slideshow') {
        // Slideshow format: caption\timagePath (tab delimiter supaya caption boleh ada pipe)
        const tabParts = line.split('|');
        const caption = (tabParts[0] || '').trim();
        const imagePath = (tabParts[1] || '').trim();
        parsed.push({
          id: index + 1,
          caption,
          image: imagePath,
          raw: line
        });
      }
    });
    
    return parsed;
  }

  /**
   * Get column names for file type
   */
  getColumns(filename) {
    const normalized = this.normalizeFilename(filename);
    const columnMap = {
      'slides': ['type', 'image', 'duration', 'checkbox', 'hide'],
      'kuliah': ['week', 'day', 'type', 'speaker', 'speakerId', 'title'],
      'kuliah-batal': ['date', 'type', 'notes'],
      'images': ['imageCode', 'imagePath'],
      'announcements': ['type', 'title', 'speaker', 'category', 'datetime', 'location', 'audience'],
      'takwim': ['date', 'hijri', 'imsak', 'subuh', 'syuruk', 'zohor', 'asar', 'maghrib', 'isyak'],
      'config': ['key', 'value'],
      'slideshow': ['caption', 'image']
    };
    return columnMap[normalized] || [];
  }

  /**
   * Update single row
   * Find line index yang betul dengan cara yang sama seperti parseFileContent
   */
  updateRow(filename, id, rowData) {
    return new Promise(async (resolve, reject) => {
      try {
        const normalized = this.normalizeFilename(filename);
        if (!normalized || !this.isValidFilename(normalized)) {
          return reject(new Error('Invalid filename'));
        }

        const content = await this.readFile(normalized);
        const allLines = content.split('\n');
        
        // Find line index yang betul dengan cara yang sama seperti parseFileContent
        let lineIndex = null;
        let currentId = 0;
        
        if (normalized === 'takwim') {
          // Takwim: Skip 2 baris pertama (header), kemudian filter kosong
          for (let i = 2; i < allLines.length; i++) {
            const line = allLines[i];
            const tabParts = line.split('\t');
            if (tabParts.length >= 8 && line.trim() !== '') {
              currentId++;
              if (currentId === id) {
                lineIndex = i;
                break;
              }
            }
          }
        } else {
          // Other files: Filter kosong dulu, kemudian cari ID
          for (let i = 0; i < allLines.length; i++) {
            const line = allLines[i];
            if (line.trim() !== '') {
              currentId++;
              if (currentId === id) {
                lineIndex = i;
                break;
              }
            }
          }
        }
        
        if (lineIndex === null || lineIndex < 0 || lineIndex >= allLines.length) {
          return reject(new Error('Invalid row ID'));
        }
        
        // Update the line
        if (normalized === 'takwim' && rowData.raw) {
          // Reconstruct raw line dari fields jika perlu
          const rawLine = rowData.raw || `${rowData.date || ''} ${rowData.hijri || ''}\t${rowData.imsak || ''}\t${rowData.subuh || ''}\t${rowData.syuruk || ''}\t${rowData.zohor || ''}\t${rowData.asar || ''}\t${rowData.maghrib || ''}\t${rowData.isyak || ''}`;
          allLines[lineIndex] = rawLine;
        } else {
          allLines[lineIndex] = rowData.raw || rowData;
        }
        
        // Write updated content
        const result = await this.writeFile(normalized, allLines.join('\n'));
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Insert row baru
   */
  insertRow(filename, rowData, position = 'end') {
    return new Promise(async (resolve, reject) => {
      try {
        const normalized = this.normalizeFilename(filename);
        if (!normalized || !this.isValidFilename(normalized)) {
          return reject(new Error('Invalid filename'));
        }

        const content = await this.readFile(normalized);
        const lines = content.split('\n');
        
        // Determine insert position
        let insertIndex;
        if (position === 'start') {
          // For takwim, insert after header (index 2)
          insertIndex = normalized === 'takwim' ? 2 : 0;
        } else if (position === 'end') {
          insertIndex = lines.length;
        } else if (typeof position === 'number') {
          insertIndex = position;
        } else {
          return reject(new Error('Invalid position'));
        }
        
        // Insert new row
        const newRow = rowData.raw || rowData;
        lines.splice(insertIndex, 0, newRow);
        
        // Write updated content
        const result = await this.writeFile(normalized, lines.join('\n'));
        resolve({
          ...result,
          insertedAt: insertIndex
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Delete row
   * Find line index yang betul dengan cara yang sama seperti parseFileContent
   */
  deleteRow(filename, id, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const normalized = this.normalizeFilename(filename);
        if (!normalized || !this.isValidFilename(normalized)) {
          return reject(new Error('Invalid filename'));
        }

        const content = await this.readFile(normalized);
        const allLines = content.split('\n');
        
        // Find line index yang betul dengan cara yang sama seperti parseFileContent
        let lineIndex = null;
        let currentId = 0;
        let lineToDelete = null; // Simpan line untuk dapatkan image path jika slideshow
        
        if (normalized === 'takwim') {
          // Takwim: Skip 2 baris pertama (header), kemudian filter kosong
          for (let i = 2; i < allLines.length; i++) {
            const line = allLines[i];
            const tabParts = line.split('\t');
            if (tabParts.length >= 8 && line.trim() !== '') {
              currentId++;
              if (currentId === id) {
                lineIndex = i;
                lineToDelete = line;
                break;
              }
            }
          }
        } else {
          // Other files: Filter kosong dulu, kemudian cari ID
          for (let i = 0; i < allLines.length; i++) {
            const line = allLines[i];
            if (line.trim() !== '') {
              currentId++;
              if (currentId === id) {
                lineIndex = i;
                lineToDelete = line;
                break;
              }
            }
          }
        }
        
        if (lineIndex === null || lineIndex < 0 || lineIndex >= allLines.length) {
          return reject(new Error('Invalid row ID'));
        }
        
        // Jika slideshow atau images, delete image file juga
        if ((normalized === 'slideshow' || normalized === 'images') && lineToDelete && options.imagesPath) {
          try {
            // Parse line untuk dapatkan image path
            const parts = lineToDelete.split('|');
            let imagePath = null;
            
            if (normalized === 'slideshow') {
              // Slideshow format: caption|imagePath
              if (parts.length >= 2) {
                imagePath = (parts[1] || '').trim();
              }
            } else if (normalized === 'images') {
              // Images format: imageCode|imagePath
              if (parts.length >= 2) {
                imagePath = (parts[1] || '').trim();
              }
            }
            
            if (imagePath) {
              // Convert dari /images/category/filename.jpg ke relative path
              // Remove leading /images/ prefix
              let relativePath = imagePath.replace(/^\/images\//, '');
              
              // Build full path: imagesPath + relativePath
              // Example: /images/slideshow/slide01.jpg -> slideshow/slide01.jpg
              // Example: /images/penceramah/filename.jpg -> penceramah/filename.jpg
              const fullPath = path.join(options.imagesPath, relativePath);
              
              // Security check - ensure path is within imagesPath
              const normalizedFullPath = path.normalize(fullPath);
              const normalizedImagesPath = path.normalize(options.imagesPath);
              
              if (normalizedFullPath.startsWith(normalizedImagesPath) && fs.existsSync(normalizedFullPath)) {
                // Delete image file
                fs.unlinkSync(normalizedFullPath);
                console.log(`Deleted ${normalized} image: ${normalizedFullPath}`);
              } else {
                console.warn(`${normalized} image file not found or path invalid: ${normalizedFullPath}`);
              }
            }
          } catch (imageError) {
            // Log error tapi jangan fail delete row jika image delete gagal
            console.warn(`Failed to delete ${normalized} image file:`, imageError);
          }
        }
        
        // Remove the line
        allLines.splice(lineIndex, 1);
        
        // Write updated content
        const result = await this.writeFile(normalized, allLines.join('\n'));
        resolve({
          ...result,
          deletedId: id
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert "HH:MM" to integer HHMM (untuk wdata format)
   */
  timeToValue(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 100 + m;
  }

  /**
   * Hari dalam tahun (1-365) dan daysm sejak epoch
   */
  getYearDays(year, month, day) {
    let days = day;
    for (let i = 1; i < month; i++) {
      days += MONTH_DAYS[i];
    }
    let daysm = days;
    const yy = year % 100;
    if (yy > 0) {
      const leapYears = Math.floor((yy - 1) / 4) + 1;
      daysm += (yy * 365) + leapYears;
    }
    return [days, daysm];
  }

  /**
   * Parse announcements content -> array of non-empty trimmed lines
   */
  parseAnnouncements(content) {
    if (!content || typeof content !== 'string') return [];
    return content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  }

  /**
   * Parse kuliah content -> array of non-empty trimmed lines
   */
  parseKuliah(content) {
    if (!content || typeof content !== 'string') return [];
    return content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  }

  /**
   * Parse images content -> object { code: path }
   */
  parseImages(content) {
    const map = {};
    if (!content || typeof content !== 'string') return map;
    content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0).forEach(line => {
      const [code, pathVal] = line.split('|');
      if (code && pathVal) map[code.trim()] = pathVal.trim();
    });
    return map;
  }

  /**
   * Parse slideshow content: caption\timagePath per baris -> array of { caption, image }
   */
  parseSlideshow(content) {
    if (!content || typeof content !== 'string') return [];
    return content.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // const tabParts = line.split('\t');
        const tabParts = line.split('|');
        const caption = (tabParts[0] || '').trim();
        let imagePath = (tabParts[1] || '').trim();
        if (imagePath && !imagePath.startsWith('/')) imagePath = `/${imagePath}`;
        return { caption, image: imagePath };
      });
  }

  /**
   * Parse slides config: slideType|imagePath|duration|datetime1,datetime2 -> { [slideType]: { image, duration, datetime[] } }
   */
  parseSlidesConfig(content) {
    const parsed = {};
    if (!content || typeof content !== 'string') return parsed;
    content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0).forEach(line => {
      const p = line.split('|');
      const slideType = p[0];
      const imagePath = p[1];
      const duration = p[2];
      const datetimeStr = p[3];
      const hide = p[4] === '1';
      if (slideType) {
        parsed[slideType] = {
          image: imagePath || '',
          duration: duration ? parseInt(duration, 10) : null,
          datetime: datetimeStr ? datetimeStr.split(',').map(s => s.trim()).filter(s => s) : [],
          hide
        };
      }
    });
    return parsed;
  }

  /**
   * Toggle hide/show untuk satu baris slide. Hanya untuk filename 'slides'.
   * @param {string} filename - 'slides'
   * @param {number} id - Row ID (1-based)
   * @returns {Promise<{ success: boolean, hide: boolean }>} - hide true = disembunyikan
   */
  toggleSlideHide(filename, id) {
    return new Promise(async (resolve, reject) => {
      try {
        const normalized = this.normalizeFilename(filename);
        if (normalized !== 'slides' || !this.isValidFilename(normalized)) {
          return reject(new Error('Invalid filename; toggleSlideHide only supports slides'));
        }
        const content = await this.readFile(normalized);
        const allLines = content.split('\n');
        let lineIndex = null;
        let currentId = 0;
        for (let i = 0; i < allLines.length; i++) {
          const line = allLines[i];
          if (line.trim() !== '' && !line.trim().startsWith('#')) {
            currentId++;
            if (currentId === id) {
              lineIndex = i;
              break;
            }
          }
        }
        if (lineIndex === null || lineIndex < 0 || lineIndex >= allLines.length) {
          return reject(new Error('Invalid row ID'));
        }
        const parts = allLines[lineIndex].split('|');
        while (parts.length < 5) parts.push('0');
        const wasHidden = parts[4] === '1';
        parts[4] = wasHidden ? '0' : '1';
        allLines[lineIndex] = parts.join('|');
        await this.writeFile(normalized, allLines.join('\n'));
        resolve({ success: true, hide: !wasHidden });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Parse config content (key|value) -> { PRAYER_TIME_CONFIG, COLOR_CONFIG, DATETIME_CONFIG }
   */
  parseConfig(content) {
    const parsed = {
      PRAYER_TIME_CONFIG: { ...DEFAULT_PRAYER_TIME_CONFIG },
      COLOR_CONFIG: { ...DEFAULT_COLOR_CONFIG },
      DATETIME_CONFIG: {
        MANUAL_OFFSET_MS: 0,
        NTP_ENABLED: true,
        NTP_SERVER: 'pool.ntp.org',
        NTP_SYNC_INTERVAL_MS: 3600000
      }
    };
    if (!content || typeof content !== 'string' || !content.trim()) return parsed;
    content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0).forEach(line => {
      const parts = line.split('|').map(s => s.trim());
      const key = parts[0];
      const value = parts[1];
      if (!key || !value) return;
      if (key === 'HOLD_DURATION') parsed.PRAYER_TIME_CONFIG.HOLD_DURATION = parseInt(value, 10);
      else if (key === 'BLINK_DURATION') parsed.PRAYER_TIME_CONFIG.BLINK_DURATION = parseInt(value, 10);
      else if (key === 'BEEP_COUNT') parsed.PRAYER_TIME_CONFIG.BEEP_COUNT = parseInt(value, 10);
      else if (key === 'WARNING_START_SECONDS') parsed.PRAYER_TIME_CONFIG.WARNING_START_SECONDS = parseInt(value, 10);
      else if (key === 'WARNING_BEEP_COUNT') parsed.PRAYER_TIME_CONFIG.WARNING_BEEP_COUNT = parseInt(value, 10);
      else if (key === 'AZAN_DURATION_MIN') parsed.PRAYER_TIME_CONFIG.AZAN_DURATION_MIN = parseFloat(value) || 0.5;
      else if (key === 'IQAMAH_DURATION_MIN') parsed.PRAYER_TIME_CONFIG.IQAMAH_DURATION_MIN = parseFloat(value) || 2;
      else if (key === 'SOLAT_DURATION_MIN') parsed.PRAYER_TIME_CONFIG.SOLAT_DURATION_MIN = parseInt(value, 10);
      else if (key === 'COLOR_DEFAULT') parsed.COLOR_CONFIG.DEFAULT = value;
      else if (key === 'COLOR_NEXT_PRAYER') parsed.COLOR_CONFIG.NEXT_PRAYER = value;
      else if (key === 'COLOR_WARNING_PRAYER') parsed.COLOR_CONFIG.WARNING_PRAYER = value;
      else if (key === 'DATETIME_MANUAL_OFFSET_MS') parsed.DATETIME_CONFIG.MANUAL_OFFSET_MS = parseInt(value, 10) || 0;
      else if (key === 'DATETIME_NTP_ENABLED') parsed.DATETIME_CONFIG.NTP_ENABLED = value.toLowerCase() === 'true';
      else if (key === 'DATETIME_NTP_SERVER') parsed.DATETIME_CONFIG.NTP_SERVER = value;
      else if (key === 'DATETIME_NTP_SYNC_INTERVAL_MS') parsed.DATETIME_CONFIG.NTP_SYNC_INTERVAL_MS = parseInt(value, 10) || 3600000;
    });
    return parsed;
  }

  /**
   * Build takwim for app: single day (dd-mm = today), format { takwimArray, takwimParsed }.
   * takwimParsed.wdata is indexed by day-of-year (days) so getCurrentIslamicTime(wdata[days]) works.
   */
  getTakwimForApp(content) {
    if (!content || typeof content !== 'string') {
      return { takwimArray: [], takwimParsed: { zone: '', hdata: [24], wdata: [null] } };
    }
    const lines = content.split(/\r?\n/);
    const zone = lines[0] || '';
    const hijriLine = lines[1] || '';
    const hijriData = (hijriLine.split('=')[1] || '').trim();
    const hdata = [24];
    for (let i = 0; i < hijriData.length; i += 2) {
      const byte = parseInt(hijriData.substr(i, 2), 16);
      if (!isNaN(byte)) hdata.push(byte);
    }
    const todayRow = this.getTodayTakwim(content);
    if (!todayRow) {
      return { takwimArray: [], takwimParsed: { zone, hdata, wdata: [null] } };
    }
    const todayTimes = [
      this.timeToValue(todayRow.imsak),
      this.timeToValue(todayRow.subuh),
      this.timeToValue(todayRow.syuruk),
      this.timeToValue(todayRow.zohor),
      this.timeToValue(todayRow.asar),
      this.timeToValue(todayRow.maghrib),
      this.timeToValue(todayRow.isyak),
      todayRow.date
    ];
    const dateParts = todayRow.date.split('-');
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const year = parseInt(dateParts[2], 10);
    const [days] = this.getYearDays(year, month, day);
    const wdataLength = days + 2;
    const wdata = new Array(wdataLength).fill(null);
    wdata[0] = null;
    wdata[days] = todayTimes;
    wdata[days + 1] = todayTimes;
    const takwimParsed = { zone, hdata, wdata };
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const takwimArray = [{
      date: dateStr,
      Subuh: todayRow.subuh,
      Syuruk: todayRow.syuruk,
      Zohor: todayRow.zohor,
      Asar: todayRow.asar,
      Maghrib: todayRow.maghrib,
      Isyak: todayRow.isyak
    }];
    return { takwimArray, takwimParsed };
  }

  /**
   * Build takwim for app: ALL days dari file (tiada filter tarikh).
   * Format output sama seperti getTakwimForApp: { takwimArray, takwimParsed }.
   * Digunakan bila app perlukan data penuh supaya getCurrentIslamicTime/wdata sentiasa ada untuk hari ini.
   */
  getTakwimForAppFull(content) {
    if (!content || typeof content !== 'string') {
      return { takwimArray: [], takwimParsed: { zone: '', hdata: [24], wdata: [null] } };
    }
    const lines = content.split(/\r?\n/);
    const zone = lines[0] || '';
    const hijriLine = lines[1] || '';
    const hijriData = (hijriLine.split('=')[1] || '').trim();
    const hdata = [24];
    for (let i = 0; i < hijriData.length; i += 2) {
      const byte = parseInt(hijriData.substr(i, 2), 16);
      if (!isNaN(byte)) hdata.push(byte);
    }
    // wdata: index 0 unused, index 1..366 = hari dalam tahun
    const wdata = new Array(367).fill(null);
    wdata[0] = null;
    const takwimArray = [];
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const tabParts = line.split('\t');
      if (tabParts.length < 8) continue;
      const dateHijri = tabParts[0].trim();
      const dateHijriParts = dateHijri.split(/\s+/);
      const date = dateHijriParts[0] || '';
      if (!date || !date.includes('-')) continue;
      const dateParts = date.split('-');
      if (dateParts.length !== 3) continue;
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10);
      const year = parseInt(dateParts[2], 10);
      if (isNaN(day) || isNaN(month) || isNaN(year)) continue;
      const [days] = this.getYearDays(year, month, day);
      if (days < 1 || days > 366) continue;
      const todayTimes = [
        this.timeToValue(tabParts[1] || ''),
        this.timeToValue(tabParts[2] || ''),
        this.timeToValue(tabParts[3] || ''),
        this.timeToValue(tabParts[4] || ''),
        this.timeToValue(tabParts[5] || ''),
        this.timeToValue(tabParts[6] || ''),
        this.timeToValue(tabParts[7] || ''),
        date
      ];
      wdata[days] = todayTimes;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      takwimArray.push({
        date: dateStr,
        Subuh: (tabParts[2] || '').trim(),
        Syuruk: (tabParts[3] || '').trim(),
        Zohor: (tabParts[4] || '').trim(),
        Asar: (tabParts[5] || '').trim(),
        Maghrib: (tabParts[6] || '').trim(),
        Isyak: (tabParts[7] || '').trim()
      });
    }
    const takwimParsed = { zone, hdata, wdata };
    return { takwimArray, takwimParsed };
  }

  /**
   * Get today's takwim data only
   * Returns single row for today's date (filter by day and month only, ignore year)
   */
  getTodayTakwim(content) {
    const today = new Date();
    const todayDay = String(today.getDate()).padStart(2, '0');
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    
    const lines = content.split('\n');
    
    // Skip 2 baris pertama (header)
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const tabParts = line.split('\t');
      if (tabParts.length >= 8) {
        const dateHijri = tabParts[0].trim();
        const dateHijriParts = dateHijri.split(/\s+/);
        const date = dateHijriParts[0] || ''; // DD-MM-YYYY
        
        // Parse date untuk dapatkan day dan month sahaja
        if (date && date.includes('-')) {
          const dateParts = date.split('-');
          if (dateParts.length === 3) {
            const day = dateParts[0];
            const month = dateParts[1];
            
            // Compare day dan month sahaja (tanpa tahun)
            if (day === todayDay && month === todayMonth) {
              const hijri = dateHijriParts[1] || ''; // DD-MM-HHHH
              return {
                date: date,
                hijri: hijri,
                imsak: tabParts[1] || '',
                subuh: tabParts[2] || '',
                syuruk: tabParts[3] || '',
                zohor: tabParts[4] || '',
                asar: tabParts[5] || '',
                maghrib: tabParts[6] || '',
                isyak: tabParts[7] || '',
                raw: line,
                lineIndex: i
              };
            }
          }
        }
      }
    }
    
    return null;
  }
}

module.exports = DataService;
