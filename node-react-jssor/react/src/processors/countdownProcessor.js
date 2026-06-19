/**
 * Process data countdown (countdowns.txt) ke slides.
 * Backend hantar countdown enriched (display, layout, hijri, masihi, dualYear, background).
 */
import { slidesTemplate } from '../config/sliderConfig';
import { top, bottom } from '../utils/screenUtils';
import { getCountdown, getCountdownDays } from '../utils/dateFormatter';

function normalizeDateTime(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const s = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 00:00`;
  return s;
}

function displayTextForToken(token, item) {
  switch (token) {
    case 'event':
      return (item.event || '').trim();
    case 'dateY':
      return (item.dualYear || '').trim();
    case 'dateH':
      return (item.hijri && item.hijri.formatted) ? item.hijri.formatted : '';
    case 'dateM':
      return (item.masihi && item.masihi.formatted) ? item.masihi.formatted : '';
    case 'countdown':
      return (item.countdownText || '').trim();
    default:
      return '';
  }
}

function buildCaptionChildren(item, isLast) {
  const display = Array.isArray(item.display) && item.display.length
    ? item.display
    : ['event', 'countdown'];
  const layout = item.layout || { eventTop: 30, countdownBottom: 220 };
  const contentTokens = display.filter((t) => t !== 'countdown');
  const showCountdown = display.includes('countdown');
  const children = [];

  contentTokens.forEach((token, idx) => {
    const text = displayTextForToken(token, item);
    if (!text) return;
    const isDateY = token === 'dateY';
    const isDateLine = token === 'dateH' || token === 'dateM';
    children.push({
      type: 'div',
      // transition: idx === 0 ? 'CLIP|LR' : null,
      transition: 'auto',
      duration: 1000,
      content: text,
      style: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: `${top(layout.eventTop + idx * (isDateY ? 8 : 10))}%`,
        width: '100%',
        textAlign: 'center',
        fontSize: isDateY ? 100 : (isDateLine ? 72 : 200),
        color: '#FFFFFF',
        fontFamily: isDateY || isDateLine ? "'Roboto', sans-serif" : "'SairaCondensed', sans-serif",
        fontWeight: 'bold',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // clip: 'auto',
      },
    });
  });

  if (showCountdown) {
    const countdownText = displayTextForToken('countdown', item);
    if (countdownText) {
      children.push({
        type: 'div',
        // transition: 'CLIP|LR',
        transition: 'auto',
        duration: 1000,
        content: countdownText,
        style: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: bottom(layout.countdownBottom),
          width: '100%',
          height: 180,
          textAlign: 'center',
          fontSize: 100,
          color: 'rgb(245 206 28)',
          // textShadow: '0 4px 12px rgba(0,0,0,0.9)',
          // textShadow: [
          //   '0 0 4px rgba(0,0,0,1)',
          //   '0 0 12px rgba(0,0,0,0.8)',
          //   '2px 2px 4px rgba(0,0,0,1)',
          // ].join(', '),
          textShadow: '0 0 4px #000, 0 0 12px rgba(0,0,0,0.8), 2px 2px 4px #000',
          fontWeight: 'bold',
          fontFamily: 'system-ui',
          lineHeight: 180,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      });
    }
  }

  // if (children.length > 0) {
  //   children[0].transition = children[0].transition || 'CLIP|LR';
  //   if (isLast) {
  //     children[0].transition2 = 'CLIP|LR';
  //   } else {
  //     children[0].transition2 = 'NO_CLIP_OUT';
  //   }
  // }

  return children;
}

export function processCountdowns(countdownsData, slidesConfigData, applyConfig, imagesData = {}) {
  if (!countdownsData || countdownsData.length === 0) return [];

  const active = countdownsData.filter((item) => {
    const dateStr = normalizeDateTime(item.dateTimeRaw ?? item.date ?? '');
    if (!dateStr && !item.countdownText) return false;
    const windowDays = typeof item.windowDays === 'number' ? item.windowDays : parseInt(item.windowDays, 10) || 0;
    const text = item.countdownText != null ? item.countdownText : getCountdown(dateStr);
    if (text === 'LEWAT') return false;
    if (windowDays > 0) {
      const remaining = item.daysRemaining != null ? item.daysRemaining : getCountdownDays(dateStr);
      if (remaining > windowDays) return false;
    }
    return Boolean(text);
  });

  if (active.length === 0) return [];

  const template = applyConfig(slidesTemplate.countDown, 'countDown');

  return active.map((item, i) => {
    const slide = JSON.parse(JSON.stringify(template));
    const countdownText = item.countdownText != null
      ? item.countdownText
      : getCountdown(normalizeDateTime(item.dateTimeRaw ?? ''));
    const enrichedItem = { ...item, countdownText };

    if (item.background) {
      let imagePath = imagesData[item.background] || item.background;
      if (imagePath && !imagePath.startsWith('/')) imagePath = `/${imagePath}`;
      if (imagePath) {
        slide.image = { src: imagePath, alt: item.event || 'Countdown' };
      }
    }

    const parent = slide.captions[0];
    if (parent) {
      const isLast = i === active.length - 1;
      if (i > 0) parent.transition = null;
      parent.transition2 = isLast ? 'CLIP|LR' : 'NO_CLIP_OUT';
      parent.children = buildCaptionChildren(enrichedItem, isLast);
    }
    slide.transitionType = i === 0 ? 'auto' : 'static';
    return slide;
  });
}
