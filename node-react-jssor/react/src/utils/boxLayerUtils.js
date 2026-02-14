/**
 * Util untuk layer kotak (box) pada slide.
 * Saiz fixed kecuali bottom yang boleh custom.
 */

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
 * @param {number} [options.bottom] - Nilai bottom (px). Default: DEFAULT_BOX_BOTTOM (295).
 * @returns {Object} Layer objek untuk dimasukkan ke captions/children.
 */
export function createBoxLayer(options = {}) {
  const bottom = options.bottom ?? DEFAULT_BOX_BOTTOM;
  return {
    type: 'div',
    transition: 'auto',
    duration: 2000,
    delay: 0,
    content: '',
    style: {
      position: 'absolute',
      left: BOX_LEFT,
      top: BOX_TOP,
      right: BOX_RIGHT,
      bottom,
      backgroundColor: 'rgb(255 255 255 / 71%)',
      border: '9px solid #666668',
      boxShadow: '8px 8px 24px rgba(0, 0, 0)',
      borderRadius: 5
    }
  };
}
