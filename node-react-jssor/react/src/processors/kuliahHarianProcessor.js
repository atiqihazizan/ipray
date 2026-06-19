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
  getDayCode
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

  const digitSize = Math.round(textSize(100));
  const stackSize = Math.round(textSize(38));
  const dayNameSize = Math.round(textSize(100));
  const sepHeight = Math.round(textSize(90));
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
    <div style="width:2px;height:${sepHeight}px;background:#fff;flex-shrink:0;"></div>
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
    if (isReplacement) {
      const replacementText = (item.replacementText || '').trim();
      const kuliahTemplate = applyConfig(slidesTemplate.kuliahHari, 'kuliahHari');
      const kuliahSlide = JSON.parse(JSON.stringify(kuliahTemplate));
      const parent = kuliahSlide.captions[0];
      if (parent && parent.children && parent.children.length >= 2) {
        if (parent.children[0]) parent.children[0].content = 'PERISTIWA HARI INI';
        const isLastCategory = categoryIndex === categoryKeys.length - 1;
        // if (categoryIndex > 0) parent.transition = null;
        // parent.transition2 = isLastCategory ? 'CLIP|LR' : 'NO_CLIP_OUT';
        const BOX_BOTTOM = DEFAULT_BOX_BOTTOM - 80;
        const BOX_PADDING = 20;
        const INNER_LEFT_PX = BOX_LEFT + BOX_PADDING;
        // const boxLayer = createBoxLayer({ bottom: BOX_BOTTOM });
        // boxLayer.transition = categoryIndex > 0 ? null : 'FADE';
        // boxLayer.transition2 = isLastCategory ? 'FADE' : 'NO_CLIP_OUT';
        const replacementChild = {
          type: 'div',
          transition: 'CLIP|LR',
          duration: 2000,
          delay: 0,
          content: replacementText.toUpperCase(),
          style: {
            position: 'absolute',
            left: left(INNER_LEFT_PX),
            right: right(BOX_RIGHT + BOX_PADDING),
            top: top(BOX_TOP + 28),
            bottom: bottom(BOX_BOTTOM + 20),
            textAlign: 'center',
            fontSize: Math.round(textSize(120)),
            fontFamily: "'SairaCondensed',sans-serif",
            color: '#000000',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0
          }
        };
        // parent.children[0].transition = categoryIndex > 0 ? null : 'CLIP|LR';
        // parent.children[0].transition2 = isLastCategory ? 'CLIP|LR' : 'NO_CLIP_OUT';
        // parent.children[0].duration = 2000;
        // parent.children[0].delay = 0;
        // parent.children = [boxLayer, parent.children[0], replacementChild];
        parent.children = [replacementChild];
      }
      applyKuliahTypeBackground(kuliahSlide, item.type);
      // kuliahSlide.transitionType = categoryIndex === 0 ? 'auto' : 'static';
      kuliahHariSlides.push(kuliahSlide);
      return;
    }
    const arr = item.split('|');
    const penceramah = (arr[3] || '').trim();
    const imageCode = (arr[4] || '').trim();
    const kitab = (arr[5] || '').trim();
    if (!penceramah) return;

    const kuliahTemplate = applyConfig(slidesTemplate.kuliahHari, 'kuliahHari');
    const kuliahSlide = JSON.parse(JSON.stringify(kuliahTemplate));
    const parent = kuliahSlide.captions[0];

    if (parent && parent.children && parent.children.length >= 2) {
      // const isLastCategory = categoryIndex === categoryKeys.length - 1;
      // if (categoryIndex > 0) parent.transition = null;
      // parent.transition2 = isLastCategory ? 'CLIP|LR' : 'NO_CLIP_OUT';

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
      const KITAB_LEFT_PX = 274;
      const KITAB_TOP_PX = 605;
      const KITAB_WIDTH_PX = 779;
      const TARIKH_HARI_TOP_PX = 760;

      // const boxLayer = createBoxLayer({ bottom: BOX_BOTTOM });

      // boxLayer.transition = categoryIndex > 0 ? null : 'FADE';
      // boxLayer.transition2 = isLastCategory ? 'FADE' : 'NO_CLIP_OUT';

      const imagePath = resolveImagePath(imageCode, imagesData);

      // parent.children[0].transition = categoryIndex > 0 ? null : 'CLIP|LR';
      // parent.children[0].transition2 = isLastCategory ? 'CLIP|LR' : 'NO_CLIP_OUT';
      parent.children[0].duration = 2000;
      parent.children[0].delay = 0;

      // const typeChild = {
      //   type: 'div',
      //   transition: 'CLIP|LR',
      //   duration: 2000,
      //   delay: 0,
      //   content: categoryTitle,
      //   style: {
      //     position: 'absolute',
      //     left: left(INNER_LEFT_PX),
      //     right: right(BOX_RIGHT + BOX_PADDING),
      //     top: top(BOX_TOP + 28),
      //     textAlign: 'center',
      //     fontSize: Math.round(textSize(72)),
      //     fontFamily: "'SairaCondensed',sans-serif",
      //     color: '#fff',
      //     lineHeight: Math.round(textSize(78)),
      //     color: '#ffdb00',
      //     fontWeight: 'bold',
      //     backgroundColor: 'black',
      //     height: height(79)
      //   }
      // };
      const penceramahChild = {
        type: 'div',
        transition: 'CLIP|LR',
        duration: 2000,
        delay: 0,
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
          margin: '8px 0'
        }
      };
      const kitabChild = {
        type: 'div',
        transition: 'CLIP|LR',
        duration: 2000,
        delay: 0,
        content: kitab,
        style: {
          position: 'absolute',
          left: left(KITAB_LEFT_PX),
          top: top(KITAB_TOP_PX),
          width: width(KITAB_WIDTH_PX),
          textAlign: 'center',
          fontSize: Math.round(textSize(68)),
          fontFamily: "'SairaCondensed',sans-serif",
          color: '#000000',
          fontWeight: 'bold',
          textWrapStyle: 'balance',
          lineHeight: Math.round(textSize(70)),
          margin: '8px 0'
        }
      };

      const tarikhHariChild = {
        type: 'div',
        transition: 'CLIP|LR',
        duration: 2000,
        delay: 0,
        content: buildTarikhHariHtml(),
        style: {
          position: 'absolute',
          left: left(KITAB_LEFT_PX),
          top: top(TARIKH_HARI_TOP_PX),
          width: width(KITAB_WIDTH_PX),
          textAlign: 'center',
          margin: 0
        }
      };

      const imageChild = {
        type: 'img',
        transition: 'FADE',
        duration: 1000,
        delay: 0,
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

      // parent.children = [boxLayer, parent.children[0], typeChild, penceramahChild, kitabChild, imageChild];
      parent.children = [ penceramahChild, kitabChild, tarikhHariChild, imageChild];
    }

    applyKuliahTypeBackground(kuliahSlide, arr[2]);
    kuliahSlide.transitionType = categoryIndex === 0 ? 'auto' : 'static';
    kuliahHariSlides.push(kuliahSlide);
  });
  return kuliahHariSlides;
}
