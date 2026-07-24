/**
 * Util untuk layer kotak (box) pada slide.
 * Nilai asas (base 1920x1080); ratio dipakai dalam createBoxLayer.
 */

import { left, top, right, bottom } from './screenUtils';

export const BOX_LEFT = 195;
export const BOX_TOP = 145;
export const BOX_RIGHT = 185;
export const BOX_PADDING = 20;
export const DEFAULT_BOX_BOTTOM = 365;

// export const BOX_LEFT = 210;
// export const BOX_TOP = 150;
// export const BOX_RIGHT = 220;
// export const BOX_PADDING = 20;
// export const DEFAULT_BOX_BOTTOM = 295;

/**
 * Cipta objek boxLayer untuk slide (tanpa content).
 * @param {Object} [options]
 * @param {number} [options.left] - Nilai left (px, base 1920x1080). Default: BOX_LEFT.
 * @param {number} [options.right] - Nilai right (px, base 1920x1080). Default: BOX_RIGHT.
 * @param {number} [options.top] - Nilai top (px, base 1920x1080). Default: BOX_TOP.
 * @param {number} [options.bottom] - Nilai bottom (px, base 1920x1080). Default: DEFAULT_BOX_BOTTOM.
 * @returns {Object} Layer objek untuk dimasukkan ke captions/children.
 */
export function createBoxLayer(options = {}) {
  const leftVal = options.left ?? BOX_LEFT;
  const topVal = options.top ?? BOX_TOP;
  const rightVal = options.right ?? BOX_RIGHT;
  const bottomVal = options.bottom ?? DEFAULT_BOX_BOTTOM;
  return {
    type: 'div',
    transition: 'auto',
    duration: 2000,
    delay: 0,
    content: '',
    style: {
      position: 'absolute',
      left: left(leftVal),
      top: top(topVal),
      right: right(rightVal),
      bottom: bottom(bottomVal),
      backgroundColor: 'rgb(255 255 255 / 71%)',
      border: '9px solid #666668',
      boxShadow: '8px 8px 24px rgba(0, 0, 0)',
      borderRadius: 5
    }
  };
}
