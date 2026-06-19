/**
 * SchemaRenderer — Convert JSON page schema (page-layouts.json) → Jssor slide array
 *
 * Input:
 *   pageSchema  — satu page object dari page-layouts.json
 *   dataItems   — array of plain objects, satu object = satu slide (e.g. satu pengumuman)
 *   options     — { imagesData }
 *
 * Output:
 *   Array of Jssor slide objects, siap untuk dimasukkan ke Jssor slider
 *
 * Konsep asas:
 *   - Setiap block dalam schema menjadi satu child caption dalam Jssor
 *   - Koordinat x,y,w,h disimpan dalam base 1920×1080, di-scale ikut skrin sebenar
 *   - dataField dalam block di-map ke field dalam dataItem
 *   - Untuk multi-item pages: hanya slide pertama play-in, slide terakhir play-out
 */

import { sz } from '../utils/screenUtils';

const BASE_W = 1920;
const BASE_H = 1080;

// ─── Scale helpers ──────────────────────────────────────────────────────────

function getRatios(canvasBase) {
  const cw = canvasBase?.w || BASE_W;
  const ch = canvasBase?.h || BASE_H;
  return {
    x: sz().width / cw,
    y: sz().height / ch,
  };
}

function scaleStyle(rawStyle, block, ratio) {
  const { x = 0, y = 0, w = BASE_W, h = 0 } = block;
  const s = { ...rawStyle };

  if (typeof s.fontSize === 'number') s.fontSize = s.fontSize * ratio.y;
  if (typeof s.lineHeight === 'number') s.lineHeight = `${s.lineHeight * ratio.y}px`;
  if (typeof s.gap === 'number') s.gap = s.gap * ratio.y;
  if (typeof s.letterSpacing === 'string' && s.letterSpacing.endsWith('px')) {
    s.letterSpacing = `${parseFloat(s.letterSpacing) * ratio.x}px`;
  }

  return {
    ...s,
    position: 'absolute',
    left: x * ratio.x,
    top: y * ratio.y,
    width: w * ratio.x,
    ...(h > 0 ? { height: h * ratio.y } : {}),
  };
}

// ─── Content resolver ────────────────────────────────────────────────────────

function resolveContent(block, dataItem) {
  if (block.staticContent) return block.staticContent;
  if (block.dataField && dataItem) return dataItem[block.dataField] ?? '';
  return '';
}

// ─── Background resolver ─────────────────────────────────────────────────────

function resolveBackground(background, imagesData) {
  if (!background || !background.src) return null;
  const src = background.src;

  // Semak imagesData map dahulu (nama pendek → path penuh)
  if (imagesData && imagesData[src]) {
    const p = imagesData[src];
    return { src: p.startsWith('/') ? p : `/${p}`, alt: '' };
  }

  // Path mutlak atau URL
  if (src.startsWith('/') || src.startsWith('http')) return { src, alt: '' };

  // Nama pendek → folder slides
  return { src: `/images/slides/${src}.jpg`, alt: '' };
}

// ─── Caption builders ────────────────────────────────────────────────────────

/**
 * Build satu child caption dari block definition + data item
 *
 * Logik transisi multi-slide:
 *   - Slide pertama (isFirst): transition = block.transition (play-in berjalan)
 *   - Slide tengah: transition = null (terus papar, tanpa play-in)
 *   - Slide terakhir (isLast): transition2 = block.transition (play-out berjalan)
 *   - Slide bukan terakhir: transition2 = 'NO_CLIP_OUT' (kekal sampai slide seterusnya)
 *
 * Untuk block pertama sahaja yang kawal transition2 (ikut corak Jssor sedia ada).
 */
function buildChild(block, dataItem, isFirst, isLast, isFirstBlock, ratio) {
  const content = resolveContent(block, dataItem);
  const style = scaleStyle(block.style || {}, block, ratio);

  const transition = isFirst ? (block.transition || null) : null;
  let transition2 = block.transition2 || null;
  if (isFirstBlock) {
    transition2 = isLast ? (block.transition || 'CLIP|LR') : 'NO_CLIP_OUT';
  }

  return {
    type: block.kind === 'image' ? 'img' : 'div',
    transition,
    transition2,
    duration: block.transitionDuration ?? 800,
    delay: block.transitionDelay ?? 0,
    content,
    style,
  };
}

/**
 * Build parent wrapper caption yang merangkumi semua children.
 * Jssor memerlukan wrapper div untuk parent-child structure.
 */
function buildParentCaption(children, isFirst, isLast) {
  return {
    type: 'div',
    duration: 500,
    transition: isFirst ? undefined : null,
    transition2: isLast ? 'CLIP|LR' : 'NO_CLIP_OUT',
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: sz().width,
      height: sz().height,
    },
    children,
  };
}

// ─── Slide builder ───────────────────────────────────────────────────────────

function buildSlide(pageSchema, dataItem, index, total, canvasBase, imagesData) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const ratio = getRatios(canvasBase);

  const visibleBlocks = (pageSchema.blocks || []).filter(b => b.visible !== false);

  const children = visibleBlocks.map((block, blockIndex) =>
    buildChild(block, dataItem, isFirst, isLast, blockIndex === 0, ratio)
  );

  return {
    type: pageSchema.type,
    duration: pageSchema.duration || 5000,
    transitionType: isFirst ? 'auto' : 'static',
    image: resolveBackground(pageSchema.background, imagesData),
    captions: [buildParentCaption(children, isFirst, isLast)],
    datetime: pageSchema.datetime || [],
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Render page schema + data → array Jssor slides
 *
 * @param {Object}  pageSchema  - Satu page dari page-layouts.json
 * @param {Array}   dataItems   - Array of plain objects (satu per slide). Boleh kosong = satu slide statik.
 * @param {Object}  options     - { imagesData: {} }
 * @returns {Array} Jssor slides array
 */
export function schemaRenderer(pageSchema, dataItems, options = {}) {
  if (!pageSchema?.blocks) return [];

  const canvasBase = pageSchema.canvasBase || { w: BASE_W, h: BASE_H };
  const items = Array.isArray(dataItems) && dataItems.length > 0 ? dataItems : [{}];
  const { imagesData } = options;

  return items.map((dataItem, index) =>
    buildSlide(pageSchema, dataItem, index, items.length, canvasBase, imagesData)
  );
}

/**
 * Cari page schema dari pageLayoutsData mengikut type
 *
 * @param {Object} pageLayoutsData - Data dari /api/page-layouts
 * @param {string} type            - Page type (e.g. 'announce', 'home')
 * @returns {Object|null} Page schema atau null jika tiada
 */
export function findPageSchema(pageLayoutsData, type) {
  if (!pageLayoutsData?.pages) return null;
  return pageLayoutsData.pages.find(p => p.type === type && p.enabled !== false) || null;
}
