/**
 * Data Adapters — Convert data sedia ada ke format plain objects untuk SchemaRenderer
 *
 * Setiap adapter mengambil data mentah (sama format seperti yang dihantar dari backend)
 * dan mengembalikan array of plain objects di mana setiap object = satu slide.
 *
 * Field names dalam object mesti sepadan dengan `dataField` dalam block schema (page-layouts.json).
 */

import { formatDateTime, getCountdown, getCountdownDays } from '../utils/dateFormatter';

// ─── Announce Adapter ────────────────────────────────────────────────────────

/**
 * Convert announcementsData (array of pipe-separated strings) → array of objects
 * Field: kategori, tajuk, penceramah, tema, tarikh, masa, lokasi, sasaran, countdown
 */
export function adaptAnnouncements(announcementsData) {
  if (!announcementsData || !announcementsData.length) return [];

  return announcementsData
    .map(line => {
      const arr = typeof line === 'string' ? line.split('|') : line;
      const originalDateTime = (arr[4] || '').trim();
      if (!originalDateTime) return null;

      const countdown = getCountdown(originalDateTime);
      if (!countdown || countdown === 'LEWAT') return null;

      const dateTimeObj = formatDateTime(originalDateTime, '12');

      return {
        kategori:   (arr[0] || '').trim(),
        tajuk:      (arr[1] || '').trim(),
        penceramah: (arr[2] || '').trim(),
        tema:       (arr[3] || '').trim(),
        tarikh:     dateTimeObj.date,
        masa:       dateTimeObj.time,
        lokasi:     (arr[5] || '').trim(),
        sasaran:    (arr[6] || '').trim(),
        countdown,
      };
    })
    .filter(Boolean);
}

// ─── Countdown Adapter ───────────────────────────────────────────────────────

/**
 * Convert countdownsData (array of objects dari backend) → array of objects
 * Field: event, countdownText
 */
export function adaptCountdowns(countdownsData) {
  if (!countdownsData || !countdownsData.length) return [];

  return countdownsData
    .map(item => {
      const windowDays = typeof item.windowDays === 'number' ? item.windowDays : 0;

      let dateStr = '';
      if (typeof item === 'string') {
        const parts = item.split('|');
        dateStr = (parts[1] || '').trim();
      } else {
        dateStr = (item.dateTimeRaw ?? item.date ?? '').trim();
        if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) dateStr += ' 00:00';
      }

      if (!dateStr) return null;

      const countdownText = item.countdownText != null ? item.countdownText : getCountdown(dateStr);
      if (!countdownText || countdownText === 'LEWAT') return null;

      if (windowDays > 0) {
        const remaining = item.daysRemaining != null ? item.daysRemaining : getCountdownDays(dateStr);
        if (remaining > windowDays) return null;
      }

      const event = (item.event || '').trim();

      return { event, countdownText };
    })
    .filter(Boolean);
}

// ─── Home Adapter ────────────────────────────────────────────────────────────

/**
 * Home page — satu slide, papar nama & lokasi masjid
 * Field: namaMasjidBlock (HTML string yang mengandungi kedua-dua baris)
 *
 * Note: Home slide menggunakan mosqueInfo dari config.
 * homeTitleConfig dari DataContext digunakan untuk styling.
 */
export function adaptHome(mosqueInfo, homeTitleConfig = {}) {
  const {
    TITLE_ALIGN = 'center',
    TITLE_GAP = 30,
    TITLE1_SIZE = 88,
    TITLE1_COLOR = '#00FFFF',
    TITLE2_SIZE = 88,
    TITLE2_COLOR = '#00FFFF',
  } = homeTitleConfig;

  const alignItems = TITLE_ALIGN === 'left' ? 'flex-start'
    : TITLE_ALIGN === 'right' ? 'flex-end'
    : 'center';

  const namaMasjidBlock = `<div style="display:flex;flex-direction:column;align-items:${alignItems};justify-content:center;gap:${TITLE_GAP}px;text-align:${TITLE_ALIGN};">
    <span style="font-size:${TITLE1_SIZE}px;color:${TITLE1_COLOR};">${mosqueInfo?.name || ''}</span>
    <span style="font-size:${TITLE2_SIZE}px;color:${TITLE2_COLOR};">${mosqueInfo?.location || ''}</span>
  </div>`;

  return [{ namaMasjidBlock }];
}

// ─── KuliahHari Adapter ──────────────────────────────────────────────────────

/**
 * Convert kuliahHariProcessed (array of pipe-separated strings) → array of objects
 * Setiap kuliah kategori = satu slide
 * Field: kategoriKuliah, penceramah, kitab, masa, imagePenceramah
 */
export function adaptKuliahHari(kuliahHariProcessed) {
  if (!kuliahHariProcessed || !kuliahHariProcessed.length) return [];

  return kuliahHariProcessed.map(line => {
    const parts = typeof line === 'string' ? line.split('|') : line;
    // format: hari|waktu|kitab|penceramah|slug|[extra]
    // atau format lama: kategori|masa|kitab|penceramah|...
    return {
      kategoriKuliah: (parts[1] || '').trim().toUpperCase(),
      penceramah:     (parts[3] || '').trim(),
      kitab:          (parts[2] || '').trim(),
      masa:           (parts[1] || '').trim(),
      imagePenceramah: parts[4] ? `/images/penceramah/${parts[4].trim()}.jpg` : '/img/Random_user.svg',
    };
  });
}

// ─── Slideshow Adapter ───────────────────────────────────────────────────────

const DEFAULT_SLIDESHOW_IMAGES = [
  '/img/slideshow/mountant0.jpeg',
  '/img/slideshow/mountant1.jpg',
  '/img/slideshow/mountant2.jpeg',
  '/img/slideshow/mountant3.jpeg',
  '/img/slideshow/mountant4.jpg',
  '/img/slideshow/mountant5.jpg',
  '/img/slideshow/mountant6.jpg',
];

/**
 * Convert slideshowData → array of objects
 * Field: slideshowImages (untuk slideshow, setiap item = satu imej = satu slide)
 *
 * Note: Slideshow adalah kes khas — setiap slide = satu imej (background bertukar)
 * Renderer kena handle ini secara berbeza (tukar background, bukan content block)
 */
export function adaptSlideshow(slideshowData) {
  let list = [];

  if (slideshowData && Array.isArray(slideshowData) && slideshowData.length > 0) {
    list = slideshowData.map(item => {
      const imagePath = item?.image ? item.image : typeof item === 'string' ? item : '';
      const p = imagePath && imagePath.startsWith('/') ? imagePath : `/${imagePath || ''}`;
      return p;
    }).filter(Boolean);
  } else {
    list = DEFAULT_SLIDESHOW_IMAGES;
  }

  return list.map(imageSrc => ({ slideshowImages: imageSrc }));
}
