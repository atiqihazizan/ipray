/**
 * Backend processor: kuliah hari, minggu, bulanan (dengan batal/replace).
 * Uses kuliahDateUtils and kuliahOverrideParser.
 */

const { getWeekCode, getDayCode, calculateDateFromCodes } = require('./kuliahDateUtils');
const { matchBatal } = require('./kuliahOverrideParser');

/**
 * Parse kuliah line to parts. Format: week|day|type|speaker|imageCode|kitab
 */
function parseKuliahLine(line) {
  if (!line || typeof line !== 'string') return null;
  const parts = line.trim().split('|');
  const isOldFormat = parts.length >= 6;
  const slug = (parts[3] || '').trim();
  return {
    week: (parts[0] || '').trim(),
    day: (parts[1] || '').trim(),
    type: (parts[2] || '').trim(),
    speaker: isOldFormat ? (parts[3] || '').trim() : slug,
    imageCode: isOldFormat ? (parts[4] || '').trim() : slug,
    kitab: isOldFormat ? (parts[5] || '').trim() : (parts[4] || '').trim(),
    raw: line
  };
}

/**
 * Kuliah hari ini: filter by today week+day, drop items where batal has replaceDisplay.
 * Juga kembalikan replacements untuk hari ini (ganti paparan tanpa imej di slide kuliah hari ini sahaja).
 * @param {string[]} kuliahLines
 * @param {{ expanded: Array, hijriRules: Array, weeklyRules: Array, getHijri: function }} batalOptions
 * @param {Date} today
 * @returns {{ lines: string[], replacements: Array<{ type: string, replacementText: string }> }}
 */
function processKuliahHari(kuliahLines, batalOptions, today) {
  const week = getWeekCode(today);
  const day = getDayCode(today);
  const list = (batalOptions && batalOptions.expanded) ? batalOptions.expanded : (Array.isArray(batalOptions) ? batalOptions : []);
  const opts = (batalOptions && (batalOptions.hijriRules || batalOptions.getHijri || batalOptions.weeklyRules)) ? { hijriRules: batalOptions.hijriRules || [], weeklyRules: batalOptions.weeklyRules || [], getHijri: batalOptions.getHijri } : {};
  const filtered = (kuliahLines || []).filter((line) => {
    const p = parseKuliahLine(line);
    if (!p || p.week !== week || p.day !== day) return false;
    const m = matchBatal(today, p.type, list, opts);
    return !m.replaceDisplay;
  });
  const TYPE_PRIORITY = ['ks', 'kd', 'km', 'kk'];
  const rawReplacements = [];
  for (const type of TYPE_PRIORITY) {
    const m = matchBatal(today, type, list, opts);
    if (m.replaceDisplay && (m.notes || '').trim()) {
      rawReplacements.push({ type, replacementText: (m.notes || '').trim() });
    }
  }
  const seenTexts = new Set();
  const replacements = rawReplacements.map((r) => {
    const key = r.replacementText.toUpperCase();
    if (seenTexts.has(key)) return { ...r, displaySkip: true };
    seenTexts.add(key);
    return { ...r, displaySkip: false };
  });
  return { lines: filtered, replacements };
}

/**
 * Kuliah minggu ini: filter by current week, drop items where (date, type) has replaceDisplay.
 * @param {string[]} kuliahLines
 * @param {{ expanded: Array, hijriRules: Array, weeklyRules: Array, getHijri: function }} batalOptions
 * @param {Date} today
 * @returns {string[]}
 */
function processKuliahMinggu(kuliahLines, batalOptions, today) {
  const week = getWeekCode(today);
  const year = today.getFullYear();
  const month = today.getMonth();
  const list = (batalOptions && batalOptions.expanded) ? batalOptions.expanded : (Array.isArray(batalOptions) ? batalOptions : []);
  const opts = (batalOptions && (batalOptions.hijriRules || batalOptions.getHijri || batalOptions.weeklyRules)) ? { hijriRules: batalOptions.hijriRules || [], weeklyRules: batalOptions.weeklyRules || [], getHijri: batalOptions.getHijri } : {};
  const filtered = (kuliahLines || []).filter((line) => {
    const p = parseKuliahLine(line);
    if (!p || p.week !== week) return false;
    const date = calculateDateFromCodes(p.week, p.day, year, month);
    const m = matchBatal(date, p.type, list, opts);
    return !m.replaceDisplay;
  });
  return filtered;
}

/** Types yang boleh ada rekod batal/ganti paparan (untuk suntikan slot dari batal sahaja) */
const BULANAN_TYPES = ['km', 'kd', 'ks', 'kk'];

/**
 * Kuliah bulanan: for each day in month, build entries. replaceDisplay -> replacementText only.
 * Jika tiada kuliah untuk (hari, type) tetapi batal ada replaceDisplay untuk (tarikh, type), suntik entri gantian.
 * @param {string[]} kuliahLines
 * @param {{ expanded: Array, hijriRules: Array, weeklyRules: Array, getHijri: function }} batalOptions
 * @param {Date} today
 * @returns {Array<{ dayNumber: number, dayOfWeek: number, date: string, entries: Array<{ type?, penceramah?, kitab?, replacementText? }> }>}
 */
function processKuliahBulanan(kuliahLines, batalOptions, today) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();

  const dayToSlots = {};
  for (let dayNum = 1; dayNum <= lastDay; dayNum++) {
    dayToSlots[dayNum] = [];
  }

  const list = (batalOptions && batalOptions.expanded) ? batalOptions.expanded : (Array.isArray(batalOptions) ? batalOptions : []);
  const opts = (batalOptions && (batalOptions.hijriRules || batalOptions.getHijri || batalOptions.weeklyRules)) ? { hijriRules: batalOptions.hijriRules || [], weeklyRules: batalOptions.weeklyRules || [], getHijri: batalOptions.getHijri } : {};

  /** Set "dayNum-type" yang sudah ada dari kuliah.txt (termasuk yang diganti) */
  const addedFromKuliah = new Set();

  const seenReplacementPerDay = {};

  const lines = kuliahLines || [];
  for (const line of lines) {
    const p = parseKuliahLine(line);
    if (!p || !p.week || !p.day) continue;
    const date = calculateDateFromCodes(p.week, p.day, year, month);
    if (date.getFullYear() !== year || date.getMonth() !== month) continue;
    const dayNum = date.getDate();
    addedFromKuliah.add(`${dayNum}-${p.type}`);
    const m = matchBatal(date, p.type, list, opts);
    if (m.replaceDisplay) {
      if (!seenReplacementPerDay[dayNum]) seenReplacementPerDay[dayNum] = new Set();
      const key = (m.notes || '').toUpperCase();
      if (!seenReplacementPerDay[dayNum].has(key)) {
        seenReplacementPerDay[dayNum].add(key);
        dayToSlots[dayNum].push({ replacementText: m.notes || '' });
      }
    } else {
      dayToSlots[dayNum].push({
        type: p.type,
        penceramah: p.speaker,
        imageCode: p.imageCode,
        kitab: p.kitab,
        isBatal: m.isBatal,
        notes: m.isBatal ? (m.notes || '') : ''
      });
    }
  }

  for (let dayNum = 1; dayNum <= lastDay; dayNum++) {
    const date = new Date(year, month, dayNum);
    if (!seenReplacementPerDay[dayNum]) seenReplacementPerDay[dayNum] = new Set();
    for (const type of BULANAN_TYPES) {
      if (addedFromKuliah.has(`${dayNum}-${type}`)) continue;
      const m = matchBatal(date, type, list, opts);
      if (m.replaceDisplay) {
        const key = (m.notes || '').toUpperCase();
        if (!seenReplacementPerDay[dayNum].has(key)) {
          seenReplacementPerDay[dayNum].add(key);
          dayToSlots[dayNum].push({ replacementText: m.notes || '' });
        }
      }
    }
  }

  const result = [];
  for (let dayNum = 1; dayNum <= lastDay; dayNum++) {
    const date = new Date(year, month, dayNum);
    let row = 0;
    let col = 0;
    if (dayNum === 1) {
      col = firstDayOfWeek;
    } else {
      const daysFromStart = dayNum - 1;
      row = Math.floor((firstDayOfWeek + daysFromStart) / 7);
      col = (firstDayOfWeek + daysFromStart) % 7;
    }
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    result.push({
      dayNumber: dayNum,
      dayOfWeek: date.getDay(),
      date: dateStr,
      entries: dayToSlots[dayNum] || []
    });
  }
  return result;
}

module.exports = {
  processKuliahHari,
  processKuliahMinggu,
  processKuliahBulanan,
  parseKuliahLine
};
