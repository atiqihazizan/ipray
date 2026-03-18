/**
 * Parser kuliah-override: peraturan override paparan kuliah (batal / ganti).
 * Format: lama (DD-MM-YYYY|type|notes), Gregorian (tahun?|bulan|type|hari|flag?|catatan), Hijri (hijri|tahun|bulan|hari|type|flag|catatan). Type boleh berbilang dengan koma, e.g. kd,ks = satu rekod untuk KD dan KS.
 * Weekly: weekly|dayOfWeek|type|replace|catatan — dayOfWeek 0=Ahad,1=Isnin,2=Selasa,3=Rabu,4=Khamis,5=Jumaat,6=Sabtu.
 * Pilihan untuk papar di Pengumuman: tambah |1|tajuk|tempat|jemputan selepas catatan.
 */

const LEGACY_DATE_REGEX = /^\d{2}-\d{2}-\d{4}$/;

function expandDayRange(dayStr) {
  if (!dayStr || typeof dayStr !== 'string') return [];
  const s = dayStr.trim();
  const out = new Set();
  const parts = s.split(',');
  for (const p of parts) {
    const trimmed = p.trim();
    if (trimmed.includes('-')) {
      const [a, b] = trimmed.split('-').map((x) => parseInt(x.trim(), 10));
      if (!isNaN(a) && !isNaN(b) && a >= 1 && b <= 31) {
        for (let d = a; d <= b; d++) out.add(d);
      }
    } else {
      const n = parseInt(trimmed, 10);
      if (!isNaN(n) && n >= 1 && n <= 31) out.add(n);
    }
  }
  return Array.from(out);
}

function parseLine(line, refYear) {
  const trimmed = line.trim();
  if (!trimmed) return { legacy: false, hijri: false, entries: [], hijriRule: null };
  const parts = trimmed.split('|').map((p) => p.trim());

  const first = (parts[0] || '').toLowerCase();
  if (first === 'hijri' && parts.length >= 6) {
    const yearStr = (parts[1] || '').trim();
    const year = yearStr ? parseInt(yearStr, 10) : null;
    const month = parseInt(parts[2], 10);
    const dayStr = parts[3] || '';
    const type = (parts[4] || '').trim();
    const replaceDisplay = parts[5] === '1';
    const notes = (parts[6] || '').trim();
    const showInAnnounce = parts.length >= 8 && parts[7] === '1';
    const title = (parts[8] || '').trim() || notes;
    const tempat = (parts[9] || '').trim();
    const jemputan = (parts[10] || '').trim();
    if (isNaN(month) || month < 1 || month > 12) return { legacy: false, hijri: false, entries: [], hijriRule: null };
    const validTypes = ['km', 'kd', 'ks'];
    const typeParts = type.split(',').map((t) => t.trim()).filter((t) => validTypes.includes(t));
    if (typeParts.length === 0) return { legacy: false, hijri: false, entries: [], hijriRule: null };
    const days = expandDayRange(dayStr);
    if (days.length === 0) return { legacy: false, hijri: false, entries: [], hijriRule: null };
    return {
      legacy: false,
      hijri: true,
      entries: [],
      hijriRule: { year, month, days, type, notes, replaceDisplay, showInAnnounce, title, tempat, jemputan }
    };
  }

  if (first === 'weekly' && parts.length >= 5) {
    const dayOfWeek = parseInt(parts[1], 10);
    const type = (parts[2] || '').trim();
    const replaceDisplay = parts[3] === '1';
    const notes = (parts[4] || '').trim();
    if (!isNaN(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek <= 6 && ['km', 'kd', 'ks'].includes(type)) {
      return {
        legacy: false,
        hijri: false,
        entries: [],
        hijriRule: null,
        weeklyRule: { dayOfWeek, type, notes, replaceDisplay }
      };
    }
  }

  const firstPart = parts[0] || '';
  if (LEGACY_DATE_REGEX.test(firstPart)) {
    const [dd, mm, yyyy] = first.split('-').map((x) => parseInt(x, 10));
    const dateKey = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    return {
      legacy: true,
      hijri: false,
      entries: [{
        dateKey,
        type: (parts[1] || '').trim(),
        notes: (parts[2] || '').trim(),
        replaceDisplay: false
      }],
      hijriRule: null
    };
  }

  let year = refYear;
  let monthIdx = 0;
  let typeIdx = 1;
  let dayIdx = 2;
  let flagIdx = -1;
  let notesIdx = 3;

  if (parts.length === 4) {
    monthIdx = 0;
    typeIdx = 1;
    dayIdx = 2;
    notesIdx = 3;
  } else if (parts.length === 5) {
    if (/^\d{4}$/.test(firstPart)) {
      year = parseInt(parts[0], 10);
      monthIdx = 1;
      typeIdx = 2;
      dayIdx = 3;
      notesIdx = 4;
    } else {
      monthIdx = 0;
      typeIdx = 1;
      dayIdx = 2;
      flagIdx = 3;
      notesIdx = 4;
    }
  } else if (parts.length >= 6) {
    year = parseInt(firstPart, 10);
    if (isNaN(year) || year < 1000) year = refYear;
    monthIdx = 1;
    typeIdx = 2;
    dayIdx = 3;
    flagIdx = 4;
    notesIdx = 5;
  }

  const month = parseInt(parts[monthIdx], 10);
  const type = (parts[typeIdx] || '').trim();
  const notes = (parts[notesIdx] || '').trim();
  const replaceDisplay = flagIdx >= 0 && parts[flagIdx] === '1';
  if (isNaN(month) || month < 1 || month > 12) return { legacy: false, hijri: false, entries: [], hijriRule: null };
  if (!['km', 'kd', 'ks'].includes(type)) return { legacy: false, hijri: false, entries: [], hijriRule: null };

  const days = expandDayRange(parts[dayIdx] || '');
  if (days.length === 0) return { legacy: false, hijri: false, entries: [], hijriRule: null };

  const lastDay = new Date(year, month, 0).getDate();
  const entries = [];
  for (const d of days) {
    if (d < 1 || d > lastDay) continue;
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    entries.push({ dateKey, type, notes, replaceDisplay });
  }
  return { legacy: false, hijri: false, entries, hijriRule: null };
}

function parseKuliahOverride(content, refYear) {
  const ref = refYear ?? new Date().getFullYear();
  const expanded = [];
  const hijriRules = [];
  const weeklyRules = [];
  if (!content || typeof content !== 'string') return { expanded, hijriRules, weeklyRules };
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const parsed = parseLine(line, ref);
    if (parsed.entries.length) expanded.push(...parsed.entries);
    if (parsed.hijriRule) {
      const rule = parsed.hijriRule;
      const types = (rule.type || '').split(',').map((t) => t.trim()).filter((t) => ['km', 'kd', 'ks'].includes(t));
      if (types.length > 0) {
        for (const t of types) {
          hijriRules.push({ ...rule, type: t });
        }
      } else {
        hijriRules.push(rule);
      }
    }
    if (parsed.weeklyRule) weeklyRules.push(parsed.weeklyRule);
  }
  return { expanded, hijriRules, weeklyRules };
}

function matchBatal(date, type, expandedList, options = {}) {
  const typeNorm = (type || '').trim();
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  for (const e of expandedList || []) {
    if (e.dateKey === dateKey && e.type === typeNorm) {
      return { isBatal: true, notes: e.notes || '', replaceDisplay: e.replaceDisplay === true };
    }
  }
  const { hijriRules = [], getHijri, weeklyRules = [] } = options;
  if (getHijri && typeof getHijri === 'function' && hijriRules.length > 0) {
    const hijri = getHijri(date);
    if (hijri && hijri.month != null && hijri.day != null) {
      for (const r of hijriRules) {
        if (r.type !== typeNorm) continue;
        if (r.year != null && r.year !== hijri.year) continue;
        if (r.month !== hijri.month) continue;
        if (!r.days || !r.days.includes(hijri.day)) continue;
        return { isBatal: true, notes: r.notes || '', replaceDisplay: r.replaceDisplay === true };
      }
    }
  }
  if (weeklyRules.length > 0) {
    const dayOfWeek = date.getDay();
    for (const r of weeklyRules) {
      if (r.dayOfWeek === dayOfWeek && r.type === typeNorm) {
        return { isBatal: true, notes: r.notes || '', replaceDisplay: r.replaceDisplay === true };
      }
    }
  }
  return { isBatal: false, notes: '', replaceDisplay: false };
}

module.exports = {
  parseKuliahOverride,
  matchBatal,
  expandDayRange,
  parseLine
};
