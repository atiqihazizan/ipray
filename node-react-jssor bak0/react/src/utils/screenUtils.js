/** Dapatkan width dan height skrin semasa (browser). Fallback 1920x1080 jika tiada window (SSR/build). */
const getScreenSize = () => {
  if (typeof window !== 'undefined') {
    return { width: window.innerWidth, height: window.innerHeight };
  }
  return { width: 1920, height: 1080 };
};

/** Const yang boleh dipanggil: kembalikan { width, height } container/skrin semasa. Guna di mana saja. */
export const getContainerSize = () => getScreenSize();
export const sz = () => getScreenSize(); // alias pendek untuk guna dalam template

/** Base dimensions untuk ratio calculation (1920x1080) */
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

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
