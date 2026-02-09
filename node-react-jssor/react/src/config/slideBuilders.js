// ============================================================================
// IMPORTS
// ============================================================================
import { getRatio, top, left, right, width, height } from '../utils/screenUtils';

// ============================================================================
// CONSTANTS
// ============================================================================
// Bilangan cards untuk kuliah weekly
export const KULIAH_NUM_CARDS = 6;

// ============================================================================
// BUILD FUNCTIONS
// ============================================================================
/**
 * Build children untuk kuliah weekly category (6 cards dengan image + text)
 * @param {number} numCards - Bilangan cards untuk dibina
 * @returns {Array} Array of children elements untuk kuliah weekly
 */
export function buildKuliahWeeklyCategoryChildren(numCards) {
  const KULIAH_CARD_WIDTH = 620;
  const KULIAH_CARD_HEIGHT = 193;
  const KULIAH_CARD_GAP = 40;
  const COL1_START_LEFT = left(77);
  const SCREEN_WIDTH = width(1824);
  const ROW_HEIGHT = KULIAH_CARD_HEIGHT + 35;
  const IMAGE_WIDTH = 193;
  const IMAGE_GAP = 20;
  const PENCERAMAH_TOP = 35;
  const KITAB_TOP = 110;
  const DATE_TOP = 150;
  const TEXT_WIDTH = (SCREEN_WIDTH - (IMAGE_WIDTH * 2) ) / 2;
  const baseTop = top(240); // Scale mengikut ratio screen size

  const tempKuliahWeekly = [
    { type: "img", transition: "FADE", transition2:"NO_CLIP_OUT", delay: 0, content: "", style: { position: 'absolute', left: 0, top: 0, width: 193, height: 193, objectFit: 'fill', borderRadius: 10, boxShadow: 'rgba(0, 0, 0, 0.3) 0px 4px 8px' } },
    { type: "div", transition: "CLIP|L", transition2:"NO_CLIP_OUT", delay: 0, content: "", style: { position: 'absolute', left: 20, top: 0, width: 646,display:'flex',flexDirection:'column',gap:5 } }
  ];

  return Array.from({ length: numCards }, (_, cardIndex) => {
    const isCol1 = cardIndex < 3;
    const row = isCol1 ? cardIndex : cardIndex - 3;
    const topOffset = row * ROW_HEIGHT;
    const ratio = getRatio().heightRatio; // Scale offsets mengikut ratio
    
    return tempKuliahWeekly.map((c, elementIndex) => {
      let style = { ...c.style };
      let leftPos = 0;
      let topPos = baseTop + (topOffset * ratio);

      if (isCol1) {
        if (elementIndex === 0) {
          leftPos = COL1_START_LEFT;
          topPos = baseTop + (topOffset * ratio);
        } else if (elementIndex === 1) {
          leftPos = COL1_START_LEFT + IMAGE_WIDTH + IMAGE_GAP;
          topPos = baseTop + (topOffset * ratio);// + (PENCERAMAH_TOP * ratio);
          style.width = TEXT_WIDTH;
        }
      } else {
        // Col2: guna right untuk alignment dan transition CLIP|R
        if (elementIndex === 0) {
          // Image - rapat ke kanan (kekal FADE)
          style.right = right(77);
          leftPos = undefined;
          topPos = baseTop + (topOffset * ratio);
        } else if (elementIndex === 1) {
          // Text wrapped (Penceramah + Kitab + Date) - di sebelah kiri image
          style.right = right(77) + IMAGE_WIDTH + IMAGE_GAP;
          leftPos = undefined;
          topPos = baseTop + (topOffset * ratio);
          style.width = TEXT_WIDTH;
          c.transition = "CLIP|R";
        }
      }

      if (leftPos !== undefined) {
        style.left = leftPos;
      }
      if (style.right !== undefined) {
        delete style.left;
      }
      style.top = topPos;

      return {
        ...c,
        style,
        content: ""
      };
    });
  }).flat();
}

/**
 * Build children untuk kuliah weekly (wrapper untuk buildKuliahWeeklyCategoryChildren)
 * @returns {Array} Array of children elements untuk kuliah weekly
 */
export function buildKuliahWeeklyChildren() {
  return buildKuliahWeeklyCategoryChildren(KULIAH_NUM_CARDS);
}

/** Bilangan baris untuk kuliah hari ini (3 jenis: Subuh, Dhuha, Maghrib) */
export const KULIAH_HARI_NUM_ROWS = 3;

/**
 * Build children untuk kuliah hari ini (3 rows: Subuh, Dhuha, Maghrib)
 * Setiap row: image di kanan (besar) + div teks (type + penceramah + kitab) di kiri
 * @returns {Array} Array of children elements untuk kuliah hari
 */
export function buildKuliahHariChildren() {
  const ROW_HEIGHT = 200;
  const IMAGE_SIZE = 280;
  const IMAGE_GAP = 30;
  const START_LEFT = left(77);
  const baseTop = top(229);
  const ratio = getRatio().heightRatio;
  const SCREEN_WIDTH = width(1824);
  const TEXT_WIDTH = SCREEN_WIDTH - START_LEFT - (right(77) + IMAGE_SIZE + IMAGE_GAP);

  const rows = [];
  for (let rowIndex = 0; rowIndex < KULIAH_HARI_NUM_ROWS; rowIndex++) {
    const topOffset = baseTop + rowIndex * ROW_HEIGHT * ratio;
    rows.push(
      {
        type: 'img',
        transition: 'FADE',
        duration: 1000,
        delay: 0,
        content: '',
        style: {
          position: 'absolute',
          right: right(77),
          top: topOffset,
          width: IMAGE_SIZE,
          height: IMAGE_SIZE,
          objectFit: 'fill',
          borderRadius: 10,
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 4px 8px'
        }
      },
      {
        type: 'div',
        transition: 'CLIP|R',
        delay: 0,
        content: '',
        style: {
          position: 'absolute',
          left: START_LEFT,
          top: topOffset,
          width: TEXT_WIDTH,
          display: 'flex',
          flexDirection: 'column',
          gap: 5
        }
      }
    );
  }
  return rows;
}

/**
 * Build children untuk kuliah harian - 1 card sahaja: image di kanan (besar), teks (penceramah + kitab) di kiri
 * @returns {Array} [img, div] - image right, text left
 */
export function buildKuliahHariSingleCardChildren() {
  const IMAGE_SIZE = 380;
  const IMAGE_GAP = 40;
  const START_LEFT = left(77);
  const baseTop = top(240);
  const ratio = getRatio().heightRatio;
  const SCREEN_WIDTH = width(1824);
  const TEXT_WIDTH = SCREEN_WIDTH - START_LEFT - (right(77) + IMAGE_SIZE + IMAGE_GAP);

  return [
    {
      type: 'img',
      transition: 'FADE',
      duration: 1000,
      delay: 0,
      content: '',
      style: {
        position: 'absolute',
        right: right(77),
        top: baseTop,
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        objectFit: 'fill',
        borderRadius: 10,
        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 4px 8px'
      }
    },
    {
      type: 'div',
      transition: 'CLIP|R',
      delay: 0,
      content: '',
      style: {
        position: 'absolute',
        left: START_LEFT,
        top: baseTop,
        width: TEXT_WIDTH,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }
  ];
}

/**
 * Build children untuk kuliah bulanan (calendar grid)
 * @param {number} numCards - Bilangan cards untuk dibina
 * @param {Array} dayOfWeekArray - Array hari dalam minggu untuk setiap card
 * @param {Array} calendarPositions - Array positions {row, col} untuk setiap card
 * @returns {Array} Array of children elements untuk kuliah bulanan
 */
export function buildKuliahBulananChildren(numCards, dayOfWeekArray = [], calendarPositions = []) {
  const KULIAH_BULAN_WIDTH = 256;
  const CARD_HEIGHT = 142;
  const CARD_GAP = 12; // Gap antara cards
  const ROW_GAP = 11; // Gap antara rows
  const START_LEFT = left(29); // Scale mengikut ratio screen size
  const START_TOP = top(184); // Scale mengikut ratio screen size

  // Scale dimensions mengikut ratio
  const scaledCardWidth = width(KULIAH_BULAN_WIDTH);
  const scaledCardHeight = height(CARD_HEIGHT);
  const scaledCardGap = width(CARD_GAP);
  const scaledRowGap = height(ROW_GAP);

  const tempKuliahBulanan = [
    { type: "div", transition: "CLIP|LR", duration: 1, content: "", style: { position: 'absolute', left: 0, top: START_TOP, width: scaledCardWidth, height: scaledCardHeight, padding: '0 5px' } }
  ];

  return Array.from({ length: numCards }, (_, cardIndex) => {
    let row = 0;
    let col = 0;

    if (calendarPositions[cardIndex]) {
      row = calendarPositions[cardIndex].row;
      col = calendarPositions[cardIndex].col;
    } else {
      const dayOfWeek = dayOfWeekArray[cardIndex] !== undefined ? dayOfWeekArray[cardIndex] : (cardIndex % 7);
      row = Math.floor(cardIndex / 7);
      col = dayOfWeek;
    }

    // Scale leftOffset dan topOffset mengikut ratio
    const leftOffset = col * (scaledCardWidth + scaledCardGap);
    const topOffset = row * (scaledCardHeight + scaledRowGap);

    return tempKuliahBulanan.map((c) => {
      return {
        ...c,
        style: {
          ...c.style,
          left: START_LEFT + leftOffset,
          top: START_TOP + topOffset
        },
        content: ""
      };
    });
  }).flat();
}
