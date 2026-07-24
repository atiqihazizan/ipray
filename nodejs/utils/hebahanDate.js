/**
 * Logik tarikh hebahan (satu sumber kebenaran, dikongsi backend).
 * Parse waktu tempatan (elak isu UTC pada `new Date("YYYY-MM-DD")`).
 */

function parseLocalDate(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Tentukan sama ada hebahan aktif pada `now`.
 * - Tiada kedua tarikh  -> sentiasa aktif
 * - Mula sahaja          -> aktif bila hari ini >= mula
 * - Akhir sahaja         -> aktif sehingga hujung hari akhir (tamat tepat 00:00 keesokan)
 * - Kedua-dua ada        -> aktif jika dalam julat
 */
function isHebahanActive(startStr, endStr, now = new Date()) {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  const endOfEnd = end
    ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)
    : null;

  if (!start && !endOfEnd) return true;
  if (start && !endOfEnd) return todayStart >= start;
  if (!start && endOfEnd) return now <= endOfEnd;
  return todayStart >= start && now <= endOfEnd;
}

module.exports = { parseLocalDate, isHebahanActive };