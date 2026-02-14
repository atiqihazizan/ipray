// ============================================================================
// WEEKLY LAYOUT BUILDER - 2 Column Layout
// ============================================================================
// Layout Structure:
// - Col 1 (Kiri): Kuliah Maghrib (6-7 kuliah)
// - Col 2 (Kanan): Dibahagi 2 row - HEIGHT DINAMIK mengikut bilangan kuliah
//   - Row 1: Kuliah Subuh (height kembang ikut bilangan kuliah)
//   - Row 2: Kuliah Dhuha (height kembang ikut bilangan kuliah)
// ============================================================================

import { getRatio, top, left, right, width, height } from '../utils/screenUtils';
import { BOX_LEFT, BOX_TOP, BOX_RIGHT, BOX_PADDING } from '../utils/boxLayerUtils';

// ----------------------------------------------------------------------------
// STANDARD STYLE - Card, Penceramah, Date, Note/Status (guna di builder + processor)
// ----------------------------------------------------------------------------

/** Style objek untuk wrapper dalaman setiap kad (Col1 & Col2) */
export const CARD_INNER_STYLE = {
  position: 'absolute',
  left: 4,
  top: 4,
  right: 4,
  bottom: 4,
  padding: 10,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 5,
  // backgroundColor: 'rgba(255, 255, 255, 0.14)',
  // borderRadius: 8,
  // boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

/** Font size standard untuk kandungan kad */
export const CARD_FONT_PENCERAMAH = '55px';
export const CARD_FONT_DATE = '40px';
export const CARD_FONT_STATUS = '22px';

/** Style string asas penceramah (tambah color dalam processor: default/batal/active) */
export const STYLE_PENCERAMAH_BASE = `font-size:${CARD_FONT_PENCERAMAH};line-height:1.2;font-family:'SairaCondensed',sans-serif;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`;

/** Style string asas tarikh (tambah color dalam processor: active / #555) */
export const STYLE_DATE_BASE = `font-size:${CARD_FONT_DATE};line-height:1.2;padding-top:10px;font-family:'SairaCondensed',sans-serif;font-weight:bold`;

/** Style string penuh untuk note/status (batal) */
export const STYLE_NOTE_STATUS = `font-size:${CARD_FONT_STATUS};color:#ff0000;font-weight:bold;margin-top:5px`;

/** Style string untuk flex container kandungan kad (penceramah | status | tarikh) */
export const STYLE_CARD_CONTENT_WRAPPER = 'display:flex;justify-content:space-between';

/** Nilai layout untuk label section (guna dalam kiraan dan style) */
export const LABEL_HEIGHT = 62;
export const LABEL_PADDING_V = 10;
export const LABEL_BG = 'rgba(0, 0, 0, 0.65)';
export const LABEL_FONT_SIZE = 42;
export const LABEL_COLOR = 'rgb(245, 206, 28)';

/** Style seragam untuk label section (KULIAH MAGHRIB, SUBUH, DHUHA) - override left, top, width ikut posisi */
export const LABEL_SECTION_STYLE = {
  position: 'absolute',
  height: LABEL_HEIGHT,
  paddingTop: LABEL_PADDING_V,
  paddingBottom: LABEL_PADDING_V,
  boxSizing: 'border-box',
  backgroundColor: LABEL_BG,
  fontSize: LABEL_FONT_SIZE,
  fontFamily: "'SairaCondensed', sans-serif",
  fontWeight: 'bold',
  color: LABEL_COLOR,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  letterSpacing: '2px'
};

/** Base style untuk wrapper kad (position + dimensi override left, top, width, height) */
const CARD_WRAPPER_BASE_STYLE = {
  position: 'absolute'
};

// ----------------------------------------------------------------------------

/** Base 1920x1080 untuk kira content area dalam box */
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

/**
 * Build children untuk kuliah mingguan dengan layout 2 kolom (kandungan dalam boxLayer).
 * @param {Object} groupedData - Data kuliah yang telah dikumpulkan mengikut kategori
 * @param {Object} [options]
 * @param {number} [options.boxBottom] - Bottom box (px). Default 200 = height box lebih. Wajib untuk sesuaikan content dalam box.
 * @returns {Array} Array of children elements untuk kuliah mingguan
 */
export function buildKuliahWeeklyTwoColumnChildren(groupedData, options = {}) {
  const children = [];
  const boxBottom = options.boxBottom ?? 200;

  // Content area dalam box (base 1920x1080)
  // const contentLeftBase = BOX_LEFT + BOX_PADDING;
  const contentLeftBase = BOX_LEFT - 20;
  const contentTopBase = BOX_TOP + BOX_PADDING;
  const contentRightBase = BASE_WIDTH - BOX_RIGHT + 20;
  const contentBottomBase = BASE_HEIGHT - boxBottom - BOX_PADDING;
  const contentWidthBase = contentRightBase - contentLeftBase;
  const contentHeightBase = contentBottomBase - contentTopBase;

  const ratio = getRatio().heightRatio;
  const START_LEFT = left(contentLeftBase);
  const baseTop = top(contentTopBase);
  const contentWidth = width(contentWidthBase);

  // Column widths (dalam content area)
  const COL_GAP = 40;
  const COL1_WIDTH = (contentWidth - COL_GAP) * 0.5;
  const COL2_WIDTH = (contentWidth - COL_GAP) * 0.5;

  // Saiz kad seragam untuk Col1 dan Col2
  const COL1_MAX_ITEMS = 8;
  const COL1_BASE_AVAILABLE_HEIGHT = contentHeightBase;
  const CARD_GAP = 0;
  const CARD_HEIGHT = (COL1_BASE_AVAILABLE_HEIGHT - (COL1_MAX_ITEMS - 1) * CARD_GAP) / COL1_MAX_ITEMS;
  const COL1_CARD_HEIGHT = CARD_HEIGHT;
  const COL1_CARD_GAP = CARD_GAP;
  const LABEL_GAP = 10;
  const ROW_SECTION_GAP = 28; // Gap antara Row1 (Subuh) dan Row2 (Dhuha) dalam col2
  const TRANSITION_IN = 'CLIP|LR'; // Transition masuk serentak (semua fade in bersama)
  const DELAY_IN = 100; // Delay 0 supaya semua masuk serentak

  // Column 1 (Kiri): Kuliah Maghrib - guna COL1_* supaya 7 kuliah muat dalam skrin
  const maghribData = groupedData['KULIAH MAGHRIB'] || [];
  const maghribCount = Math.min(maghribData.length, COL1_MAX_ITEMS);
  
  // Tajuk kecil bermula dari top boxLayer (content area)
  const labelAreaTop = baseTop;
  const cardsStartTop = baseTop + (LABEL_HEIGHT + LABEL_GAP) * ratio;

  // Label untuk Kuliah Maghrib
  if (maghribCount > 0) {
    children.push({
      type: 'div',
      transition: TRANSITION_IN,
      delay: DELAY_IN,
      content: 'KULIAH MAGHRIB',
      style: { ...LABEL_SECTION_STYLE, left: START_LEFT, top: labelAreaTop, width: COL1_WIDTH }
    });
  }
  
  for (let i = 0; i < maghribCount; i++) {
    const topOffset = cardsStartTop + (i * (CARD_HEIGHT + CARD_GAP) * ratio);
    children.push({
      type: 'div',
      transition: TRANSITION_IN,
      delay: DELAY_IN,
      style: { ...CARD_WRAPPER_BASE_STYLE, left: START_LEFT, top: topOffset, width: COL1_WIDTH, height: COL1_CARD_HEIGHT },
      children: [{ type: 'div', style: { ...CARD_INNER_STYLE }, content: '' }]
    });
  }
  
  // Column 2 (Kanan) - Row 1: Kuliah Subuh. Max 7 slot untuk Subuh+Dhuha supaya muat dalam ruang.
  const subuhData = groupedData['KULIAH SUBUH'] || [];
  const dhuhaDataRaw = groupedData['KULIAH DHUHA'] || [];
  const COL2_MAX_SLOTS = 7; // jumlah max item Subuh + Dhuha
  const subuhCount = Math.min(subuhData.length, 4); // max 4 Subuh supaya ada ruang Dhuha
  const dhuhaCount = Math.min(dhuhaDataRaw.length, COL2_MAX_SLOTS - subuhCount); // baki slot untuk Dhuha
  
  const col2Left = START_LEFT + COL1_WIDTH + COL_GAP;
  
  // Label untuk Kuliah Subuh (tajuk kecil dari top boxLayer)
  if (subuhCount > 0) {
    children.push({
      type: 'div',
      transition: TRANSITION_IN,
      delay: DELAY_IN,
      content: 'KULIAH SUBUH',
      style: { ...LABEL_SECTION_STYLE, left: col2Left, top: labelAreaTop, width: COL2_WIDTH }
    });
  }
  
  for (let i = 0; i < subuhCount; i++) {
    const topOffset = cardsStartTop + (i * (CARD_HEIGHT + CARD_GAP) * ratio);
    children.push({
      type: 'div',
      transition: TRANSITION_IN,
      delay: DELAY_IN,
      style: { ...CARD_WRAPPER_BASE_STYLE, left: col2Left, top: topOffset, width: COL2_WIDTH, height: CARD_HEIGHT },
      children: [{ type: 'div', style: { ...CARD_INNER_STYLE }, content: '' }]
    });
  }
  
  // Column 2 (Kanan) - Row 2: Kuliah Dhuha (dhuhaCount sudah dikira di atas)
  const dhuhaData = dhuhaDataRaw;
  
  // Bawah kad Subuh terakhir (kad bermula dari cardsStartTop)
  const subuhLastCardBottom = subuhCount > 0
    ? cardsStartTop + (subuhCount - 1) * (CARD_HEIGHT + CARD_GAP) * ratio + CARD_HEIGHT
    : baseTop;
  const gapAfterSubuh = (LABEL_HEIGHT + LABEL_GAP + ROW_SECTION_GAP) * ratio; // ruang: gap + label + jarak sebelum kad
  const dhuhaStartTop = subuhLastCardBottom + gapAfterSubuh;
  
  // Label untuk Kuliah Dhuha - diletakkan tepat di bawah kad Subuh (selepas ROW_SECTION_GAP)
  if (dhuhaCount > 0) {
    children.push({
      type: 'div',
      transition: TRANSITION_IN,
      delay: DELAY_IN,
      content: 'KULIAH DHUHA',
      style: { ...LABEL_SECTION_STYLE, left: col2Left, top: subuhLastCardBottom + ROW_SECTION_GAP * ratio, width: COL2_WIDTH }
    });
  }
  
  for (let i = 0; i < dhuhaCount; i++) {
    const topOffset = dhuhaStartTop + (i * (CARD_HEIGHT + CARD_GAP) * ratio);
    children.push({
      type: 'div',
      transition: TRANSITION_IN,
      delay: DELAY_IN,
      style: { ...CARD_WRAPPER_BASE_STYLE, left: col2Left, top: topOffset, width: COL2_WIDTH, height: CARD_HEIGHT },
      children: [{ type: 'div', style: { ...CARD_INNER_STYLE }, content: '' }]
    });
  }

  return children;
}

/**
 * Get layout info untuk kuliah mingguan
 * @param {Object} groupedData - Data kuliah yang telah dikumpulkan mengikut kategori
 * @returns {Object} Layout info dengan indices untuk setiap kategori
 */
export function getWeeklyLayoutInfo(groupedData) {
  const maghribData = groupedData['KULIAH MAGHRIB'] || [];
  const subuhData = groupedData['KULIAH SUBUH'] || [];
  const dhuhaData = groupedData['KULIAH DHUHA'] || [];
  
  const maghribCount = Math.min(maghribData.length, 7); // Sejajar COL1_MAX_ITEMS
  const subuhCount = Math.min(subuhData.length, 4); // max 4 supaya ruang Col2 muat Subuh+Dhuha
  const dhuhaCount = Math.min(dhuhaData.length, 7 - subuhCount); // baki slot untuk Dhuha
  
  // Kira offset untuk label (setiap kategori ada 1 label jika ada data)
  const maghribLabelOffset = maghribCount > 0 ? 2 : 0;
  const subuhLabelOffset = subuhCount > 0 ? 1 : 0;
  const dhuhaLabelOffset = dhuhaCount > 0 ? 1 : 0;
  
  return {
    maghrib: {
      startIndex: 0,
      count: maghribCount,
      labelOffset: maghribLabelOffset,
      data: maghribData.slice(0, maghribCount)
    },
    subuh: {
      startIndex: maghribLabelOffset + maghribCount,
      count: subuhCount,
      labelOffset: subuhLabelOffset,
      data: subuhData.slice(0, subuhCount)
    },
    dhuha: {
      startIndex: maghribLabelOffset + maghribCount + subuhLabelOffset + subuhCount,
      count: dhuhaCount,
      labelOffset: dhuhaLabelOffset,
      data: dhuhaData.slice(0, dhuhaCount)
    }
  };
}
