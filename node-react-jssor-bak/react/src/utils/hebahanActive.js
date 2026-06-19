function parseLocalDate(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

export function isHebahanActive(startStr, endStr, now = new Date()) {
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