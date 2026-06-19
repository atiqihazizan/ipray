/**
 * Kuliah Helpers
 * Utility functions untuk memproses data jadual kuliah
 */

// Default image untuk penceramah jika image tidak wujud atau error
export const DEFAULT_PENCERAMAH_IMAGE = '/img/Random_user.svg';

/**
 * Resolve image code ke full path menggunakan mapping
 * @param {string} imageCode - Kod image (contoh: suhaimi, bg-mta)
 * @param {Object} imagesMap - Mapping kod ke path dari images.txt
 * @returns {string} Full path atau default image
 */
export const resolveImagePath = (imageCode, imagesMap) => {
  if (!imageCode || !imagesMap) return DEFAULT_PENCERAMAH_IMAGE;
  const trimmedCode = imageCode.trim();
  return imagesMap[trimmedCode] || DEFAULT_PENCERAMAH_IMAGE;
};

/**
 * Check sama ada image path adalah default image
 * @param {string} imagePath - Path image untuk check
 * @returns {boolean} True jika image adalah default image
 */
export const isDefaultPenceramahImage = (imagePath) => {
  if (!imagePath) return false;
  return imagePath === DEFAULT_PENCERAMAH_IMAGE || imagePath.includes('Random_user.svg');
};

/**
 * Get style untuk center default image
 * @param {string} imagePath - Path image untuk check
 * @param {Object} existingStyle - Style sedia ada (optional)
 * @returns {Object} Style object dengan center properties jika default image
 */
export const getCenteredImageStyle = (imagePath, existingStyle = {}) => {
  if (isDefaultPenceramahImage(imagePath)) {
    return {
      ...existingStyle,
      objectFit: 'contain',
      objectPosition: 'center'
    };
  }
  // Untuk images bukan default (penceramah images), pastikan fit width dan height
  // Kekalkan existingStyle yang sudah ditetapkan (termasuk objectFit: 'fill' dari config)
  return existingStyle;
};

// Map type code ke label penuh
export const TYPE_LABELS = {
  'ks': 'KULIAH SUBUH',
  'km': 'KULIAH MAGHRIB',
  'kd': 'KULIAH DHUHA',
  'kk': 'KULIAH KHAS'
};

const KULIAH_TYPE_CODES = new Set(Object.keys(TYPE_LABELS));

/**
 * Background slide kuliah harian ikut kod type: /img/bg-ks.png, bg-km.png, dll.
 * @param {string} typeCode - ks, km, kd, kk
 * @returns {string|null} Path background atau null jika kod tidak dikenali
 */
export const getKuliahTypeBackground = (typeCode) => {
  const code = (typeCode || '').trim().toLowerCase();
  if (!KULIAH_TYPE_CODES.has(code)) return null;
  return `/img/bg-${code}.png`;
};

/**
 * Override slide.image.src dengan background ikut kod type kuliah.
 * @param {object} slide - Objek slide Jssor
 * @param {string} typeCode - ks, km, kd, kk
 */
export const applyKuliahTypeBackground = (slide, typeCode) => {
  const bg = getKuliahTypeBackground(typeCode);
  if (!bg || !slide) return;
  slide.image = slide.image
    ? { ...slide.image, src: bg }
    : { src: bg, alt: 'Kuliah Harian' };
};

// Map day code ke nama hari
export const DAY_NAMES = {
  'h0': 'AHAD',
  'h1': 'ISNIN',
  'h2': 'SELASA',
  'h3': 'RABU',
  'h4': 'KHAMIS',
  'h5': 'JUMAAT',
  'h6': 'SABTU'
};

/**
 * Dapatkan week code (w1, w2, w3, w4) berdasarkan tarikh
 * RULE: week = ceil(day_of_month / 7)
 * @param {Date} date - Tarikh untuk check
 * @returns {string} Week code (w1-w4)
 */
export const getWeekCode = (date) => {
  const day = date.getDate();
  const week = Math.ceil(day / 7);
  return `w${week}`;
};

/**
 * Dapatkan day code (h0-h6) berdasarkan hari dalam minggu
 * @param {Date} date - Tarikh untuk check
 * @returns {string} Day code (h0-h6)
 */
export const getDayCode = (date) => {
  const dayIndex = date.getDay(); // 0=Ahad, 1=Isnin, ..., 6=Sabtu
  return `h${dayIndex}`;
};

/**
 * Format tarikh ke DD MMM (Bahasa Melayu)
 * @param {Date} date - Tarikh untuk format
 * @returns {string} Format: DD MMM (contoh: 25 JAN)
 */
export const formatShortDate = (date) => {
  const months = ['JAN', 'FEB', 'MAC', 'APR', 'MEI', 'JUN', 'JUL', 'OGO', 'SEP', 'OKT', 'NOV', 'DIS'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  return `${day} ${month}`;
};

/**
 * Calculate actual date from week code (w1-w4) and day code (h0-h6)
 * RULE: week = ceil(day_of_month / 7)
 * Week ranges: w1=1-7, w2=8-14, w3=15-21, w4=22-28
 * @param {string} weekCode - Week code (w1, w2, w3, w4)
 * @param {string} dayCode - Day code (h0-h6)
 * @returns {Date} Calculated date
 */
export const calculateDateFromCodes = (weekCode, dayCode) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Get week number (1-4)
  const weekNum = parseInt(weekCode.substring(1));
  
  // Get day of week (0-6, where 0=Ahad, 6=Sabtu)
  const dayOfWeek = parseInt(dayCode.substring(1));
  
  // Week ranges: w1=1-7, w2=8-14, w3=15-21, w4=22-28
  const weekStartDay = (weekNum - 1) * 7 + 1; // 1, 8, 15, 22
  const weekEndDay = weekNum * 7; // 7, 14, 21, 28
  
  // Find the day in the week range that matches the day of week
  // Iterate through days in the week range to find matching day of week
  for (let day = weekStartDay; day <= weekEndDay; day++) {
    const testDate = new Date(currentYear, currentMonth, day);
    if (testDate.getDay() === dayOfWeek) {
      return testDate;
    }
  }
  
  // Fallback: return first day of week range if no match found
  return new Date(currentYear, currentMonth, weekStartDay);
};
