/**
 * Baca data dari storage cloud untuk panel setting (bila dibuka dari internet
 * tanpa nodejs client tempatan). Supaya cloud:data:get dilayan oleh server.
 */
const path = require('path');
const fs = require('fs-extra');
const { STORAGE_ROOT } = require('./fileService');

/** Kunci config lama yang tidak lagi digunakan — diabaikan & dibuang dari fail. */
const DEPRECATED_CONFIG_KEYS = new Set(['BEEP_COUNT']);

function isDeprecatedConfigKey(key) {
  return DEPRECATED_CONFIG_KEYS.has((key || '').trim());
}

function sanitizeConfigContent(content) {
  if (!content || typeof content !== 'string') return { content: content || '', changed: false };
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  let changed = false;
  const kept = lines.filter((line) => {
    const trimmed = (line || '').trim();
    if (!trimmed || trimmed.startsWith('#')) return true;
    const key = trimmed.split('|')[0];
    if (isDeprecatedConfigKey(key)) {
      changed = true;
      return false;
    }
    return true;
  });
  return { content: kept.join(eol), changed };
}

const ALLOWED_FILES = [
  'config', 'slides', 'hebahan', 'takwim', 'livestream', 'kuliah', 'kuliah-override',
  'announcements', 'countdowns', 'slideshow', 'images', 'penceramah', 'petugas', 'jadual-petugas',
  'modbus-remote'
];

function normalizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  let name = filename.trim().toLowerCase();
  if (name.endsWith('.txt')) name = name.slice(0, -4);
  return name || null;
}

function getPhysicalFilename(normalized) {
  return normalized === 'slides' ? 'screen' : normalized;
}

function getFilePath(clientId, fileName) {
  const normalized = normalizeFilename(fileName);
  if (!normalized || !ALLOWED_FILES.includes(normalized)) return null;
  const physical = getPhysicalFilename(normalized);
  return path.join(STORAGE_ROOT, clientId, 'data', `${physical}.txt`);
}

const COLUMNS = {
  config: ['key', 'value'],
  slides: ['type', 'image', 'duration', 'checkbox', 'hide'],
  hebahan: ['text', 'startDate', 'endDate'],
  takwim: ['date', 'hijri', 'imsak', 'subuh', 'syuruk', 'zohor', 'asar', 'maghrib', 'isyak'],
  livestream: ['tajuk', 'url', 'jenis'],
  kuliah: ['week', 'day', 'type', 'speaker', 'speakerId', 'title'],
  'kuliah-override': ['format', 'date', 'tahun', 'bulan', 'type', 'hari', 'replace', 'notes', 'showAnnounce', 'title', 'tempat', 'jemputan'],
  announcements: ['type', 'title', 'speaker', 'category', 'datetime', 'location', 'audience'],
  countdowns: ['format', 'date', 'tahun', 'bulan', 'hari', 'event', 'windowDays', 'background', 'display', 'layout'],
  slideshow: ['caption', 'image', 'validFrom', 'validTo'],
  images: ['imageCode', 'imagePath'],
  penceramah: ['kod', 'namaPenuh', 'shortname', 'kitab'],
  petugas: ['slug', 'namaPenuh', 'shortname', 'role'],
  'jadual-petugas': ['week', 'day', 'role', 'officerCode']
};

function parseLineToRow(normalized, line, index) {
  const parts = line.split('|').map(p => (p || '').trim());
  const tabParts = line.split('\t');
  if (normalized === 'config') {
    const configKey = (parts[0] || '').trim();
    if (isDeprecatedConfigKey(configKey)) return null;
    return { id: index + 1, key: parts[0] || '', value: parts[1] || '', raw: line };
  }
  if (normalized === 'hebahan') {
    return { id: index + 1, text: parts[0] || '', startDate: parts[1] || '', endDate: parts[2] || '', raw: line };
  }
  if (normalized === 'takwim') {
    if (tabParts.length < 8) return null;
    const dateHijri = (tabParts[0] || '').trim().split(/\s+/);
    return {
      id: index + 1,
      date: dateHijri[0] || '',
      hijri: dateHijri[1] || '',
      imsak: tabParts[1] || '',
      subuh: tabParts[2] || '',
      syuruk: tabParts[3] || '',
      zohor: tabParts[4] || '',
      asar: tabParts[5] || '',
      maghrib: tabParts[6] || '',
      isyak: tabParts[7] || '',
      raw: line
    };
  }
  if (normalized === 'livestream') {
    return { id: index + 1, tajuk: parts[0] || '', url: parts[1] || '', jenis: parts[2] || '', raw: line };
  }
  if (normalized === 'slides') {
    const checkboxRaw = parseInt(parts[3], 10) || 0;
    const marqueeCol = (parts[5] || '').trim() === '1';
    const combinedBit = parts.length >= 6 ? (checkboxRaw | (marqueeCol ? 8 : 0)) : checkboxRaw;
    const cbParts = [];
    if (combinedBit & 1) cbParts.push('date');
    if (combinedBit & 2) cbParts.push('solat-time');
    if (combinedBit & 4) cbParts.push('solat-time-small');
    if (combinedBit & 8) cbParts.push('marquee');
    const checkbox = cbParts.join(',');
    return {
      id: index + 1,
      type: parts[0] || '',
      image: parts[1] || '',
      duration: parts[2] || '',
      checkbox,
      hide: parts[4] === '1' ? '1' : '0',
      raw: line
    };
  }
  if (normalized === 'slideshow') {
    return {
      id: index + 1,
      caption: parts[0] || '',
      image: parts[1] || '',
      validFrom: parts[2] || '',
      validTo: parts[3] || '',
      raw: line
    };
  }
  if (normalized === 'images') {
    return { id: index + 1, imageCode: parts[0] || '', imagePath: parts[1] || '', raw: line };
  }
  if (normalized === 'kuliah') {
    const isOld = parts.length >= 6;
    return {
      id: index + 1,
      week: parts[0] || '',
      day: parts[1] || '',
      type: parts[2] || '',
      speaker: isOld ? (parts[3] || '') : (parts[3] || '').trim(),
      speakerId: isOld ? (parts[4] || '') : (parts[3] || '').trim(),
      title: isOld ? (parts[5] || '') : (parts[4] || ''),
      raw: line
    };
  }
  if (normalized === 'kuliah-override') {
    // Format ikut nodejs/dataService: single, hijri, range (weekly/tahun/bulan)
    // - single: DD-MM-YYYY|type|notes
    // - hijri: hijri|tahun|bulan|hari|type|replace|notes|[showAnnounce|title|tempat|jemputan]
    // - range: weekly|day|type|replace|notes ATAU tahun|bulan|type|hari|notes ATAU bulan|type|hari|replace|notes ATAU tahun|bulan|type|hari|replace|notes
    const empty = {
      id: index + 1,
      format: '',
      date: '',
      tahun: '',
      bulan: '',
      type: '',
      hari: '',
      replace: '',
      notes: '',
      showAnnounce: '',
      title: '',
      tempat: '',
      jemputan: '',
      raw: line
    };

    const first = (parts[0] || '').trim();
    const isHijri = first.toLowerCase() === 'hijri' && parts.length >= 6;
    const isLegacySingle = /^\d{2}-\d{2}-\d{4}$/.test(first);

    if (isHijri) {
      return {
        ...empty,
        format: 'hijri',
        tahun: (parts[1] || '').trim(),
        bulan: (parts[2] || '').trim(),
        hari: (parts[3] || '').trim(),
        type: (parts[4] || '').trim(),
        replace: (parts[5] || '').trim(),
        notes: (parts[6] || '').trim(),
        showAnnounce: parts.length >= 8 ? (parts[7] || '').trim() : '',
        title: (parts[8] || '').trim(),
        tempat: (parts[9] || '').trim(),
        jemputan: (parts[10] || '').trim()
      };
    }

    if (isLegacySingle) {
      return {
        ...empty,
        format: 'single',
        date: parts[0] || '',
        type: parts[1] || '',
        notes: parts[2] || '',
        tahun: '',
        bulan: '',
        hari: '',
        replace: ''
      };
    }

    // Weekly: weekly|dayOfWeek|type|replace|notes (0=Ahad..6=Sabtu)
    if (first.toLowerCase() === 'weekly' && parts.length >= 5) {
      return {
        ...empty,
        format: 'weekly',
        bulan: 'weekly',
        hari: (parts[1] || '').trim(),
        type: (parts[2] || '').trim(),
        replace: (parts[3] || '').trim(),
        notes: (parts[4] || '').trim()
      };
    }

    // Range (Masihi)
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
      if (/^\d{4}$/.test(first)) {
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
    return {
      ...empty,
      format: 'range',
      date: '',
      tahun,
      bulan,
      type,
      hari,
      replace,
      notes
    };
  }
  if (normalized === 'announcements') {
    return {
      id: index + 1,
      type: parts[0] || '',
      title: parts[1] || '',
      speaker: parts[2] || '',
      category: parts[3] || '',
      datetime: parts[4] || '',
      location: parts[5] || '',
      audience: parts[6] || '',
      raw: line
    };
  }
  if (normalized === 'countdowns') {
    const typeRaw = (parts[0] || '').toUpperCase();
    const parseOpt = (startIdx) => ({
      background: (parts[startIdx] || '').trim(),
      display: (parts[startIdx + 1] || '').trim(),
      layout: (parts[startIdx + 2] || '').trim(),
    });
    if (typeRaw === 'COUNTDOWN_HIJRI' && parts.length >= 5) {
      const opt = parseOpt(6);
      return { id: index + 1, format: 'hijri', date: '', tahun: parts[1] || '', bulan: parts[2] || '', hari: parts[3] || '', event: parts[4] || '', windowDays: parts[5] || '', ...opt, raw: line };
    }
    if (typeRaw === 'COUNTDOWN_MASIHI' && parts.length >= 4) {
      const opt = parseOpt(5);
      return { id: index + 1, format: 'masihi', date: '', tahun: '', bulan: parts[1] || '', hari: parts[2] || '', event: parts[3] || '', windowDays: parts[4] || '', ...opt, raw: line };
    }
    const opt = parseOpt(4);
    return { id: index + 1, format: 'date', date: parts[1] || '', tahun: '', bulan: '', hari: '', event: parts[2] || '', windowDays: parts[3] || '', ...opt, raw: line };
  }
  if (normalized === 'penceramah') {
    return { id: index + 1, kod: parts[0] || '', namaPenuh: parts[1] || '', shortname: parts[2] || '', kitab: parts.length >= 5 ? (parts[4] || '') : (parts[3] || ''), raw: line };
  }
  if (normalized === 'petugas') {
    return { id: index + 1, slug: parts[0] || '', namaPenuh: parts[1] || '', shortname: parts[2] || '', role: parts[3] || '', raw: line };
  }
  if (normalized === 'jadual-petugas') {
    return { id: index + 1, week: parts[0] || '', day: parts[1] || '', role: parts[2] || '', officerCode: parts[3] || '', raw: line };
  }
  return { id: index + 1, raw: line };
}

function parseFileContent(normalized, content) {
  const cleaned = (content || '').replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/).filter(l => l.trim() !== '');
  const parsed = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('#')) continue;
    if (normalized === 'takwim' && i < 2) continue;
    const row = parseLineToRow(normalized, line, parsed.length);
    if (row) {
      parsed.push(row);
    }
  }
  parsed.forEach((row, idx) => { row.id = idx + 1; });
  return parsed;
}

/** Satu baris lalai untuk slides (screen.txt) bila fail tiada di cloud. */
const DEFAULT_SLIDES_LINE = 'home||1000|3|0|1';

/**
 * Baca fail data dari storage cloud dan return { data, columns }.
 * Untuk 'slides': jika screen.txt tiada, cipta fail dengan satu baris lalai (home) supaya PAPARAN PAGE ada senarai.
 * @param {string} clientId - e.g. 'clientA'
 * @param {string} fileName - e.g. 'config', 'hebahan', 'slides'
 * @returns {Promise<{ data: Array, columns: Array }>}
 */
async function readDataFile(clientId, fileName) {
  const filePath = getFilePath(clientId, fileName);
  if (!filePath) {
    throw new Error(`Invalid or disallowed filename: ${fileName}`);
  }
  const normalized = normalizeFilename(fileName);
  const exists = await fs.pathExists(filePath);

  if (!exists) {
    if (normalized === 'slides') {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, DEFAULT_SLIDES_LINE + '\n', 'utf8');
      const data = parseFileContent(normalized, DEFAULT_SLIDES_LINE + '\n');
      return { data, columns: COLUMNS[normalized] || [] };
    }
    return { data: [], columns: COLUMNS[normalized] || [] };
  }
  let content = await fs.readFile(filePath, 'utf8');
  content = (content || '').replace(/^\uFEFF/, '');
  if (normalized === 'config') {
    const sanitized = sanitizeConfigContent(content);
    if (sanitized.changed) {
      await fs.writeFile(filePath, sanitized.content, 'utf8');
    }
    content = sanitized.content;
  }
  const data = parseFileContent(normalized, content);
  const columns = COLUMNS[normalized] || [];
  return { data, columns };
}

/**
 * Baca kandungan mentah fail (untuk cloud:file:get).
 */
async function readRawFile(clientId, fileName) {
  const normalized = normalizeFilename(fileName);
  if (!normalized || !ALLOWED_FILES.includes(normalized)) {
    throw new Error(`Invalid or disallowed filename: ${fileName}`);
  }
  const physical = getPhysicalFilename(normalized);
  const filePath = path.join(STORAGE_ROOT, clientId, 'data', `${physical}.txt`);
  const exists = await fs.pathExists(filePath);
  if (!exists) return '';
  return fs.readFile(filePath, 'utf8');
}

function getDataFilePath(clientId, fileName) {
  const normalized = normalizeFilename(fileName);
  if (!normalized || !ALLOWED_FILES.includes(normalized)) return null;
  const physical = getPhysicalFilename(normalized);
  return path.join(STORAGE_ROOT, clientId, 'data', `${physical}.txt`);
}

/** Cari index baris dalam content mengikut id (1-based, sama seperti parseFileContent). */
function findLineIndex(allLines, normalized, id) {
  let currentId = 0;
  if (normalized === 'takwim') {
    for (let i = 2; i < allLines.length; i++) {
      const line = allLines[i];
      const tabParts = line.split('\t');
      if (tabParts.length >= 8 && line.trim() !== '') {
        currentId++;
        if (currentId === id) return i;
      }
    }
  } else {
    const skipComment = normalized === 'countdowns';
    for (let i = 0; i < allLines.length; i++) {
      const trimmed = (allLines[i] || '').trim();
      if (trimmed !== '' && (!skipComment || !trimmed.startsWith('#'))) {
        currentId++;
        if (currentId === id) return i;
      }
    }
  }
  return null;
}

/** Tulis penuh fail (cloud:file:save). */
async function writeFile(clientId, fileName, content) {
  const filePath = getDataFilePath(clientId, fileName);
  if (!filePath) throw new Error(`Invalid or disallowed filename: ${fileName}`);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
  return { success: true };
}

/** Slides checkbox: comma string → bit (1=date, 2=solat-time, 4=solat-time-small, 8=marquee). */
function slidesCheckboxCommaToBit(commaStr) {
  if (!commaStr || typeof commaStr !== 'string') return 0;
  const set = new Set(commaStr.split(',').map(s => s.trim()).filter(Boolean));
  let bits = 0;
  if (set.has('date')) bits |= 1;
  if (set.has('solat-time')) bits |= 2;
  if (set.has('solat-time-small')) bits |= 4;
  if (set.has('marquee')) bits |= 8;
  return bits;
}

/** Kemas kini satu baris. */
async function updateRow(clientId, fileName, id, rowData) {
  const normalized = normalizeFilename(fileName);
  if (!normalized || !ALLOWED_FILES.includes(normalized)) {
    throw new Error(`Invalid or disallowed filename: ${fileName}`);
  }
  const filePath = getDataFilePath(clientId, fileName);
  if (!filePath) throw new Error(`Invalid filename: ${fileName}`);
  const content = await fs.pathExists(filePath) ? await fs.readFile(filePath, 'utf8') : '';
  const allLines = content.split(/\r?\n/);
  const lineIndex = findLineIndex(allLines, normalized, id);
  if (lineIndex === null || lineIndex < 0 || lineIndex >= allLines.length) {
    throw new Error('Invalid row ID');
  }
  let newLine = rowData && (typeof rowData === 'string' ? rowData : rowData.raw);
  if (normalized === 'config' && rowData && typeof rowData === 'object' && (newLine == null || newLine === '') && rowData.key != null) {
    newLine = `${rowData.key}|${rowData.value ?? ''}`;
  }
  if (normalized === 'config') {
    const configKey = rowData?.key || (typeof newLine === 'string' ? newLine.split('|')[0] : null);
    if (isDeprecatedConfigKey(configKey)) {
      throw new Error(`Config key '${configKey}' tidak lagi disokong`);
    }
  }
  if (normalized === 'takwim' && rowData && rowData.raw) {
    newLine = rowData.raw;
  }
  if (normalized === 'slides' && rowData && typeof rowData === 'object' && (newLine == null || newLine === '')) {
    const checkboxBit = slidesCheckboxCommaToBit(rowData.checkbox);
    newLine = `${rowData.type || ''}|${rowData.image || ''}|${rowData.duration || ''}|${checkboxBit}|${rowData.hide || '0'}`;
  }
  if (newLine == null) newLine = '';
  allLines[lineIndex] = newLine;
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, allLines.join('\n'), 'utf8');
  return { success: true };
}

/** Masukkan baris baru. */
async function insertRow(clientId, fileName, rowData, position = 'end') {
  const normalized = normalizeFilename(fileName);
  if (!normalized || !ALLOWED_FILES.includes(normalized)) {
    throw new Error(`Invalid or disallowed filename: ${fileName}`);
  }
  const filePath = getDataFilePath(clientId, fileName);
  if (!filePath) throw new Error(`Invalid filename: ${fileName}`);
  const content = await fs.pathExists(filePath) ? await fs.readFile(filePath, 'utf8') : '';
  const lines = content.split(/\r?\n/);
  let insertIndex;
  if (position === 'start') {
    insertIndex = normalized === 'takwim' ? 2 : 0;
  } else if (position === 'end') {
    insertIndex = lines.length;
  } else if (typeof position === 'number') {
    insertIndex = position;
  } else {
    throw new Error('Invalid position');
  }
  let newRow = rowData && (typeof rowData === 'string' ? rowData : rowData.raw);
  if (normalized === 'config' && rowData && typeof rowData === 'object' && (newRow == null || newRow === '') && rowData.key != null) {
    newRow = `${rowData.key}|${rowData.value ?? ''}`;
  }
  if (normalized === 'config') {
    const configKey = rowData?.key || (typeof newRow === 'string' ? newRow.split('|')[0] : null);
    if (isDeprecatedConfigKey(configKey)) {
      throw new Error(`Config key '${configKey}' tidak lagi disokong`);
    }
  }
  if (newRow == null) newRow = '';
  lines.splice(insertIndex, 0, newRow);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, lines.join('\n'), 'utf8');
  return { success: true, insertedAt: insertIndex };
}

/** Padam satu baris. */
async function deleteRow(clientId, fileName, id) {
  const normalized = normalizeFilename(fileName);
  if (!normalized || !ALLOWED_FILES.includes(normalized)) {
    throw new Error(`Invalid or disallowed filename: ${fileName}`);
  }
  const filePath = getDataFilePath(clientId, fileName);
  if (!filePath) throw new Error(`Invalid filename: ${fileName}`);
  const content = await fs.pathExists(filePath) ? await fs.readFile(filePath, 'utf8') : '';
  const allLines = content.split(/\r?\n/);
  const lineIndex = findLineIndex(allLines, normalized, id);
  if (lineIndex === null || lineIndex < 0 || lineIndex >= allLines.length) {
    throw new Error('Invalid row ID');
  }
  allLines.splice(lineIndex, 1);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, allLines.join('\n'), 'utf8');
  return { success: true, rowId: id };
}

module.exports = {
  readDataFile,
  readRawFile,
  updateRow,
  insertRow,
  deleteRow,
  writeFile
};
