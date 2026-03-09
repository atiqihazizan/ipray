/**
 * Process data countdown (countdowns.txt) ke slides.
 * Hanya papar sebelum tarikh; jika LEWAT skip. Jika windowDays > 0, hanya papar bila baki hari <= windowDays.
 * Utama: guna countdownText & daysRemaining dari backend. Fallback: library dateFormatter (getCountdown, getCountdownDays).
 */
import { slidesTemplate } from '../config/sliderConfig';
import { getCountdown, getCountdownDays } from '../utils/dateFormatter';

function normalizeDateTime(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const s = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 00:00`;
  return s;
}

function toCountdownEntry(item) {
  const windowDays = item && typeof item === 'object' && typeof item.windowDays === 'number' ? item.windowDays : 0;
  if (typeof item === 'string') {
    const parts = item.split('|');
    const dateStr = normalizeDateTime(parts[1]);
    const event = (parts[2] || '').trim();
    return { dateStr, event, windowDays, countdownText: null, daysRemaining: null };
  }
  if (item && typeof item === 'object' && (item.dateTimeRaw != null || item.date != null)) {
    const dateStr = normalizeDateTime(item.dateTimeRaw ?? item.date ?? '');
    const event = (item.event ?? '').trim();
    const countdownText = typeof item.countdownText === 'string' ? item.countdownText : null;
    const daysRemaining = typeof item.daysRemaining === 'number' ? item.daysRemaining : null;
    return { dateStr, event, windowDays, countdownText, daysRemaining };
  }
  return null;
}

export function processCountdowns(countdownsData, slidesConfigData, applyConfig) {
  if (!countdownsData || countdownsData.length === 0) return [];

  const entries = countdownsData.map(toCountdownEntry).filter(Boolean);

  // Backend sudah hantar countdownText & daysRemaining; guna bila ada, else fallback kira di frontend
  const active = entries.filter(({ dateStr, windowDays, countdownText, daysRemaining }) => {
    if (!dateStr) return false;
    const text = countdownText != null ? countdownText : getCountdown(dateStr);
    if (!text || text === 'LEWAT') return false;
    if (windowDays > 0) {
      const remaining = daysRemaining != null ? daysRemaining : getCountdownDays(dateStr);
      if (remaining > windowDays) return false;
    }
    return true;
  });

  if (active.length === 0) return [];

  const items = active.map(({ dateStr, event, countdownText }) => {
    const text = countdownText != null ? countdownText : getCountdown(dateStr);
    return { event, countdownText: text };
  });

  const template = applyConfig(slidesTemplate.countDown, 'countDown');

  return items.map((item, i) => {
    const slide = JSON.parse(JSON.stringify(template));
    const parent = slide.captions[0];
    if (parent && parent.children && parent.children.length >= 2) {
      const isLast = i === items.length - 1;
      if (i > 0) parent.transition = null;
      parent.transition2 = isLast ? 'CLIP|LR' : 'NO_CLIP_OUT';
      parent.children[0].content = item.event;
      parent.children[0].style = {
        ...parent.children[0].style,
        clip: 'auto',
      }
      parent.children[1].content = item.countdownText;
      if (i > 0) parent.children[0].transition = null;
      parent.children[0].transition2 = isLast ? 'CLIP|LR' : 'NO_CLIP_OUT';
    }
    slide.transitionType = i === 0 ? 'auto' : 'static';
    return slide;
  });
}
