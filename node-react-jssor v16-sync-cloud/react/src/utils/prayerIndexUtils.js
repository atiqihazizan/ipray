/**
 * Util indeks waktu solat — satu sumber benar untuk index 0–6 (Imsak → Isyak).
 * Sejajar dengan wdata[] dan getPrayerTimes() dalam islamicTimeUtils.
 * Guna index untuk carian waktu supaya tetap dan tepat, tidak bergantung pada ejaan/case.
 */

/** Nama waktu solat mengikut index (kunci untuk prayer.times object). Index = index dalam array wdata. */
export const PRAYER_NAMES_BY_INDEX = ['Imsak', 'Subuh', 'Syuruk', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];

/** Index Syuruk (untuk kelipan 10 saat pertama). */
export const SYURUK_INDEX = 2;

/** Index min/max untuk solat yang ada waktu (0 = Imsak, 6 = Isyak). */
export const PRAYER_INDEX_MIN = 0;
export const PRAYER_INDEX_MAX = 6;

/**
 * Dapatkan index waktu solat (0–6) dari nama. Case-insensitive.
 * @param {string} name - Nama solat (e.g. 'Syuruk', 'SYURUK', 'syuruk')
 * @returns {number|null} Index 0–6 atau null jika tidak dijumpai
 */
export function getPrayerIndex(name) {
  if (name == null || name === '') return null;
  const lower = String(name).toLowerCase();
  const i = PRAYER_NAMES_BY_INDEX.findIndex((n) => n.toLowerCase() === lower);
  return i >= 0 ? i : null;
}

/**
 * Dapatkan nama waktu solat untuk paparan/key dari index.
 * @param {number} index - Index 0–6
 * @returns {string|null} Nama (e.g. 'Syuruk') atau null jika index tidak sah
 */
export function getPrayerNameByIndex(index) {
  if (typeof index !== 'number' || index < PRAYER_INDEX_MIN || index > PRAYER_INDEX_MAX) return null;
  return PRAYER_NAMES_BY_INDEX[index] ?? null;
}

/**
 * Dapatkan masa solat dari objek times menggunakan index.
 * @param {Object} times - Objek prayer.times (keys: Imsak, Subuh, Syuruk, ...)
 * @param {number} index - Index 0–6
 * @returns {string|null} Masa (e.g. '07:30') atau null
 */
export function getPrayerTimeByIndex(times, index) {
  if (!times || typeof index !== 'number' || index < PRAYER_INDEX_MIN || index > PRAYER_INDEX_MAX) return null;
  const key = PRAYER_NAMES_BY_INDEX[index];
  return key ? times[key] ?? null : null;
}

/**
 * Semak sama ada index ialah Syuruk (untuk kelipan 10 saat).
 * @param {number|null} index
 * @returns {boolean}
 */
export function isSyurukIndex(index) {
  return index === SYURUK_INDEX;
}
