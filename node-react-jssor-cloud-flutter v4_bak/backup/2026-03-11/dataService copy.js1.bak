const fs = require('fs');
const path = require('path');
const { sendAck, deleteFile, uploadFile } = require('./cloudClient');

/** Default config (fallback bila config.txt kosong atau tiada) */
const DEFAULT_PRAYER_TIME_CONFIG = {
  BEEP_COUNT: 5,
  WARNING_START_MINUTES: 5,
  IQAMAH_DURATION_MIN: 10,
  SOLAT_DURATION_MIN: 10,
};
const DEFAULT_COLOR_CONFIG = {
  CURRENT_TIME: '#FFFF00',
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
    this.allowedFiles = ['slides', 'kuliah', 'images', 'announcements', 'countdowns', 'takwim', 'config', 'slideshow', 'kuliah-override', 'hebahan', 'livestream', 'penceramah', 'petugas', 'jadual-petugas'];
    this.filenameAliases = {
      announcement: 'announcements',
      announcements: 'announcements',
      countdown: 'countdowns',
      countdowns: 'countdowns',
      image: 'images',
      images: 'images',
      slide: 'slides',
      slides: 'slides',
      takwim: 'takwim',
      kuliah: 'kuliah',
      'kuliah-override': 'kuliah-override',
      'kuliah-batal': 'kuliah-override',
      config: 'config',
      slideshow: 'slideshow',
      hebahan: 'hebahan',
      livestream: 'livestream',
      penceramah: 'penceramah',
      petugas: 'petugas',
      'jadual-petugas': 'jadual-petugas'
    };
  }

  /**
   * Simpan image upload ke imagesPath/<category>/<filename>
   * Return path untuk digunakan oleh UI (contoh: /images/penceramah/a.png)
   */
  async saveUploadedImage({ buffer, originalName, category, imagesPath }) {
    if (!imagesPath) {
      throw new Error('imagesPath not configured');
    }
    if (!category) {
      category = 'penceramah';
    }
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error('Empty upload buffer');
    }
    if (!originalName) {
      throw new Error('Missing original filename');
    }

    const sanitizedName = String(originalName).replace(/[^a-zA-Z0-9.-]/g, '_');
    const destDir = path.join(imagesPath, category);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const actualPath = path.join(destDir, sanitizedName);
    fs.writeFileSync(actualPath, buffer);

    // Verify file size > 0
    const stats = fs.statSync(actualPath);
    if (!stats || stats.size === 0) {
      try { fs.unlinkSync(actualPath); } catch (e) {}
      throw new Error('Fail kosong. Upload mungkin gagal.');
    }

    const imagePath = `/images/${category}/${sanitizedName}`;
    const folder = `/images/${category}`;

    // Sync ke cloud (fire-and-forget) – ikut implementasi asal di apiServerService
    (async () => {
      try {
        const cloudResult = await uploadFile(actualPath, folder);
        await sendAck(sanitizedName, 'uploaded');
      } catch (cloudError) {
        // eslint-disable-next-line no-console
        console.error('[CloudSync] Gagal sync image ke cloud:', cloudError.message || cloudError);
      }
    })();

    return {
      success: true,
      path: imagePath,
      filename: sanitizedName,
      category,
      actualPath
    };
  }

  /**
   * Sync fail .txt ke cloud (upload penuh setiap kali diubah)
   * normalized = nama fail tanpa extension (.txt)
   */
  async syncTextFileToCloud(normalized) {
    try {
      if (!normalized || typeof normalized !== 'string') return;
      const filePath = this.getFilePath(normalized);
      const folder = 'data';
      const fileName = `${normalized}.txt`;

      await uploadFile(filePath, folder);
      await sendAck(fileName, 'uploaded');
    } catch (cloudError) {
      // eslint-disable-next-line no-console
      console.error('[CloudSync] Gagal sync txt ke cloud:', cloudError.message || cloudError);
    }
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
        // Sync ke cloud secara async (fire-and-forget)
        (async () => {
          try {
            await this.syncTextFileToCloud(normalized);
          } catch (syncError) {
            // eslint-disable-next-line no-console
            console.error('[CloudSync] Gagal trigger sync txt ke cloud:', syncError.message || syncError);
          }
        })();

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
        const isOldFormat = parts.length >= 6;
        const slug = (parts[3] || '').trim();
        parsed.push({
          id: index + 1,
          week: parts[0] || '',
          day: parts[1] || '',
          type: parts[2] || '',
          speaker: isOldFormat ? (parts[3] || '') : slug,
          speakerId: isOldFormat ? (parts[4] || '') : slug,
          title: isOldFormat ? (parts[5] || '') : (parts[4] || ''),
          raw: line
        });
      } else if (normalized === 'kuliah-override') {
        if (!line.trim()) return;
        const first = (parts[0] || '').trim();
        if (first.toLowerCase() === 'hijri' && parts.length >= 6) {
          parsed.push({
            id: index + 1,
            format: 'hijri',
            date: '',
            tahun: (parts[1] || '').trim(),
            bulan: (parts[2] || '').trim(),
            hari: (parts[3] || '').trim(),
            type: (parts[4] || '').trim(),
            replace: (parts[5] || '').trim(),
            notes: (parts[6] || '').trim(),
            showAnnounce: parts.length >= 8 ? (parts[7] || '').trim() : '',
            title: (parts[8] || '').trim(),
            tempat: (parts[9] || '').trim(),
            jemputan: (parts[10] || '').trim(),
            raw: line
          });
          return;
        }
        const isLegacy = /^\d{2}-\d{2}-\d{4}$/.test(first);
        if (isLegacy) {
          parsed.push({
            id: index + 1,
            format: 'single',
            date: parts[0] || '',
            type: parts[1] || '',
            notes: parts[2] || '',
            tahun: '',
            bulan: '',
            hari: '',
            replace: '',
            raw: line
          });
        } else {
          let tahun = '';
          let bulan = '';
          let type = '';
          let hari = '';
          let replace = '';
          let notes = '';
          if (parts.length === 4) {
            bulan = parts[0] || '';
            type = parts[1] || '';
            hari = parts[2] || '';
            notes = parts[3] || '';
          } else if (parts.length === 5) {
            if (/^\d{4}$/.test((parts[0] || '').trim())) {
              tahun = parts[0] || '';
              bulan = parts[1] || '';
              type = parts[2] || '';
              hari = parts[3] || '';
              notes = parts[4] || '';
            } else {
              bulan = parts[0] || '';
              type = parts[1] || '';
              hari = parts[2] || '';
              replace = parts[3] || '';
              notes = parts[4] || '';
            }
          } else if (parts.length >= 6) {
            tahun = parts[0] || '';
            bulan = parts[1] || '';
            type = parts[2] || '';
            hari = parts[3] || '';
            replace = parts[4] || '';
            notes = parts[5] || '';
          }
          parsed.push({
            id: index + 1,
            format: 'range',
            date: '',
            tahun,
            bulan,
            type,
            hari,
            replace,
            notes,
            raw: line
          });
        }
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
      } else if (normalized === 'countdowns') {
        // COUNTDOWN|date|event|windowDays | COUNTDOWN_MASIHI|bulan|hari|event|windowDays | COUNTDOWN_HIJRI|tahun|bulan|hari|event|windowDays
        const typeRaw = (parts[0] || '').trim().toUpperCase();
        if (typeRaw === 'COUNTDOWN_HIJRI' && parts.length >= 5) {
          parsed.push({
            id: parsed.length + 1,
            format: 'hijri',
            date: '',
            tahun: (parts[1] || '').trim(),
            bulan: (parts[2] || '').trim(),
            hari: (parts[3] || '').trim(),
            event: (parts[4] || '').trim(),
            windowDays: (parts[5] || '').trim(),
            raw: line
          });
        } else if (typeRaw === 'COUNTDOWN_MASIHI' && parts.length >= 4) {
          parsed.push({
            id: parsed.length + 1,
            format: 'masihi',
            date: '',
            tahun: '',
            bulan: (parts[1] || '').trim(),
            hari: (parts[2] || '').trim(),
            event: (parts[3] || '').trim(),
            windowDays: (parts[4] || '').trim(),
            raw: line
          });
        } else {
          parsed.push({
            id: parsed.length + 1,
            format: 'date',
            date: (parts[1] || '').trim(),
            tahun: '',
            bulan: '',
            hari: '',
            event: (parts[2] || '').trim(),
            windowDays: (parts[3] || '').trim(),
            raw: line
          });
        }
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
        // Slideshow format: caption|image|validFrom|validTo (validFrom/validTo optional, YYYY-MM-DD; empty = always show)
        const tabParts = line.split('|');
        const caption = (tabParts[0] || '').trim();
        const imagePath = (tabParts[1] || '').trim();
        const validFrom = (tabParts[2] || '').trim();
        const validTo = (tabParts[3] || '').trim();
        parsed.push({
          id: index + 1,
          caption,
          image: imagePath,
          validFrom,
          validTo,
          raw: line
        });
      } else if (normalized === 'hebahan') {
        // Hebahan format: TEKS_MESEJ|TARIKH_MULA|TARIKH_AKHIR
        parsed.push({
          id: index + 1,
          text: parts[0] || '',
          startDate: parts[1] || '',
          endDate: parts[2] || '',
          raw: line
        });
      } else if (normalized === 'livestream') {
        // Livestream format: tajuk|url|jenis
        parsed.push({
          id: index + 1,
          tajuk: parts[0] || '',
          url: parts[1] || '',
          jenis: parts[2] || '',
          raw: line
        });
      } else if (normalized === 'penceramah') {
        // Format: kod(slug)|nama_penuh|shortname|kitab (4 lajur, tiada imageCode)
        const kod = parts[0] || '';
        const namaPenuh = parts[1] || '';
        const shortname = parts[2] || '';
        const kitab = parts.length >= 5 ? (parts[4] || '') : (parts[3] || ''); // 4 lajur baru; 5 lajur lama
        parsed.push({
          id: index + 1,
          kod,
          namaPenuh,
          shortname,
          kitab,
          raw: line
        });
      } else if (normalized === 'petugas') {
        // Petugas format: kod|nama_penuh|shortname|role|imageCode
        parsed.push({
          id: index + 1,
          kod: parts[0] || '',
          namaPenuh: parts[1] || '',
          shortname: parts[2] || '',
          role: parts[3] || '',
          imageCode: parts[4] || '',
          raw: line
        });
      } else if (normalized === 'jadual-petugas') {
        // Jadual petugas format: week|day|role|officerCode
        parsed.push({
          id: index + 1,
          week: parts[0] || '',
          day: parts[1] || '',
          role: parts[2] || '',
          officerCode: parts[3] || '',
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
      'kuliah-override': ['format', 'date', 'tahun', 'bulan', 'type', 'hari', 'replace', 'notes', 'showAnnounce', 'title', 'tempat', 'jemputan'],
      'images': ['imageCode', 'imagePath'],
      'announcements': ['type', 'title', 'speaker', 'category', 'datetime', 'location', 'audience'],
      'countdowns': ['format', 'date', 'tahun', 'bulan', 'hari', 'event', 'windowDays'],
      'takwim': ['date', 'hijri', 'imsak', 'subuh', 'syuruk', 'zohor', 'asar', 'maghrib', 'isyak'],
      'config': ['key', 'value'],
      'slideshow': ['caption', 'image', 'validFrom', 'validTo'],
      'hebahan': ['text', 'startDate', 'endDate'],
      'livestream': ['tajuk', 'url', 'jenis'],
      'penceramah': ['kod', 'namaPenuh', 'shortname', 'kitab'],
      'petugas': ['kod', 'namaPenuh', 'shortname', 'role', 'imageCode'],
      'jadual-petugas': ['week', 'day', 'role', 'officerCode']
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
          // Other files: Filter kosong dan comment (#) dulu, kemudian cari ID (countdowns guna #)
          const skipComment = normalized === 'countdowns';
          for (let i = 0; i < allLines.length; i++) {
            const line = allLines[i];
            const trimmed = line.trim();
            if (trimmed !== '' && (!skipComment || !trimmed.startsWith('#'))) {
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
          // Other files: Filter kosong dan comment (#) dulu (countdowns guna #)
          const skipComment = normalized === 'countdowns';
          for (let i = 0; i < allLines.length; i++) {
            const line = allLines[i];
            const trimmed = line.trim();
            if (trimmed !== '' && (!skipComment || !trimmed.startsWith('#'))) {
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

        // Penceramah: cascade delete (images + kuliah) sebelum buang rekod penceramah
        if (normalized === 'penceramah' && lineToDelete) {
          const slug = ((lineToDelete.split('|')[0]) || '').trim();
          if (slug) {
            // 1) Buang rekod images.txt yang match slug, dan padam fail image jika ada
            try {
              const imagesContent = await this.readFile('images').catch(() => '');
              const imagesLines = imagesContent.split('\n');
              const keptImagesLines = [];
              for (const imgLine of imagesLines) {
                const trimmed = (imgLine || '').trim();
                if (!trimmed) {
                  keptImagesLines.push(imgLine);
                  continue;
                }
                if (trimmed.startsWith('#')) {
                  keptImagesLines.push(imgLine);
                  continue;
                }
                const parts = imgLine.split('|');
                const imageCode = (parts[0] || '').trim();
                const imagePath = (parts[1] || '').trim();
                if (imageCode && imageCode === slug) {
                  // Padam fail gambar jika ada (ikut logik delete row images)
                  if (imagePath && options.imagesPath) {
                    try {
                      const relativePath = imagePath.replace(/^\/images\//, '');
                      const fullPath = path.join(options.imagesPath, relativePath);
                      const normalizedFullPath = path.normalize(fullPath);
                      const normalizedImagesPath = path.normalize(options.imagesPath);
                      if (normalizedFullPath.startsWith(normalizedImagesPath) && fs.existsSync(normalizedFullPath)) {
                        fs.unlinkSync(normalizedFullPath);
                        (async () => {
                          try {
                            const fileNameOnly = imagePath.split('/').filter(Boolean).pop();
                            await deleteFile(imagePath);
                            await sendAck(fileNameOnly, 'deleted');
                          } catch (cloudError) {
                            console.error('[CloudSync] Gagal sync image ke cloud:', cloudError.message || cloudError);
                          }
                        })();
                      }
                    } catch (imageError) {
                      console.warn('Failed to delete penceramah image file during cascade:', imageError);
                    }
                  }
                  // Skip (buang baris ini)
                  continue;
                }
                keptImagesLines.push(imgLine);
              }
              await this.writeFile('images', keptImagesLines.join('\n'));
            } catch (e) {
              return reject(e);
            }

            // 2) Buang rekod kuliah.txt yang match slug (lajur ke-4)
            try {
              const kuliahContent = await this.readFile('kuliah').catch(() => '');
              const kuliahLines = kuliahContent.split('\n');
              const keptKuliahLines = [];
              for (const kLine of kuliahLines) {
                const trimmed = (kLine || '').trim();
                if (!trimmed) {
                  keptKuliahLines.push(kLine);
                  continue;
                }
                if (trimmed.startsWith('#')) {
                  keptKuliahLines.push(kLine);
                  continue;
                }
                const parts = kLine.split('|');
                const kuliahSlug = (parts[3] || '').trim();
                if (kuliahSlug && kuliahSlug === slug) {
                  continue; // buang baris kuliah yang guna slug ini
                }
                keptKuliahLines.push(kLine);
              }
              await this.writeFile('kuliah', keptKuliahLines.join('\n'));
            } catch (e) {
              return reject(e);
            }
          }
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
    
                // Sync ke cloud
                (async () => {
                  try {
                    const fileNameOnly = imagePath.split('/').filter(Boolean).pop();
                    const cloudResult = await deleteFile(imagePath);
                    await sendAck(fileNameOnly, 'deleted');
                  } catch (cloudError) {
                    console.error('[CloudSync] Gagal sync image ke cloud:', cloudError.message || cloudError);
                  }
                })();

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

  /** HHMM integer -> minit sejak tengah malam (formula sama seperti frontend islamicTimeUtils) */
  timeToMinutes(hhmm) {
    const h = Math.floor(Number(hhmm) / 100);
    const m = Number(hhmm) % 100;
    return h * 60 + m;
  }

  /**
   * Kira tarikh Hijri dari tarikh Masehi (formula sama seperti frontend islamicTimeUtils.calculateHijri)
   * @param {Object} params - { hdata, daysm, maghrib = 0, currentMinutes = 0 }
   * @returns {Object} { day, month, year, monthName }
   */
  calculateHijri({ hdata, daysm, maghrib = 0, currentMinutes = 0 }) {
    const HIJRI_MONTHS = [
      'HIJRAH', 'MUHARRAM', 'SAFAR', 'RAB.AWAL', 'RAB.AKHIR',
      'JAM.AWAL', 'JAM.AKHIR', 'REJAB', 'SYA`BAN', 'RAMADHAN',
      'SYAWAL', 'ZULKAEDAH', 'ZULHIJJAH'
    ];
    let DayH = 25;
    let MonH = 9;
    let YearH = 1420;
    let DaysH = daysm;
    if (maghrib <= currentMinutes && currentMinutes < 1440) {
      DaysH++;
    }
    let SetF = 31 - DayH;
    let DatP = 1;
    let BitP = 0;
    let SetS = hdata[DatP] != null ? hdata[DatP] : 0;
    while (DaysH > 0) {
      if (SetS & 0x01) SetF++;
      if (DaysH > SetF) {
        DayH = 0;
        DaysH -= SetF;
        MonH++;
        if (MonH === 13) {
          MonH = 1;
          YearH++;
        }
        SetS = SetS >> 1;
        SetF = 29;
        BitP++;
        if (BitP === 8) {
          DatP++;
          BitP = 0;
          SetS = hdata[DatP] != null ? hdata[DatP] : 0;
        }
      } else {
        DayH += DaysH;
        DaysH = 0;
      }
    }
    return {
      day: DayH,
      month: MonH,
      year: YearH,
      monthName: HIJRI_MONTHS[MonH] || ''
    };
  }

  /**
   * Dapatkan tarikh Hijri untuk satu tarikh Gregorian menggunakan data takwim (formula sama frontend)
   * @param {string} takwimContent - Kandungan takwim.txt (untuk hdata + waktu Maghrib)
   * @param {Date} date - Tarikh Gregorian
   * @param {number} [currentMinutes] - Minit sejak tengah malam (jika tidak beri, guna 12:00); selepas Maghrib = hari Hijri berikut
   * @returns {Object|null} { day, month, year, monthName } atau null jika takwim tidak cukup
   */
  getHijriForDate(takwimContent, date, currentMinutes) {
    if (!takwimContent || typeof takwimContent !== 'string') return null;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const lines = takwimContent.split(/\r?\n/);
    const hijriLine = lines[1] || '';
    const hijriData = (hijriLine.split('=')[1] || '').trim();
    const hdata = [24];
    for (let i = 0; i < hijriData.length; i += 2) {
      const byte = parseInt(hijriData.substr(i, 2), 16);
      if (!isNaN(byte)) hdata.push(byte);
    }
    const [, daysm] = this.getYearDays(year, month, day);
    let maghribMinutes = 0;
    for (let i = 2; i < lines.length; i++) {
      const tabParts = lines[i].trim().split('\t');
      if (tabParts.length < 8) continue;
      const dateParts = (tabParts[0].split(/\s+/)[0] || '').split('-');
      if (dateParts.length !== 3) continue;
      const d = parseInt(dateParts[0], 10);
      const m = parseInt(dateParts[1], 10);
      const y = parseInt(dateParts[2], 10);
      if (d === day && m === month && y === year) {
        const maghribStr = (tabParts[6] || '').trim();
        maghribMinutes = this.timeToMinutes(this.timeToValue(maghribStr));
        break;
      }
    }
    const mins = currentMinutes != null ? currentMinutes : 12 * 60;
    return this.calculateHijri({ hdata, daysm, maghrib: maghribMinutes, currentMinutes: mins });
  }

  /**
   * Cari tarikh Gregorian seterusnya yang bersamaan dengan tarikh Hijri (bulan, hari).
   * Guna untuk countdown berulang tahun (contoh: 1 Syawal). Gelung dari fromDate sehingga ~400 hari.
   * @param {string} takwimContent - Kandungan takwim (untuk getHijriForDate)
   * @param {number} hijriMonth - Bulan Hijri (1-12, 10 = Syawal)
   * @param {number} hijriDay - Hari dalam bulan
   * @param {Date} [fromDate] - Mula cari dari tarikh ini (default: hari ini)
   * @returns {string|null} YYYY-MM-DD atau null jika tidak jumpa
   */
  getNextGregorianForHijriDate(takwimContent, hijriMonth, hijriDay, fromDate) {
    if (!takwimContent || hijriMonth < 1 || hijriMonth > 12 || hijriDay < 1 || hijriDay > 30) return null;
    const start = fromDate ? new Date(fromDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const currentMinutes = 12 * 60;
    for (let offset = 0; offset < 400; offset++) {
      const d = new Date(start);
      d.setDate(d.getDate() + offset);
      const hijri = this.getHijriForDate(takwimContent, d, currentMinutes);
      if (hijri && hijri.month === hijriMonth && hijri.day === hijriDay) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
    return null;
  }

  /**
   * Tarikh Gregorian seterusnya untuk bulan/hari Masihi (ulang setiap tahun).
   * Contoh: bulan 8, hari 31 = 31 Ogos tahun ini atau tahun depan jika sudah berlalu.
   * @param {number} month - Bulan 1-12
   * @param {number} day - Hari 1-31
   * @param {Date} [fromDate] - Mula cari dari tarikh ini
   * @returns {string|null} YYYY-MM-DD
   */
  getNextGregorianForMonthDay(month, day, fromDate) {
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const start = fromDate ? new Date(fromDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const thisYear = start.getFullYear();
    const lastDayOfMonth = new Date(thisYear, month, 0).getDate();
    if (day > lastDayOfMonth) return null;
    let d = new Date(thisYear, month - 1, day);
    if (d < start) d = new Date(thisYear + 1, month - 1, day);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  }

  /**
   * Kira baki hari dan teks countdown (kiraan tengah malam / hari kalendar).
   * @param {string} dateTimeRaw - Format "YYYY-MM-DD HH:mm" atau "YYYY-MM-DD"
   * @param {Date} fromDate - Tarikh rujukan (biasanya hari ini di server)
   * @returns {{ daysRemaining: number, countdownText: string }}
   */
  getCountdownFromDate(dateTimeRaw, fromDate) {
    if (!dateTimeRaw || typeof dateTimeRaw !== 'string') {
      return { daysRemaining: -1, countdownText: 'LEWAT' };
    }
    const s = dateTimeRaw.trim();
    const datePart = s.includes(' ') ? s.split(' ')[0] : s;
    const timePart = s.includes(' ') ? s.split(' ')[1] : '00:00';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return { daysRemaining: -1, countdownText: 'LEWAT' };
    }
    const [y, m, d] = datePart.split('-').map(Number);
    const [h, min] = (timePart.split('-')[0] || '00:00').split(':').map((x) => parseInt(x, 10) || 0);
    const targetDate = new Date(y, m - 1, d, h, min, 0, 0);
    const startOfToday = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 0, 0, 0, 0);
    const diffMs = targetDate.getTime() - startOfToday.getTime();
    const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let countdownText;
    if (daysRemaining < 0) {
      countdownText = 'LEWAT';
    } else if (daysRemaining === 0) {
      const now = new Date(fromDate.getTime());
      if (targetDate.getTime() - now.getTime() < 0) countdownText = 'LEWAT';
      else countdownText = 'HARI INI';
    } else if (daysRemaining === 1) {
      countdownText = '1 HARI LAGI';
    } else {
      countdownText = `${daysRemaining} HARI LAGI`;
    }
    return { daysRemaining, countdownText };
  }

  /**
   * Parse announcements content -> array of non-empty trimmed lines
   */
  parseAnnouncements(content) {
    if (!content || typeof content !== 'string') return [];
    return content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  }

  /**
   * Parse hebahan content -> array of active messages
   * Format: TEKS_MESEJ|TARIKH_MULA|TARIKH_AKHIR
   * - Tiada tarikh mula DAN tiada tarikh akhir (kedua kosong): papar sentiasa.
   * - Tiada tarikh mula sahaja: papar sehingga tarikh akhir (hari ini <= tarikh akhir).
   * - Tiada tarikh akhir sahaja: papar dari tarikh mula (hari ini >= tarikh mula).
   * - Kedua-dua ada: papar jika hari ini dalam julat [mula, akhir].
   */
  parseHebahan(content) {
    if (!content || typeof content !== 'string') return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'))
      .map(line => {
        const parts = line.split('|').map(p => p.trim());
        const text = parts[0];
        if (!text) return null;
        
        const startStr = parts[1] || '';
        const endStr = parts[2] || '';
        const startDate = startStr ? new Date(startStr) : null;
        const endDate = endStr ? new Date(endStr) : null;
        
        const hasStart = startDate && !isNaN(startDate.getTime());
        const hasEnd = endDate && !isNaN(endDate.getTime());
        
        if (hasStart) startDate.setHours(0, 0, 0, 0);
        if (hasEnd) endDate.setHours(23, 59, 59, 999);
        
        let isActive = false;
        if (!hasStart && !hasEnd) {
          isActive = true; // Tiada kedua tarikh → papar sentiasa
        } else if (hasStart && !hasEnd) {
          isActive = today >= startDate; // Tiada akhir → papar dari tarikh mula
        } else if (!hasStart && hasEnd) {
          isActive = today <= endDate; // Tiada mula → papar sehingga tarikh akhir
        } else {
          isActive = today >= startDate && today <= endDate; // Kedua ada → dalam julat
        }
        
        if (isActive) {
          return { text, startDate: startStr, endDate: endStr };
        }
        return null;
      })
      .filter(item => item !== null);
  }

  /**
   * Parse countdowns content -> array of rule objects
   * Format:
   * - Gregorian (sekali): COUNTDOWN|YYYY-MM-DD [HH:mm]|event|windowDays
   * - Hijri (ulang setiap tahun): COUNTDOWN_HIJRI|tahun|bulan|hari|event|windowDays (tahun kosong = setiap tahun)
   * - Masihi ulang tahun: COUNTDOWN_MASIHI|bulan|hari|event|windowDays (contoh: 8|31 = 31 Ogos setiap tahun)
   */
  parseCountdowns(content) {
    if (!content || typeof content !== 'string') return [];
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => {
        const parts = line.split('|').map((p) => p.trim());
        const typeRaw = (parts[0] || 'COUNTDOWN').trim().toUpperCase();
        if (typeRaw === 'COUNTDOWN_HIJRI' && parts.length >= 5) {
          const yearStr = (parts[1] || '').trim();
          const year = yearStr ? parseInt(yearStr, 10) : null;
          const month = parseInt(parts[2], 10);
          const day = parseInt(parts[3], 10);
          const event = (parts[4] || '').trim();
          const windowStr = (parts[5] || '').trim();
          let windowDays = 0;
          if (windowStr) {
            const n = parseInt(windowStr, 10);
            if (!isNaN(n) && n >= 0) windowDays = n;
          }
          if (isNaN(month) || month < 1 || month > 12 || isNaN(day) || day < 1 || day > 30) {
            return { type: 'COUNTDOWN', dateTimeRaw: '', event: '', windowDays: 0, raw: line };
          }
          return { type: 'COUNTDOWN_HIJRI', year, month, day, event, windowDays, raw: line };
        }
        if (typeRaw === 'COUNTDOWN_MASIHI' && parts.length >= 4) {
          const month = parseInt(parts[1], 10);
          const day = parseInt(parts[2], 10);
          const event = (parts[3] || '').trim();
          const windowStr = (parts[4] || '').trim();
          let windowDays = 0;
          if (windowStr) {
            const n = parseInt(windowStr, 10);
            if (!isNaN(n) && n >= 0) windowDays = n;
          }
          if (isNaN(month) || month < 1 || month > 12 || isNaN(day) || day < 1 || day > 31) {
            return { type: 'COUNTDOWN', dateTimeRaw: '', event: '', windowDays: 0, raw: line };
          }
          return { type: 'COUNTDOWN_MASIHI', month, day, event, windowDays, raw: line };
        }
        const type = (typeRaw === 'COUNTDOWN_HIJRI' || typeRaw === 'COUNTDOWN_MASIHI') ? 'COUNTDOWN' : typeRaw;
        const dateTimeRaw = (parts[1] || '').trim();
        const event = (parts[2] || '').trim();
        const windowStr = (parts[3] || '').trim();
        let windowDays = 0;
        if (windowStr) {
          const n = parseInt(windowStr, 10);
          if (!isNaN(n) && n >= 0) windowDays = n;
        }
        return { type, dateTimeRaw, event, windowDays, raw: line };
      });
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
   * Parse slideshow content: caption|image|validFrom|validTo per baris -> array of { caption, image, validFrom, validTo }
   * validFrom/validTo optional (empty = no limit, always show).
   */
  parseSlideshow(content) {
    if (!content || typeof content !== 'string') return [];
    return content.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const tabParts = line.split('|');
        const caption = (tabParts[0] || '').trim();
        let imagePath = (tabParts[1] || '').trim();
        if (imagePath && !imagePath.startsWith('/')) imagePath = `/${imagePath}`;
        const validFrom = (tabParts[2] || '').trim();
        const validTo = (tabParts[3] || '').trim();
        return { caption, image: imagePath, validFrom, validTo };
      });
  }

  /**
   * Filter slideshow items by validity period. refDate = tarikh rujukan (biasanya new Date()).
   * Include item if: (validFrom empty OR refDate >= validFrom) AND (validTo empty OR refDate <= validTo).
   * Returns array of { caption, image } only (for API response).
   */
  filterSlideshowByValidity(parsedSlideshow, refDate) {
    if (!parsedSlideshow || !Array.isArray(parsedSlideshow)) return [];
    const ref = refDate instanceof Date ? refDate : new Date(refDate);
    const refStr = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-${String(ref.getDate()).padStart(2, '0')}`;
    return parsedSlideshow
      .filter((item) => {
        const from = (item.validFrom || '').trim();
        const to = (item.validTo || '').trim();
        if (from && refStr < from) return false;
        if (to && refStr > to) return false;
        return true;
      })
      .map((item) => ({ caption: item.caption, image: item.image }));
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
   * Reorder rows berdasarkan susunan ID baru.
   * orderedIds = array ID asal dalam susunan baru, contoh [3,1,2,4] bermakna row 3 jadi pertama.
   * @param {string} filename - Nama fail
   * @param {number[]} orderedIds - Array ID (1-based) dalam susunan baru
   */
  reorderRows(filename, orderedIds) {
    return new Promise(async (resolve, reject) => {
      try {
        const normalized = this.normalizeFilename(filename);
        if (!normalized || !this.isValidFilename(normalized)) {
          return reject(new Error('Invalid filename'));
        }

        const content = await this.readFile(normalized);
        const allLines = content.split('\n');

        // Kumpul baris yang ada kandungan (skip baris kosong)
        const contentLines = [];
        allLines.forEach((line) => {
          if (line.trim() !== '') contentLines.push(line);
        });

        if (!Array.isArray(orderedIds) || orderedIds.length !== contentLines.length) {
          return reject(new Error(`orderedIds length (${orderedIds?.length}) tidak sepadan dengan bilangan baris (${contentLines.length})`));
        }

        // Susun semula baris berdasarkan orderedIds (ID adalah 1-based index ke contentLines)
        const reorderedLines = orderedIds.map((id) => {
          const idx = id - 1;
          if (idx < 0 || idx >= contentLines.length) {
            throw new Error(`ID tidak sah: ${id}`);
          }
          return contentLines[idx];
        });

        const result = await this.writeFile(normalized, reorderedLines.join('\n'));
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
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
   * Parse config content (key|value) -> { PRAYER_TIME_CONFIG, COLOR_CONFIG, DATETIME_CONFIG, MARQUEE_CONFIG }
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
      },
      MARQUEE_CONFIG: {
        ENABLED: true,
        DURATION: 25,
        SEPARATOR: '•'
      },
      HOME_TITLE_CONFIG: {
        TITLE1_TOP: 120,
        TITLE_LEFT: 0,
        TITLE_RIGHT: 0,
        TITLE_BG: 'transparent',
        TITLE_GAP: 30,
        TITLE_ALIGN: 'center',
        TITLE1_SIZE: 88,
        TITLE1_COLOR: '#00FFFF',
        TITLE2_SIZE: 88,
        TITLE2_COLOR: '#00FFFF'
      },
      SLIDES_CONFIG: {
        ORDER: 'A'
      }
    };
    if (!content || typeof content !== 'string' || !content.trim()) return parsed;
    content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0).forEach(line => {
      const parts = line.split('|').map(s => s.trim());
      const key = parts[0];
      const value = parts[1];
      if (!key || !value) return;
      if (key === 'BEEP_COUNT') parsed.PRAYER_TIME_CONFIG.BEEP_COUNT = parseInt(value, 10);
      else if (key === 'WARNING_START_MINUTES') parsed.PRAYER_TIME_CONFIG.WARNING_START_MINUTES = parseFloat(value) || 5;
      else if (key === 'WARNING_START_SECONDS') parsed.PRAYER_TIME_CONFIG.WARNING_START_MINUTES = (parseInt(value, 10) || 30) / 60;
      else if (key === 'IQAMAH_DURATION_MIN') parsed.PRAYER_TIME_CONFIG.IQAMAH_DURATION_MIN = parseFloat(value) || 10;
      else if (key === 'SOLAT_DURATION_MIN') parsed.PRAYER_TIME_CONFIG.SOLAT_DURATION_MIN = parseFloat(value) || 10;
      else if (key === 'COLOR_CURRENT_TIME') parsed.COLOR_CONFIG.CURRENT_TIME = value;
      else if (key === 'COLOR_DEFAULT') parsed.COLOR_CONFIG.DEFAULT = value;
      else if (key === 'COLOR_NEXT_PRAYER') parsed.COLOR_CONFIG.NEXT_PRAYER = value;
      else if (key === 'COLOR_WARNING_PRAYER') parsed.COLOR_CONFIG.WARNING_PRAYER = value;
      else if (key === 'DATETIME_MANUAL_OFFSET_MS') parsed.DATETIME_CONFIG.MANUAL_OFFSET_MS = parseInt(value, 10) || 0;
      else if (key === 'DATETIME_NTP_ENABLED') parsed.DATETIME_CONFIG.NTP_ENABLED = value.toLowerCase() === 'true';
      else if (key === 'DATETIME_NTP_SERVER') parsed.DATETIME_CONFIG.NTP_SERVER = value;
      else if (key === 'DATETIME_NTP_SYNC_INTERVAL_MS') parsed.DATETIME_CONFIG.NTP_SYNC_INTERVAL_MS = parseInt(value, 10) || 3600000;
      else if (key === 'MARQUEE_ENABLED') parsed.MARQUEE_CONFIG.ENABLED = value.toLowerCase() === 'true' || value === '1';
      else if (key === 'MARQUEE_DURATION') parsed.MARQUEE_CONFIG.DURATION = Math.max(5, Math.min(120, parseInt(value, 10) || 25));
      else if (key === 'MARQUEE_SEPARATOR') parsed.MARQUEE_CONFIG.SEPARATOR = value;
      else if (key === 'HOME_TITLE1_TOP') parsed.HOME_TITLE_CONFIG.TITLE1_TOP = parseInt(value, 10) || 120;
      else if (key === 'HOME_TITLE_LEFT') parsed.HOME_TITLE_CONFIG.TITLE_LEFT = parseInt(value, 10) || 0;
      else if (key === 'HOME_TITLE_RIGHT') parsed.HOME_TITLE_CONFIG.TITLE_RIGHT = parseInt(value, 10) || 0;
      else if (key === 'HOME_TITLE_BG') parsed.HOME_TITLE_CONFIG.TITLE_BG = value;
      else if (key === 'HOME_TITLE_GAP') parsed.HOME_TITLE_CONFIG.TITLE_GAP = parseInt(value, 10) || 30;
      else if (key === 'HOME_TITLE_ALIGN') parsed.HOME_TITLE_CONFIG.TITLE_ALIGN = ['left', 'center', 'right'].includes(value) ? value : 'center';
      else if (key === 'HOME_TITLE1_SIZE') parsed.HOME_TITLE_CONFIG.TITLE1_SIZE = parseInt(value, 10) || 88;
      else if (key === 'HOME_TITLE1_COLOR') parsed.HOME_TITLE_CONFIG.TITLE1_COLOR = value;
      else if (key === 'HOME_TITLE2_SIZE') parsed.HOME_TITLE_CONFIG.TITLE2_SIZE = parseInt(value, 10) || 88;
      else if (key === 'HOME_TITLE2_COLOR') parsed.HOME_TITLE_CONFIG.TITLE2_COLOR = value;
      else if (key === 'SLIDES_ORDER') parsed.SLIDES_CONFIG.ORDER = ['A', 'B', 'C'].includes(value.toUpperCase()) ? value.toUpperCase() : 'A';
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
