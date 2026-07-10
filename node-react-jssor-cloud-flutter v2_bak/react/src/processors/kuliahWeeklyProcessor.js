/**
 * Process data kuliah mingguan ke slides dengan layout 2 kolom
 * Layout:
 * - Col 1 (Kiri): Kuliah Maghrib (6-7 kuliah)
 * - Col 2 (Kanan): Dibahagi 2 row
 *   - Row 1: Kuliah Subuh (≤3 kuliah)
 *   - Row 2: Kuliah Dhuha (≤4 kuliah)
 */
import { slidesTemplate } from '../config/sliderConfig';
import {
  buildKuliahWeeklyTwoColumnChildren,
  getWeeklyLayoutInfo,
  STYLE_PENCERAMAH_BASE,
  STYLE_DATE_BASE,
  STYLE_NOTE_STATUS,
  STYLE_CARD_CONTENT_WRAPPER
} from '../config/weeklyLayoutBuilder';
import {
  TYPE_LABELS,
  DAY_NAMES,
  getWeekCode,
  getDayCode,
  formatShortDate,
  calculateDateFromCodes
} from '../utils/kuliahHelpers';
import { top, getContainerSize, height, textSize } from '../utils/screenUtils';
import { createBoxLayer } from '../utils/boxLayerUtils';
import { escapeHtml } from './slideHelpers';

/** Bottom box untuk weekly (lebih kecil = height box lebih) */
const WEEKLY_BOX_BOTTOM = 200;
/** Kurangkan left/right supaya box extend lebih (lebih lebar) */
const WEEKLY_BOX_LEFT = 80;
const WEEKLY_BOX_RIGHT = 80;

const CATEGORY_ORDER = ['KULIAH MAGHRIB', 'KULIAH SUBUH', 'KULIAH DHUHA', 'KULIAH KHAS'];

/**
 * Bina HTML kandungan standard untuk satu kad kuliah weekly (Maghrib/Subuh/Dhuha).
 * Data sudah diproses backend (tiada batal replace); hanya papar penceramah + tarikh.
 */
function buildWeeklyCardContent(item, ctx) {
  const { currentDay, esc } = ctx;
  const arr = item.split('|');
  const weekCode = arr[0];
  const day = arr[1];
  const penceramah = (arr[3] || '').trim();
  const dayName = DAY_NAMES[day] || '';
  const calculatedDate = weekCode != null && day != null && String(weekCode).match(/^w[1-4]$/) && String(day).match(/^h[0-6]$/)
    ? calculateDateFromCodes(weekCode, day)
    : null;
  const shortDate = calculatedDate ? formatShortDate(calculatedDate) : '';
  const hariTarikh = dayName && shortDate ? `${dayName} | ${shortDate}` : '';
  const isActive = day === currentDay;
  const activeStyle = isActive ? 'color:#ff4444;' : '';
  const defaultPenceramahColor = !activeStyle ? 'color:#1a1a1a;' : '';
  const dateColor = isActive ? 'color:#ff4444;' : 'color:#555;';

  const penceramahHtml = `<div style="${STYLE_PENCERAMAH_BASE};${defaultPenceramahColor}${activeStyle}">${esc(penceramah.toUpperCase())}</div>`;
  const dateHtml = hariTarikh ? `<div style="${STYLE_DATE_BASE};${dateColor}">${esc(hariTarikh)}</div>` : '';
  return `<div style="${STYLE_CARD_CONTENT_WRAPPER}">${penceramahHtml}${dateHtml}</div>`;
}

export function processKuliahMingguan(kuliahMingguProcessed, imagesData, slidesConfigData, applyConfig) {
  const esc = escapeHtml;
  const safeData = kuliahMingguProcessed && Array.isArray(kuliahMingguProcessed) ? kuliahMingguProcessed : [];
  const currentDate = new Date();
  const currentDay = getDayCode(currentDate);

  let dataToDisplay = safeData;

  // Jika tiada data, paparkan mesej
  if (dataToDisplay.length === 0) {
    const kuliahTemplate = applyConfig(slidesTemplate.kuliahWeekly, 'kuliahWeekly');
    const kuliahSlide = JSON.parse(JSON.stringify(kuliahTemplate));
    const parent = kuliahSlide.captions[0];
    if (parent && parent.children && parent.children.length >= 2) {
      parent.children[0].content = 'JADUAL KULIAH MINGGU INI';
      const bodyMsg = parent.children[1];
      bodyMsg.content = 'Tiada Kuliah minggu ini...';
      bodyMsg.style = {
        ...bodyMsg.style,
        position: 'absolute',
        left: 0,
        right: 0,
        top: top(350),
        width: getContainerSize().width,
        height: height(300),
        textAlign: 'center',
        fontSize: Math.round(textSize(200)),
        color: "#fefa00",
        fontFamily: "'SairaCondensed', sans-serif",
        fontWeight: 'bold',
        lineHeight: Math.round(textSize(120)),
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      };
      parent.children = [parent.children[0], bodyMsg];
    }
    kuliahSlide.transitionType = 'auto';
    return [kuliahSlide];
  }

  // Sort data mengikut tarikh
  dataToDisplay = dataToDisplay
    .map((item) => {
      const arr = item.split('|');
      const calculatedDate = calculateDateFromCodes(arr[0], arr[1]);
      return { item, date: calculatedDate };
    })
    .sort((a, b) => a.date - b.date)
    .map((entry) => entry.item);

  // Group data mengikut kategori
  const groupedData = {};
  dataToDisplay.forEach((item) => {
    const arr = item.split('|');
    const type = arr[2];
    const typeLabel = TYPE_LABELS[type] || type.toUpperCase();
    if (!groupedData[typeLabel]) groupedData[typeLabel] = [];
    groupedData[typeLabel].push(item);
  });

  // Pad Kuliah Maghrib dengan dummy supaya sentiasa 7 slot
  const COL1_MAX_ITEMS = 7;
  if (!groupedData['KULIAH MAGHRIB']) groupedData['KULIAH MAGHRIB'] = [];
  while (groupedData['KULIAH MAGHRIB'].length < COL1_MAX_ITEMS) {
    groupedData['KULIAH MAGHRIB'].push('');
  }

  // Buat slide dengan layout 2 kolom
  const kuliahTemplate = applyConfig(slidesTemplate.kuliahWeekly, 'kuliahWeekly');
  const kuliahSlide = JSON.parse(JSON.stringify(kuliahTemplate));
  const parent = kuliahSlide.captions[0];

  if (parent) {
    // Set header
    if (parent.children && parent.children.length > 0) {
      parent.children[0].content = 'JADUAL KULIAH MINGGU INI';
    }
    
    // Remove header kategori (children[1]) kerana kita akan guna layout baru
    if (parent.children && parent.children.length > 1) {
      parent.children.splice(1, 1);
    }

    // Build layout 2 kolom (kandungan dalam box, box extend dengan left/right lebih kecil)
    const boxLayer = createBoxLayer({ bottom: WEEKLY_BOX_BOTTOM, left: WEEKLY_BOX_LEFT, right: WEEKLY_BOX_RIGHT });
    const layoutChildren = buildKuliahWeeklyTwoColumnChildren(groupedData, { boxBottom: WEEKLY_BOX_BOTTOM, boxLeft: WEEKLY_BOX_LEFT, boxRight: WEEKLY_BOX_RIGHT });
    const layoutInfo = getWeeklyLayoutInfo(groupedData);

    // Set children: header, boxLayer, cards
    parent.children = [parent.children[0], boxLayer, ...layoutChildren];

    // Fill content untuk Kuliah Maghrib (Col 1) - slot dummy papar "TIADA KULIAH"
    const cardCtx = { currentDay, esc };
    layoutInfo.maghrib.data.forEach((item, i) => {
      const arr = item.split('|');
      const childIndex = 1 + layoutInfo.maghrib.startIndex + layoutInfo.maghrib.labelOffset + i;
      const penceramah = (arr[3] || '').trim();
      // const isDummy = !penceramah;

      if(!penceramah) return;

      const cardEl = parent.children[childIndex];
      const contentEl = cardEl?.children?.[0] || cardEl;
      if (!contentEl) return;

      // if (isDummy) {
      //   const dummyStyle = 'color:#999;';
      //   contentEl.content = `<div style="font-size:40px;line-height:1.2;font-family:'SairaCondensed',sans-serif;font-weight:bold;${dummyStyle}">${esc('UST UZAIR ABD HANI ALBANJARI')}</div>`;
      //   return;
      // }
      contentEl.content = buildWeeklyCardContent(item, cardCtx);
    });

    // Fill content untuk Kuliah Subuh (Col 2 Row 1)
    layoutInfo.subuh.data.forEach((item, i) => {
      const penceramah = (item.split('|')[3] || '').trim();
      if (!penceramah) return;
      const childIndex = 1 + layoutInfo.subuh.startIndex + layoutInfo.subuh.labelOffset + i;
      const cardEl = parent.children[childIndex];
      const contentEl = cardEl?.children?.[0] || cardEl;
      if (contentEl) contentEl.content = buildWeeklyCardContent(item, cardCtx);
    });

    // Fill content untuk Kuliah Dhuha (Col 2 Row 2)
    layoutInfo.dhuha.data.forEach((item, i) => {
      const penceramah = (item.split('|')[3] || '').trim();
      if (!penceramah) return;
      const childIndex = 1 + layoutInfo.dhuha.startIndex + layoutInfo.dhuha.labelOffset + i;
      const cardEl = parent.children[childIndex];
      const contentEl = cardEl?.children?.[0] || cardEl;
      if (contentEl) contentEl.content = buildWeeklyCardContent(item, cardCtx);
    });
  }

  kuliahSlide.transitionType = 'auto';
  return [kuliahSlide];
}
