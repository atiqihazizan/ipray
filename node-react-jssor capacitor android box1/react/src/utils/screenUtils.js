/** Kanvas rekaan — sync dengan --ipray-design-* (index.html) + ScaledRoot (main.jsx) */
export const KIOSK_DESIGN_WIDTH = 1920;
export const KIOSK_DESIGN_HEIGHT = 1080;

/** Skala paparan `transform: scale(...)` */
export const KIOSK_UI_SCALE = 0.5;

const readLogicalDesignSize = () => {
  if (typeof document === 'undefined') return null;
  const style = getComputedStyle(document.documentElement);
  const w = parseFloat(style.getPropertyValue('--ipray-design-width').trim());
  const h = parseFloat(style.getPropertyValue('--ipray-design-height').trim());
  if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
    return { width: w, height: h };
  }
  return null;
};

/** True bila mod kanvas logik aktif (Jssor patut $ScaleWidth penuh tanpa ikut viewport) */
export const isLogicalDesignCanvasActive = () => readLogicalDesignSize() !== null;

/** Ruang untuk getRatio / sz: logik 1920×1080 bila mod skala aktif, else window. */
const getScreenSize = () => {
  const logical = readLogicalDesignSize();
  if (logical) return logical;
  if (typeof window !== 'undefined') {
    return { width: window.innerWidth, height: window.innerHeight };
  }
  return { width: KIOSK_DESIGN_WIDTH, height: KIOSK_DESIGN_HEIGHT };
};

/** Const yang boleh dipanggil: kembalikan { width, height } container/skrin semasa. Guna di mana saja. */
export const getContainerSize = () => getScreenSize();
export const sz = () => getScreenSize(); // alias pendek untuk guna dalam template

/** Base dimensions untuk ratio calculation */
const BASE_WIDTH = KIOSK_DESIGN_WIDTH;
const BASE_HEIGHT = KIOSK_DESIGN_HEIGHT;

/**
 * Dapatkan ratio screen size berbanding base size (1920x1080)
 * @returns {{ widthRatio: number, heightRatio: number }}
 */
export const getRatio = () => {
  const { width, height } = sz();
  return {
    widthRatio: width / BASE_WIDTH,
    heightRatio: height / BASE_HEIGHT
  };
};

/**
 * Calculate top position berdasarkan ratio screen size
 * @param {number} topValue - Top value asal (dari base 1920x1080)
 * @returns {number} Top position yang sudah di-scale mengikut ratio
 */
export const top = (topValue) => {
  return topValue * getRatio().heightRatio;
};

/**
 * Calculate left position berdasarkan ratio screen size
 * @param {number} leftValue - Left value asal (dari base 1920x1080)
 * @returns {number} Left position yang sudah di-scale mengikut ratio
 */
export const left = (leftValue) => {
  return leftValue * getRatio().widthRatio;
};

/**
 * Calculate bottom position berdasarkan ratio screen size
 * @param {number} bottomValue - Bottom value asal (dari base 1920x1080)
 * @returns {number} Bottom position yang sudah di-scale mengikut ratio
 */
export const bottom = (bottomValue) => {
  return bottomValue * getRatio().heightRatio;
};

/**
 * Calculate right position berdasarkan ratio screen size
 * @param {number} rightValue - Right value asal (dari base 1920x1080)
 * @returns {number} Right position yang sudah di-scale mengikut ratio
 */
export const right = (rightValue) => {
  return rightValue * getRatio().widthRatio;
};

/**
 * Calculate width dimension berdasarkan ratio screen size
 * @param {number} widthValue - Width value asal (dari base 1920x1080)
 * @returns {number} Width dimension yang sudah di-scale mengikut ratio
 */
export const width = (widthValue) => {
  return widthValue * getRatio().widthRatio;
};

/**
 * Calculate height dimension berdasarkan ratio screen size
 * @param {number} heightValue - Height value asal (dari base 1920x1080)
 * @returns {number} Height dimension yang sudah di-scale mengikut ratio
 */
export const height = (heightValue) => {
  return heightValue * getRatio().heightRatio;
};

/**
 * Kira saiz font (px) berdasarkan ratio skrin – teks scale mengikut height ratio (base 1920x1080).
 * @param {number} fontSizePx - Font size asal dalam px (dari base 1920x1080)
 * @returns {number} Font size yang sudah di-scale mengikut ratio
 */
export const textSize = (fontSizePx) => {
  return fontSizePx * getRatio().heightRatio;
};
