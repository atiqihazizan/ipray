/**
 * Process data kuliah hari ini ke slides.
 * Input: kuliahHariProcessed (backend sudah filter hari ini & buang replace=1).
 * kuliahHariReplacements: gantian untuk hari ini sahaja (contoh Majlis Bacaan Yassin) — dipapar tanpa imej.
 * Satu slide per kategori (Subuh, Dhuha, Maghrib, Khas) yang ada data hari ini.
 */
import { slidesTemplate } from '../config/sliderConfig';
import {
  TYPE_LABELS,
  resolveImagePath,
  getCenteredImageStyle,
  applyKuliahTypeBackground,
  DAY_NAMES,
  getDayCode,
  TYPE_COLORS,
  TYPE_ORDER,
  hexToRgba
} from '../utils/kuliahHelpers';
import { top, left, right, bottom, getContainerSize, width, height, textSize } from '../utils/screenUtils';
import { createBoxLayer, BOX_LEFT, BOX_TOP, BOX_RIGHT, DEFAULT_BOX_BOTTOM } from '../utils/boxLayerUtils';

const CATEGORY_ORDER = ['KULIAH SUBUH', 'KULIAH DHUHA', 'KULIAH MAGHRIB', 'KULIAH KHAS'];

const MASIHI_MONTHS_SHORT = ['JAN', 'FEB', 'MAC', 'APR', 'MEI', 'JUN', 'JUL', 'OGO', 'SEP', 'OKT', 'NOV', 'DIS'];

function buildTarikhHariHtml() {
  const now = new Date();
  const day = now.getDate();
  const month = MASIHI_MONTHS_SHORT[now.getMonth()];
  const year = now.getFullYear();
  const dayName = DAY_NAMES[getDayCode(now)] || '';

  const digitSize = Math.round(textSize(145));
  const stackSize = Math.round(textSize(58));
  const dayNameSize = Math.round(textSize(150));
  const sepHeight = Math.round(textSize(110));
  const gap = Math.round(textSize(16));
  const innerGap = Math.round(textSize(10));

  return `<div style="display:flex;align-items:center;justify-content:center;gap:${gap}px;width:100%;">
    <div style="display:flex;align-items:center;gap:${innerGap}px;">
      <div style="font-size:${digitSize}px;line-height:1;font-weight:bold;color:#fff;font-family:'SairaCondensed',sans-serif;">${day}</div>
      <div style="display:flex;flex-direction:column;font-size:${stackSize}px;line-height:1.1;font-weight:bold;color:#fff;font-family:'SairaCondensed',sans-serif;">
        <div>${month}</div>
        <div>${year}</div>
      </div>
    </div>
    <div style="width:4px;height:${sepHeight}px;background:#fff;flex-shrink:0;"></div>
    <div style="font-size:${dayNameSize}px;line-height:1;font-weight:bold;color:#fff;font-family:'SairaCondensed',sans-serif;">${dayName}</div>
  </div>`;
}

export function processKuliahHarian(kuliahHariProcessed, imagesData, slidesConfigData, applyConfig, kuliahHariReplacements = []) {
  const safeData = kuliahHariProcessed && Array.isArray(kuliahHariProcessed) ? kuliahHariProcessed : [];
  const replacements = Array.isArray(kuliahHariReplacements) ? kuliahHariReplacements : [];

  const groupedData = {};
  replacements.filter((r) => !r.displaySkip).forEach((r) => {
    const typeLabel = TYPE_LABELS[r.type] || (r.type || '').toUpperCase();
    if (!groupedData[typeLabel]) groupedData[typeLabel] = [];
    groupedData[typeLabel].push({ replacementText: r.replacementText || '', type: r.type });
  });
  safeData.forEach((item) => {
    const arr = item.split('|');
    const type = arr[2];
    const typeLabel = TYPE_LABELS[type] || type.toUpperCase();
    if (!groupedData[typeLabel]) groupedData[typeLabel] = [];
    groupedData[typeLabel].push(item);
  });

  const categoryKeys = CATEGORY_ORDER.filter((cat) => groupedData[cat] && groupedData[cat].length > 0);

  if (categoryKeys.length === 0) {
    const kuliahTemplate = applyConfig(slidesTemplate.kuliahHari, 'kuliahHari');
    const kuliahHariSlide = JSON.parse(JSON.stringify(kuliahTemplate));
    const parent = kuliahHariSlide.captions[0];
    if (parent && parent.children && parent.children.length >= 1) {
      parent.children[0].content = 'KULIAH HARI INI';
      const bodyMsg = {
        type: 'div',
        transition: 'auto',
        duration: 1000,
        content: 'Tiada kuliah hari ini...',
        style: {
          position: 'absolute',
          left: 0,
          right: 0,
          top: top(350),
          width: getContainerSize().width,
          height: height(300),
          textAlign: 'center',
          fontSize: Math.round(textSize(200)),
          color: "#ffff00",
          fontFamily: "'SairaCondensed', sans-serif",
          fontWeight: 'bold',
          lineHeight: Math.round(textSize(120)),
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      };
      parent.children = [parent.children[0], bodyMsg];
    }
    kuliahHariSlide.transitionType = 'auto';
    return [kuliahHariSlide];
  }

  const kuliahHariSlides = [];
  categoryKeys.forEach((categoryTitle, categoryIndex) => {
    const categoryData = groupedData[categoryTitle];
    const item = categoryData[0];
    const isReplacement = item && typeof item === 'object' && item.replacementText != null;
    if (isReplacement) return;
    if (typeof item !== 'string') return;
    const arr = item.split('|');
    const penceramah = (arr[3] || '').trim();
    const imageCode = (arr[4] || '').trim();
    const kitab = (arr[5] || '').trim();
    if (!penceramah) return;

    const kuliahTemplate = applyConfig(slidesTemplate.kuliahHari, 'kuliahHari');
    const kuliahSlide = JSON.parse(JSON.stringify(kuliahTemplate));
    const parent = kuliahSlide.captions[0];

    if (parent && parent.children && parent.children.length >= 2) {
      const BOX_BOTTOM = DEFAULT_BOX_BOTTOM - 80;
      const BOX_PADDING = 20;
      const INNER_LEFT_PX = BOX_LEFT + BOX_PADDING;
      const IMAGE_WIDTH = 480;
      const IMAGE_HEIGHT = 612;
      const IMAGE_GAP = 40;
      const IMAGE_PADDING_RIGHT = 20;
      const IMAGE_RIGHT_OFFSET_PX = BOX_RIGHT + 10 + IMAGE_PADDING_RIGHT;
      const IMAGE_LEFT_PX = 1263;
      const IMAGE_TOP_PX = 258;
      const PENCERAMAH_LEFT_PX = 1216;
      const PENCERAMAH_TOP_PX = 877;
      const PENCERAMAH_WIDTH_PX = 583;
      const KITAB_LEFT_PX = 244;
      // const KITAB_TOP_PX = 560;
      const KITAB_TOP_PX = 260;
      const KITAB_WIDTH_PX = 879;
      const TARIKH_HARI_TOP_PX = 760;
      const imagePath = resolveImagePath(imageCode, imagesData);

      parent.children[0].duration = 2000;
      parent.children[0].delay = 0;

      const penceramahChild = {
        type: 'div',
        // transition: 'CLIP|LR',
        // duration: 2000,
        // delay: 0,
        content: penceramah.toUpperCase(),
        style: {
          position: 'absolute',
          left: left(PENCERAMAH_LEFT_PX),
          top: top(PENCERAMAH_TOP_PX),
          width: width(PENCERAMAH_WIDTH_PX),
          textAlign: 'center',
          fontSize: Math.round(textSize(53)),
          fontFamily: "'SairaCondensed',sans-serif",
          color: '#000000',
          fontWeight: 'bold',
          height: height(150),
          overflow: 'hidden',
          lineHeight: Math.round(textSize(70)),
          margin: '8px 0',
          background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.92) 18%, rgba(255,255,255,0.92) 82%, transparent 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }
      };

      const buildTitleKuliah = () => {
        const parts = categoryTitle.split(' ');
        const raw = parts[0] || '';
        const w1 = parts[1] || '';
        const w0 = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        const ts = (v) => Math.round(textSize(v));
        return `<span style="display:block;color:white;line-height:0.7;font-style:italic;font-family:'KaushanScript',cursive;font-size:${ts(120)}px;text-shadow:2px 2px 4px rgba(0,0,0,0.6),4px 4px 10px rgba(0,0,0,0.3);">${w0}</span>
        <span style="display:block;font-size:${ts(128)}pt;font-family:'FuturaPrimer';font-style:italic;font-weight:900;line-height:1;color:#ffbd59;text-shadow:4px 4px 0px rgba(0,0,0,0.4),6px 6px 14px rgba(0,0,0,0.35);">${w1}</span>`;
      }
      
      const typeChild = {
        type: 'div',
        // transition: 'CLIP|LR',
        // duration: 2000,
        // delay: 0,
        content: buildTitleKuliah(categoryTitle),
        style: {
          position: 'relative',
          width: '100%',
          textAlign: 'left',
          // fontSize: Math.round(textSize(68)),
          color: '#000000',
          fontWeight: 'bold',
          textWrapStyle: 'balance',
          marginBottom: '20px',
        }
      };

      const kitabChild = {
        type: 'div',
        // transition: 'CLIP|LR',
        // duration: 2000,
        // delay: 0,
        content: kitab,
        style: {
          position: 'relative',
          width: '100%',
          textAlign: 'center',
          fontSize: Math.round(textSize(68)),
          fontFamily: "'SairaCondensed',sans-serif",
          color: '#000000',
          fontWeight: 'bold',
          textWrapStyle: 'balance',
          lineHeight: Math.round(textSize(70)),
          border: `${Math.round(textSize(4))}px solid #d4af37`,
          borderRadius: `${Math.round(textSize(80))}px / ${Math.round(textSize(100))}px`,
          padding: `${Math.round(textSize(57))}px ${Math.round(textSize(60))}px`,
          backgroundColor: 'white',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        }
      };

      const tarikhHariChild = {
        type: 'div',
        // transition: 'CLIP|LR',
        // duration: 2000,
        // delay: 0,
        content: buildTarikhHariHtml(),
        style: {
          position: 'relative',
          width: '100%',
          textAlign: 'center',
          margin: 0
        }
      };

      const kitabWrapperChild = {
        type: 'div',
        // transition: 'CLIP|LR',
        // duration: 2000,
        // delay: 0,
        style: {
          position: 'absolute',
          left: left(KITAB_LEFT_PX),
          top: top(KITAB_TOP_PX),
          width: width(KITAB_WIDTH_PX),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: Math.round(textSize(20)),
        },
        children: [typeChild, kitabChild, tarikhHariChild]
      };

      const imageChild = {
        type: 'img',
        // transition: 'auto',
        // duration: 1000,
        // delay: 0,
        content: imagePath,
        style: {
          position: 'absolute',
          left: left(IMAGE_LEFT_PX),
          top: top(IMAGE_TOP_PX),
          width: width(IMAGE_WIDTH),
          height: height(IMAGE_HEIGHT),
          objectFit: 'fill',
          borderRadius: 10,
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 4px 8px'
        }
      };
      const imageStyle = getCenteredImageStyle(imagePath, imageChild.style);
      imageChild.style = { ...imageStyle, top: top(IMAGE_TOP_PX) };
      imageChild.content = imagePath;

      const { width: sw, height: sh } = getContainerSize();
      const frameChild = {
        type: 'img',
        // transition: 'FADE',
        // duration: 1000,
        // delay: 0,
        content: '/img/frame.svg',
        style: {
          position: 'absolute',
          left: 0,
          top: 0,
          width: sw,
          height: sh,
          objectFit: 'cover',

        }
      };

      parent.children = [frameChild, penceramahChild, kitabWrapperChild, imageChild];
    }

    // applyKuliahTypeBackground(kuliahSlide, arr[2]);
    kuliahSlide.transitionType = categoryIndex === 0 ? 'auto' : 'static';
    const type = arr[2] || '';
    if (TYPE_COLORS[type] && kuliahSlide.captions[0]) {
      kuliahSlide.captions[0].style.backgroundColor = hexToRgba(TYPE_COLORS[type], 0.80);
      // kuliahSlide.captions[0].style.backgroundImage = 'url(/img/frame.svg)';
      // kuliahSlide.captions[0].style.backgroundSize = '100% 100%';
      // kuliahSlide.captions[0].style.backgroundRepeat = 'no-repeat';
    }
    kuliahHariSlides.push(kuliahSlide);
  });
  return kuliahHariSlides;
}
