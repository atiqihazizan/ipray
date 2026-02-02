import { useState, useEffect, useMemo, useRef } from 'react';
import { slidesTemplate, CAPTION_ORDER, KULIAH_NUM_CARDS, sliderConfig } from '../config/sliderConfig';
import { buildKuliahWeeklyCategoryChildren, buildKuliahBulananChildren, buildKuliahHariSingleCardChildren } from '../config/slideBuilders';
import { formatDateTime, getCountdown } from '../utils/dateFormatter';
import { useData } from '../contexts/DataContext';
import {
  TYPE_LABELS,
  DAY_NAMES,
  getWeekCode,
  getDayCode,
  formatShortDate,
  calculateDateFromCodes,
  resolveImagePath,
  DEFAULT_PENCERAMAH_IMAGE,
  getCenteredImageStyle
} from '../utils/kuliahHelpers';
import { top, getContainerSize } from '../utils/screenUtils';

// Define urutan paparan kategori: km → kd → ks → kk
const CATEGORY_ORDER = ['KULIAH MAGHRIB', 'KULIAH DHUHA', 'KULIAH SUBUH', 'KULIAH KHAS'];

// Helper function: Convert object captions kepada array berdasarkan order
const captionsToArray = (captionsObj, order = CAPTION_ORDER) => {
  if (!captionsObj || Array.isArray(captionsObj)) return captionsObj;
  return order.map(key => captionsObj[key]).filter(Boolean);
};

// Helper function: Escape HTML
const escapeHtml = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Process announcements data ke slides
 */
const processAnnouncements = (announcementsData, slidesConfigData, applyConfig) => {
  if (!announcementsData || announcementsData.length === 0) return [];

  const esc = escapeHtml;

  // Filter announcement yang aktif sahaja (belum lepas tarikh/masa)
  const activeAnnouncements = announcementsData.filter(line => {
    const arr = line.split("|");
    const originalDateTime = arr[4]?.trim();

    if (!originalDateTime) return false;

    // Check jika tarikh/masa belum lepas
    const countdown = getCountdown(originalDateTime);
    return countdown && countdown !== "LEWAT";
  });

  if (activeAnnouncements.length === 0) return [];

  // Restructure announcements: format tarikh/masa dan append countdown
  const restructuredAnnouncements = activeAnnouncements.map(line => {
    const arr = line.split("|");
    const originalDateTime = arr[4]?.trim();

    // Format tarikh & masa (index 4)
    if (originalDateTime) {
      const dateTimeObj = formatDateTime(originalDateTime, "12");
      arr[4] = dateTimeObj.date; // Tarikh formatted
      arr.splice(5, 0, dateTimeObj.time); // Insert masa formatted di index 5

      // Append countdown di akhir array (initial value - akan update dinamik)
      arr.push(getCountdown(originalDateTime));
    }
    return arr;
  });

  // Apply config ke announce template
  const announceTemplate = applyConfig(slidesTemplate.announce, 'announce');

  // Generate announce slides - parent-child
  const announceSlides = restructuredAnnouncements.map((item, i) => {
    const announceSlide = JSON.parse(JSON.stringify(announceTemplate));
    const parent = announceSlide.captions[0];

    if (parent) {
      const isLastAnnounce = i === restructuredAnnouncements.length - 1;
      if (i > 0) parent.transition = null;
      parent.transition2 = isLastAnnounce ? "CLIP|LR" : "NO_CLIP_OUT";

      // 9 children: kategori, tajuk, penceramah, tema, tarikh, masa, lokasi, sasaran, countdown
      if (parent.children && parent.children.length >= 9) {
        parent.children[0].content = item[0] || "";
        parent.children[1].content = item[1] || "";
        parent.children[2].content = item[2] || "";
        parent.children[3].content = item[3] || "";
        parent.children[4].content = item[4] || ""; // Tarikh formatted
        parent.children[5].content = item[5] || ""; // Masa formatted
        parent.children[6].content = item[6] || "";
        parent.children[7].content = item[7] || "";
        parent.children[8].content = item[8] || ""; // Countdown
        // children[0] = kategori (PENGUMUMAN): jangan play out pada first/middle; play out hanya pada last
        if (i > 0) parent.children[0].transition = null;
        parent.children[0].transition2 = isLastAnnounce ? "CLIP|LR" : "NO_CLIP_OUT";
      }
    }

    announceSlide.transitionType = (i === 0) ? 'auto' : 'static';
    return announceSlide;
  });

  return announceSlides;
};

/**
 * Helper function: Check jika kuliah match dengan rekod dalam kuliah-batal (untuk Hari Ini & Mingguan)
 * Match berdasarkan: tarikh semasa + type kuliah
 * Return: { isBatal: boolean, notes: string }
 */
const isKuliahBatal = (kuliahItem, kuliahBatalData) => {
  if (!kuliahBatalData || !Array.isArray(kuliahBatalData) || kuliahBatalData.length === 0) {
    return { isBatal: false, notes: '' };
  }
  
  if (!kuliahItem || typeof kuliahItem !== 'string') {
    return { isBatal: false, notes: '' };
  }
  
  const arr = kuliahItem.split("|");
  const type = (arr[2] || '').trim();
  
  if (!type) {
    return { isBatal: false, notes: '' };
  }
  
  // Get tarikh semasa (hari ini)
  const currentDate = new Date();
  const dayStr = String(currentDate.getDate()).padStart(2, '0');
  const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
  const yearStr = String(currentDate.getFullYear());
  const formattedDate = `${dayStr}-${monthStr}-${yearStr}`;
  
  // Check setiap rekod dalam kuliah-batal
  let matchedNotes = '';
  const match = kuliahBatalData.some((batal) => {
    if (!batal || !batal.date || !batal.type) {
      return false;
    }
    
    const batalDate = String(batal.date).trim();
    const batalType = String(batal.type).trim();
    
    const dateMatch = batalDate === formattedDate;
    const typeMatch = batalType === type;
    
    if (dateMatch && typeMatch) {
      matchedNotes = batal.notes || '';
      return true;
    }
    return false;
  });
  
  return { isBatal: match, notes: matchedNotes };
};

/**
 * Helper function: Check jika kuliah match dengan rekod dalam kuliah-batal (untuk Bulanan)
 * Match berdasarkan: week + day + type dari tarikh batal
 * Return: { isBatal: boolean, notes: string }
 */
const isKuliahBatalByWeekDay = (kuliahItem, kuliahBatalData) => {
  if (!kuliahBatalData || !Array.isArray(kuliahBatalData) || kuliahBatalData.length === 0) {
    return { isBatal: false, notes: '' };
  }
  
  if (!kuliahItem || typeof kuliahItem !== 'string') {
    return { isBatal: false, notes: '' };
  }
  
  const arr = kuliahItem.split("|");
  const week = (arr[0] || '').trim();      // contoh: w1
  const dayCode = (arr[1] || '').trim();   // contoh: h0
  const type = (arr[2] || '').trim();      // contoh: km
  
  if (!week || !dayCode || !type) {
    return { isBatal: false, notes: '' };
  }
  
  // Check setiap rekod dalam kuliah-batal
  let matchedNotes = '';
  const match = kuliahBatalData.some((batal) => {
    if (!batal || !batal.date || !batal.type) {
      return false;
    }
    
    const batalDate = String(batal.date).trim();
    const batalType = String(batal.type).trim();
    
    // Parse DD-MM-YYYY
    const dateParts = batalDate.split('-');
    if (dateParts.length !== 3) {
      return false;
    }
    
    const dayNum = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // JS month 0-indexed
    const year = parseInt(dateParts[2], 10);
    
    if (isNaN(dayNum) || isNaN(month) || isNaN(year)) {
      return false;
    }
    
    const date = new Date(year, month, dayNum);
    
    // Calculate week and day code from date
    const batalWeek = getWeekCode(date); // contoh: w1
    const batalDay = getDayCode(date);   // contoh: h0
    
    // Match week + dayCode + type
    const weekMatch = week === batalWeek;
    const dayMatch = dayCode === batalDay;
    const typeMatch = type === batalType;
    
    if (weekMatch && dayMatch && typeMatch) {
      matchedNotes = batal.notes || '';
      return true;
    }
    return false;
  });
  
  return { isBatal: match, notes: matchedNotes };
};

/**
 * Process kuliah data ke slides (group by type)
 * Papar satu slide "empty state" (Tiada kuliah minggu ini) jika data kosong
 */
const processKuliahMingguan = (kuliahData, kuliahBatalData, imagesData, slidesConfigData, applyConfig) => {
  const esc = escapeHtml;
  const safeKuliahData = kuliahData && Array.isArray(kuliahData) ? kuliahData : [];

  // Dapatkan current week dan current day berdasarkan current date
  // RULE: week = ceil(day_of_month / 7)
  const currentDate = new Date();
  const currentWeek = getWeekCode(currentDate);
  const currentDay = getDayCode(currentDate);

  // Filter data untuk current week sahaja (semua hari dalam minggu tersebut)
  // RULE: Show ONLY data for the CURRENT week
  let dataToDisplay = safeKuliahData.filter(item => {
    const arr = item.split("|");
    const week = arr[0];
    return week === currentWeek;
  });

  // Jika tiada data untuk current week: papar satu slide dengan body text besar "Tiada Kuliah minggu ini"
  if (dataToDisplay.length === 0) {
    const kuliahTemplate = applyConfig(slidesTemplate.kuliahWeekly, 'kuliahWeekly');
    const kuliahSlide = JSON.parse(JSON.stringify(kuliahTemplate));
    const parent = kuliahSlide.captions[0];
    if (parent && parent.children && parent.children.length >= 2) {
      parent.children[0].content = 'JADUAL KULIAH MINGGU INI';
      const bodyMsg = parent.children[1];
      bodyMsg.content = 'Tiada Kuliah minggu ini...';
      bodyMsg.style = { ...bodyMsg.style, position: 'absolute', left: 0, right: 0, top: top(350), width: getContainerSize().width, height: 300, textAlign: 'center', fontSize: 200, color: '#000000', fontFamily: "'SairaCondensed', sans-serif", fontWeight: 'bold', lineHeight: 120, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };
      parent.children = [parent.children[0], bodyMsg];
    }
    kuliahSlide.transitionType = 'auto';
    return [kuliahSlide];
  }

  // WAJIB: Sort data mengikut tarikh sebelum group by type
  // Calculate actual date untuk setiap entry dan sort
  dataToDisplay = dataToDisplay.map(item => {
    const arr = item.split("|");
    const week = arr[0];
    const day = arr[1];
    const calculatedDate = calculateDateFromCodes(week, day);
    return {
      item: item,
      date: calculatedDate
    };
  }).sort((a, b) => {
    // Sort by date (ascending)
    return a.date - b.date;
  }).map(entry => entry.item); // Convert back to string array

  // Group filtered data by type (ks, km, kd, kk)
  const groupedData = {};
  dataToDisplay.forEach(item => {
    const arr = item.split("|");
    const type = arr[2];
    const typeLabel = TYPE_LABELS[type] || type.toUpperCase();

    if (!groupedData[typeLabel]) {
      groupedData[typeLabel] = [];
    }
    groupedData[typeLabel].push(item);
  });

  // Create slide untuk setiap kategori (ikut urutan yang ditetapkan)
  const kuliahMigguanSlides = [];
  const categoryKeys = CATEGORY_ORDER.filter(cat => groupedData[cat]); // Hanya kategori yang ada data

  categoryKeys.forEach((categoryTitle, categoryIndex) => {
    const categoryData = groupedData[categoryTitle];
    const numCards = Math.min(categoryData.length, KULIAH_NUM_CARDS);

    const kuliahTemplate = applyConfig(slidesTemplate.kuliahWeekly, 'kuliahWeekly');
    const kuliahSlide = JSON.parse(JSON.stringify(kuliahTemplate));
    const parent = kuliahSlide.captions[0];

    if (parent) {
      const isLastCategory = categoryIndex === categoryKeys.length - 1;
      if (categoryIndex > 0) parent.transition = null;
      parent.transition2 = isLastCategory ? "CLIP|LR" : "NO_CLIP_OUT";

      // Set kategori global (children[0])
      if (parent.children && parent.children.length > 0) {
        parent.children[0].content = 'JADUAL KULIAH MINGGU INI';
        if (categoryIndex > 0) parent.children[0].transition = null;
        parent.children[0].transition2 = isLastCategory ? "CLIP|LR" : "NO_CLIP_OUT";
      }

      // Set header kategori (children[1])
      if (parent.children && parent.children.length > 1) {
        parent.children[1].content = categoryTitle;
      }

      // Build cards dynamically
      const cards = buildKuliahWeeklyCategoryChildren(numCards);
      parent.children = [
        parent.children[0],
        parent.children[1],
        ...cards
      ];

      // Set content untuk setiap card (2 elements: image, text wrapped)
      for (let i = 0; i < numCards; i++) {
        const arr = categoryData[i].split("|");
        const base = 2 + (i * 2); // 2 elements per card

        const week = arr[0];
        const day = arr[1];
        const penceramah = (arr[3] || "").trim();
        const imageCode = (arr[4] || "").trim();
        const kitab = (arr[5] || "").trim();
        
        // Check jika kuliah ini ada dalam kuliah-batal.txt berdasarkan tarikh
        const batalInfo = isKuliahBatal(categoryData[i], kuliahBatalData);

        if (!penceramah) {
          continue;
        }

        const isCol1 = i < 3; // Col1: 0,1,2 | Col2: 3,4,5
        const dayName = DAY_NAMES[day] || '';
        const calculatedDate = calculateDateFromCodes(week, day);
        const shortDate = formatShortDate(calculatedDate);
        const hariTarikh = dayName && shortDate ? `${dayName} | ${shortDate}` : '';

        // Element 0: Image
        if (parent.children[base + 0]) {
          const imagePath = resolveImagePath(imageCode, imagesData);
          parent.children[base + 0].content = imagePath;

          // Pastikan style untuk fit width dan height (objectFit: 'fill' sudah ditetapkan dalam template)
          // Hanya update jika default image (untuk center)
          parent.children[base + 0].style = getCenteredImageStyle(imagePath, parent.children[base + 0].style);
        }

        const textAlign = isCol1 ? 'left' : 'right';

        // Element 1: Penceramah + Kitab + Date + Status (jika batal)
        if (parent.children[base + 1]) {
          const penceramahHtml = `<span style="display:block;font-size:46px;line-height:1.35;font-family:'Anton',sans-serif;text-align:${textAlign};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(penceramah)}</span>`;
          const kitabHtml = kitab ? `<div style="font-size:25px;word-wrap:break-word;white-space:normal;line-height:1.4;font-family:'Anton',sans-serif;text-align:${textAlign};">${esc(kitab)}</div>` : '';
          const dateHtml = hariTarikh ? `<span style="display:block;font-size:34px;line-height:1.35;font-family:'Anton',sans-serif;text-align:${textAlign};">${esc(hariTarikh)}</span>` : '';
          
          // Status label jika batal DAN hari kuliah = hari semasa
          let statusHtml = '';
          if (batalInfo.isBatal && day === currentDay) {
            const notes = (batalInfo.notes || '').trim();
            if (notes) {
              statusHtml = `<div style="font-size:28px;color:#ff0000;font-weight:bold;text-align:${textAlign};margin-top:5px;font-family:'Anton',sans-serif;">KULIAH DIBATALKAN DAN DIGANTIKAN DENGAN ${esc(notes).toUpperCase()}</div>`;
            } else {
              statusHtml = `<div style="font-size:28px;color:#ff0000;font-weight:bold;text-align:${textAlign};margin-top:5px;font-family:'Anton',sans-serif;">KULIAH DIBATALKAN</div>`;
            }
          }

          // parent.children[base + 1].content = `<div style="display:flex;flex-direction:column;gap:5px">${penceramahHtml}${kitabHtml}${dateHtml}</div>`;
          parent.children[base + 1].content = `${penceramahHtml}${kitabHtml}${dateHtml}${statusHtml}`;
        }
      }
    }

    kuliahSlide.transitionType = categoryIndex === 0 ? 'auto' : 'static';
    kuliahMigguanSlides.push(kuliahSlide);
  });

  return kuliahMigguanSlides;
};

/**
 * Process kuliah data ke slides "Kuliah Hari Ini" (tarikh hari semasa, minggu semasa)
 * Seperti kuliah mingguan ikut CATEGORY_ORDER; bezanya 1 category = 1 slide, 1 kuliah sahaja (1 penceramah, 1 kitab, 1 image).
 * Tiada tarikh pada card. Jika tiada data: papar satu slide "Tiada kuliah hari ini"
 */
const processKuliahHarian = (kuliahData, kuliahBatalData, imagesData, slidesConfigData, applyConfig) => {
  const esc = escapeHtml;
  const safeKuliahData = kuliahData && Array.isArray(kuliahData) ? kuliahData : [];
  const currentDate = new Date();
  const currentWeek = getWeekCode(currentDate);
  const currentDay = getDayCode(currentDate);

  const dataToDisplay = safeKuliahData.filter(item => {
    const arr = item.split("|");
    const week = arr[0];
    const day = arr[1];
    return week === currentWeek && day === currentDay;
  });

  if (dataToDisplay.length === 0) {
    const kuliahTemplate = applyConfig(slidesTemplate.kuliahHari, 'kuliahHari');
    const kuliahHariSlide = JSON.parse(JSON.stringify(kuliahTemplate));
    const parent = kuliahHariSlide.captions[0];
    if (parent && parent.children && parent.children.length >= 1) {
      parent.children[0].content = 'KULIAH HARI INI';
      const bodyMsg = {
        type: 'div', transition: 'auto', duration: 1000, content: 'Tiada kuliah hari ini...',
        style: { position: 'absolute', left: 0, right: 0, top: top(350), width: getContainerSize().width, height: 300, textAlign: 'center', fontSize: 200, color: '#000000', fontFamily: "'SairaCondensed', sans-serif", fontWeight: 'bold', lineHeight: 120, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }
      };
      parent.children = [parent.children[0], bodyMsg];
    }
    kuliahHariSlide.transitionType = 'auto';
    return [kuliahHariSlide];
  }

  const groupedData = {};
  dataToDisplay.forEach(item => {
    const arr = item.split("|");
    const type = arr[2];
    const typeLabel = TYPE_LABELS[type] || type.toUpperCase();
    if (!groupedData[typeLabel]) groupedData[typeLabel] = [];
    groupedData[typeLabel].push(item);
  });

  const kuliahHariSlides = [];
  const categoryKeys = CATEGORY_ORDER.filter(cat => groupedData[cat]);

  categoryKeys.forEach((categoryTitle, categoryIndex) => {
    const categoryData = groupedData[categoryTitle];
    const item = categoryData[0];
    const arr = item.split("|");
    const penceramah = (arr[3] || "").trim();
    const imageCode = (arr[4] || "").trim();
    const kitab = (arr[5] || "").trim();
    if (!penceramah) return;

    const kuliahTemplate = applyConfig(slidesTemplate.kuliahWeekly, 'kuliahHari');
    const kuliahSlide = JSON.parse(JSON.stringify(kuliahTemplate));
    const parent = kuliahSlide.captions[0];

    if (parent && parent.children && parent.children.length >= 2) {
      const isLastCategory = categoryIndex === categoryKeys.length - 1;
      if (categoryIndex > 0) parent.transition = null;
      parent.transition2 = isLastCategory ? "CLIP|LR" : "NO_CLIP_OUT";

      parent.children[0].content = 'KULIAH HARI INI';
      if (categoryIndex > 0) parent.children[0].transition = null;
      parent.children[0].transition2 = isLastCategory ? "CLIP|LR" : "NO_CLIP_OUT";

      parent.children[1].content = categoryTitle;

      const cards = buildKuliahHariSingleCardChildren();
      parent.children = [parent.children[0], parent.children[1], ...cards];

      const base = 2;
      
      // Check jika kuliah ini ada dalam kuliah-batal.txt berdasarkan tarikh
      const batalInfo = isKuliahBatal(item, kuliahBatalData);
      
      const imagePath = resolveImagePath(imageCode, imagesData);
      if (parent.children[base]) {
        parent.children[base].content = imagePath;
        parent.children[base].style = getCenteredImageStyle(imagePath, parent.children[base].style);
      }
      if (parent.children[base + 1]) {
        const penceramahHtml = `<span style="display:block;font-size:72px;line-height:1.35;font-family:'Anton',sans-serif;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(penceramah)}</span>`;
        const kitabHtml = kitab ? `<div style="font-size:42px;word-wrap:break-word;white-space:normal;line-height:1.4;font-family:'Anton',sans-serif;text-align:left;">${esc(kitab)}</div>` : '';
        
        // Status label jika batal
        let statusHtml = '';
        if (batalInfo.isBatal) {
          const notes = (batalInfo.notes || '').trim();
          if (notes) {
            statusHtml = `<div style="font-size:42px;color:#ff0000;font-weight:bold;text-align:left;margin-top:10px;font-family:'Anton',sans-serif;">KULIAH DIBATALKAN DAN DIGANTIKAN DENGAN ${esc(notes).toUpperCase()}</div>`;
          } else {
            statusHtml = `<div style="font-size:42px;color:#ff0000;font-weight:bold;text-align:left;margin-top:10px;font-family:'Anton',sans-serif;">KULIAH DIBATALKAN</div>`;
          }
        }
        
        parent.children[base + 1].content = `${penceramahHtml}${kitabHtml}${statusHtml}`;
      }
    }

    kuliahSlide.transitionType = categoryIndex === 0 ? 'auto' : 'static';
    kuliahHariSlides.push(kuliahSlide);
  });

  return kuliahHariSlides;
};

/**
 * Default imej slideshow jika tiada data (public/img/slideshow)
 */
const DEFAULT_SLIDESHOW_IMAGES = [
  '/img/slideshow/mountant0.jpeg',
  '/img/slideshow/mountant1.jpg',
  '/img/slideshow/mountant2.jpeg',
  '/img/slideshow/mountant3.jpeg',
  '/img/slideshow/mountant4.jpg',
  '/img/slideshow/mountant5.jpg',
  '/img/slideshow/mountant6.jpg'
];

// Default duration untuk setiap slideshow slide (akan override dari slides.txt jika ada)
const SLIDESHOW_SLIDE_DURATION_DEFAULT = 5000;
// Duration pendek untuk slides tanpa caption (auto transition cepat)
const SLIDESHOW_NO_CAPTION_DURATION = 500;

/**
 * Process slideshow data ke multiple slides: satu slide per image (seperti slider lain)
 * Setiap slide = satu image dengan optional caption
 * Jika ada caption, tunjuk caption dengan duration normal
 * Jika tiada caption, slide akan auto transition cepat ke slide seterusnya
 * Duration diambil dari slidesConfigData.slideshow.duration (dari slides.txt) atau guna default
 * Transition boleh dikonfigurasi melalui slidesConfigData.slideshow.transition (jika 'FIXED' atau nama transition spesifik)
 * Jika tiada config atau config = 'RANDOM', setiap slide akan dapat random transition
 */
const processSlideshow = (slideshowData, slidesConfigData, applyConfig) => {
  // Process slideshowData: format { caption, image } atau fallback ke default images
  let list = [];
  if (slideshowData && Array.isArray(slideshowData) && slideshowData.length > 0) {
    list = slideshowData.map(item => {
      const caption = (item && item.caption) ? item.caption.trim() : '';
      const imagePath = (item && item.image) ? item.image : (typeof item === 'string' ? item : '');
      const path = imagePath && imagePath.startsWith('/') ? imagePath : `/${imagePath || ''}`;
      return { caption, image: path };
    }).filter(item => item.image);
  } else {
    // Fallback ke default images jika tiada data
    list = DEFAULT_SLIDESHOW_IMAGES.map(image => ({ caption: '', image }));
  }

  if (list.length === 0) return [];

  const template = applyConfig(slidesTemplate.slideshow, 'slideshow');
  const { width: w, height: h } = getContainerSize();

  // Dapatkan duration dari slides.txt (slidesConfigData.slideshow.duration) atau guna default
  const slideDuration = (slidesConfigData && slidesConfigData.slideshow && slidesConfigData.slideshow.duration)
    ? slidesConfigData.slideshow.duration
    : SLIDESHOW_SLIDE_DURATION_DEFAULT;

  // Array transition yang menarik untuk slideshow slides
  // Termasuk transitions yang menyerupai slideshow transitions (boleh pecah image dengan Cols, Rows, Clip, Formation)
  const availableTransitions = [
    // Transitions biasa (simple)
    'FADE',           // Fade in/out (classic)
    'CLIP|LR',        // Clip dari kiri ke kanan
    'CLIP|TB',        // Clip dari atas ke bawah
    'CLIP|L',         // Clip dari kiri
    'CLIP|R',         // Clip dari kanan
    'CLIP|CIRCLE',    // Clip dalam bentuk bulat
    'L',              // Slide dari kiri
    'R',              // Slide dari kanan
    'T',              // Slide dari atas
    'B',              // Slide dari bawah
    'TR',             // Slide dari top-right
    'ZMF|10',         // Zoom dengan fade
    'ZOOM|IN',        // Zoom in
    'ZOOM|OUT',       // Zoom out
    'ZOOM|FADE',      // Zoom dengan fade smooth
    'SLIDE|QUAD',     // Slide dengan easing quad
    'SLIDE|QUINT',    // Slide dengan easing quint
    'WAVE|IN',        // Wave effect masuk
    'BOUNCE|IN',      // Bounce effect masuk
    'ELASTIC|IN',     // Elastic effect masuk
    'ROTATE|ZOOM',    // Rotate dengan zoom
    'RTT|360',        // Rotate 360 darjah
    'SWIRL|IN',       // Swirl effect masuk
    'COLLAPSE|IN',    // Collapse effect masuk
    'EXPAND|OUT',     // Expand effect keluar
    'MCLIP|R',        // Move clip dari kanan
    'MCLIP|T',        // Move clip dari atas
    'DDGDANCE|RB',    // Dance effect
    'FLTTRWN|LT',     // Float dengan wave
    'ATTACK|BR',      // Attack effect dari bottom-right
    // Transitions yang menyerupai slideshow transitions (boleh pecah image)
    'COLLAPSE|RANDOM', // Collapse dengan random grid (pecah image)
    'CLIP|CHESS',      // Clip dengan chess pattern (pecah image)
    'WAVE|STAIRS',     // Wave dengan stairs formation (pecah image)
    'EXPAND|STAIRS',   // Expand dengan stairs formation (pecah image)
    'SLIDE|SWIRL',     // Slide dengan swirl formation (pecah image)
    'SLIDE|SQUARE',    // Slide dengan square formation (pecah image)
    'SLIDE|CIRCLE',    // Slide dengan circle formation (pecah image)
    'BOUNCE|STRAIGHT', // Bounce dengan straight formation (pecah image)
    'JUMP|CIRCLE',     // Jump dengan circle formation (pecah image)
    'JUMP|SWIRL',      // Jump dengan swirl formation (pecah image)
    'CLIP|IN',         // Clip in dengan grid (pecah image)
    'CLIP|LARGE',      // Clip dengan grid besar (pecah image)
    'SLIDE|ZIGZAG',    // Slide dengan zigzag formation (pecah image)
    'WAVE|RECT',       // Wave dengan rectangle cross formation (pecah image)
    'DANCE|INSIDE'     // Dance dengan grid (pecah image)
  ];

  // Dapatkan transition mode dari config
  const transitionConfig = slidesConfigData && slidesConfigData.slideshow && slidesConfigData.slideshow.transition
    ? slidesConfigData.slideshow.transition
    : 'RANDOM'; // Default: RANDOM untuk setiap slide dapat transition berbeza

  // Jika config adalah nama transition spesifik (bukan 'RANDOM'), guna transition tersebut untuk semua
  const useFixedTransition = transitionConfig !== 'RANDOM' && availableTransitions.includes(transitionConfig);

  const esc = escapeHtml;

  // Generate slides: satu slide per image
  const slideshowSlides = list.map((item, index) => {
    const slide = JSON.parse(JSON.stringify(template));
    const hasCaption = item.caption && item.caption.trim().length > 0;

    // Set image untuk slide
    slide.image = { src: item.image, alt: `Slideshow ${index + 1}` };

    // Set duration: normal jika ada caption, pendek jika tiada caption (auto transition cepat)
    slide.duration = hasCaption ? slideDuration : SLIDESHOW_NO_CAPTION_DURATION;

    // Set transitionType: 'auto' untuk slides dengan caption, 'static' untuk slides tanpa caption (auto transition)
    slide.transitionType = hasCaption ? 'auto' : 'static';

    // Pilih transition: fixed jika ada config spesifik, atau random untuk setiap slide
    const slideTransition = useFixedTransition
      ? transitionConfig
      : availableTransitions[Math.floor(Math.random() * availableTransitions.length)];

    // Jika ada caption, tambah caption ke slide
    // if (hasCaption) {
    //   slide.captions = [
    //     {
    //       type: 'div',
    //       transition: slideTransition,
    //       duration: slideDuration,
    //       content: esc(item.caption),
    //       style: {
    //         position: 'absolute',
    //         left: 0,
    //         right: 0,
    //         bottom: 50,
    //         width: w,
    //         textAlign: 'center',
    //         fontSize: 48,
    //         color: '#FFFFFF',
    //         fontFamily: "'SairaCondensed', sans-serif",
    //         fontWeight: 'bold',
    //         textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
    //         padding: '10px 20px',
    //         backgroundColor: 'rgba(0,0,0,0.5)'
    //       }
    //     }
    //   ];
    // } else {
    //   // Tiada caption, captions kosong
    //   slide.captions = [];
    // }
    slide.captions = [];

    return slide;
  });

  return slideshowSlides;
};

/**
 * Process kuliah data ke kalendar bulanan (group by week+day)
 * Papar slide kalendar walaupun data kosong (sel kosong)
 */
const processKuliahBulanan = (kuliahData, kuliahBatalData, slidesConfigData, applyConfig) => {
  const esc = escapeHtml;
  const safeKuliahData = kuliahData && Array.isArray(kuliahData) ? kuliahData : [];

  // Get current month dan current day
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();

  // Process semua data: calculate actual date
  const dataWithDates = safeKuliahData
    .filter(item => item.trim() !== '')
    .map(item => {
      const arr = item.split("|");
      const week = arr[0];
      const day = arr[1];
      const type = arr[2];
      const penceramah = (arr[3] || "").trim();
      const kitab = (arr[5] || "").trim();
      
      // Check jika kuliah ini ada dalam kuliah-batal.txt berdasarkan tarikh
      const isBatal = isKuliahBatal(item, kuliahBatalData);

      const calculatedDate = calculateDateFromCodes(week, day);
      const dayNumber = calculatedDate.getDate();
      const dayOfWeek = calculatedDate.getDay();

      return {
        date: calculatedDate,
        dayNumber: dayNumber,
        dayOfWeek: dayOfWeek,
        type: type,
        typeLabel: TYPE_LABELS[type] || type.toUpperCase(),
        penceramah: penceramah,
        kitab: kitab,
        isBatal: isBatal,
        original: item
      };
    })
    .filter(item => {
      return item.date.getFullYear() === currentYear && item.date.getMonth() === currentMonth;
    })
    .sort((a, b) => a.date - b.date);

  // Terus bina kalendar walaupun dataWithDates kosong (sel akan kosong)

  // Create calendar grid
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();

  const DAYS_PER_WEEK = 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const totalDays = daysInMonth;

  const calendarGrid = [];
  const calendarPositions = [];

  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const date = new Date(currentYear, currentMonth, dayNum);
    const dayOfWeek = date.getDay();

    let row = 0;
    let col = dayOfWeek;

    if (dayNum === 1) {
      row = 0;
      col = firstDayOfWeek;
    } else {
      const daysFromStart = dayNum - 1;
      row = Math.floor((firstDayOfWeek + daysFromStart) / 7);
      col = (firstDayOfWeek + daysFromStart) % 7;
    }

    const kuliahForDay = dataWithDates.filter(item => item.dayNumber === dayNum);

    calendarGrid.push({
      dayNumber: dayNum,
      dayOfWeek: dayOfWeek,
      date: date,
      kuliah: kuliahForDay
    });

    calendarPositions.push({ row, col });
  }

  // Create slide
  const kuliahBulananTemplate = applyConfig(slidesTemplate.kuliahBulanan, 'kuliahBulanan');
  const kuliahBulananSlide = JSON.parse(JSON.stringify(kuliahBulananTemplate));
  const parent = kuliahBulananSlide.captions[0];

  if (parent) {
    // Set kategori global
    if (parent.children && parent.children.length > 0) {
      parent.children[0].content = 'JADUAL KULIAH BULAN INI';
    }

    // Build cards
    const dayOfWeekArray = calendarGrid.map(d => d.dayOfWeek);
    const cards = buildKuliahBulananChildren(totalDays, dayOfWeekArray, calendarPositions);
    parent.children = [
      parent.children[0],
      ...cards
    ];

    // Set content untuk setiap card (wrapped: dayNumber + type+penceramah+kitab)
    for (let i = 0; i < totalDays; i++) {
      const dayData = calendarGrid[i];
      const base = 1 + i; // 1 untuk kategori global, 1 child per card (wrapped: dayNumber + type+penceramah+kitab)

      if (parent.children[base]) {
        const dayNumberStr = String(dayData.dayNumber).padStart(2, '0');
        const isToday = dayData.dayNumber === currentDay;

        // DayNumber HTML – warna berbeza jika hari ini; kedua-dua guna alpha 25% dalam hex (40 = 0.25)
        const dayNumberColor = isToday ? '#cc000040' : '#80808040';
        const dayNumberStyle = `text-align:right;font-size:117px;line-height:141px;font-family:'bebas',sans-serif;color:${dayNumberColor};`;
        const dayNumberHtml = `<div style="${dayNumberStyle}">${dayNumberStr}</div>`;

        // Type + Penceramah + Kitab HTML
        let contentHtml = '';
        if (dayData.kuliah && dayData.kuliah.length > 0) {
          const allKuliah = dayData.kuliah.map(k => {
            const typeLabel = k.type.toUpperCase();
            
            // Check jika kuliah ini ada dalam kuliah-batal.txt berdasarkan week+day+type
            const batalInfo = isKuliahBatalByWeekDay(k.original, kuliahBatalData);
            
            // Kitab: split by comma jika ada, kemudian papar setiap item dengan ul/li
            let kitabHtml = '';
            if (k.kitab) {
              // Split by comma dan trim setiap item
              const kitabItems = k.kitab.split(',').map(item => item.trim()).filter(item => item);
              // Setiap item kitab sebagai li dalam ul dengan bullet point
              // Strikethrough jika batal
              const kitabItemsHtml = kitabItems.map(item => {
                const itemStyle = batalInfo.isBatal
                  ? 'font-size:15px;word-wrap:break-word;white-space:normal;line-height:1;text-decoration:line-through;opacity:0.6'
                  : 'font-size:15px;word-wrap:break-word;white-space:normal;line-height:1';
                return `<li style="${itemStyle}">${esc(item)}</li>`;
              }).join('');
              kitabHtml = `<ul style="margin-top:-3px;margin-left:19px;list-style-type:square">${kitabItemsHtml}</ul>`;
            }
            
            // Strikethrough pada penceramah jika batal
            const penceramahStyle = batalInfo.isBatal
              ? 'font-size:20px; line-height:1.2;text-decoration:line-through;opacity:0.6'
              : 'font-size:20px; line-height:1.2';
            
            return `<div style="display:flex; flex-direction:column; margin-bottom:5px">
              <div style="white-space:nowrap; max-width:246px; overflow:hidden; text-overflow:ellipsis;display:flex; margin-bottom:3px">
                <div style="font-size:16px;width:25px">${typeLabel}</div>
                <span style="line-height:1; margin:0 2px">:</span>
                <div style="${penceramahStyle}">${esc(k.penceramah)}</div>
              </div>
              ${kitabHtml}
            </div>`;
          }).join('');

          contentHtml = `<div style="font-size:20px;font-family:'Roboto',sans-serif;font-weight:bold; position:absolute; top: 0">${allKuliah}</div>`;
        }

        // Wrapped content: dayNumber + type+penceramah+kitab dengan background merah jika hari ini
        parent.children[base].content = `${dayNumberHtml}${contentHtml}`;

        // Set background color pada style element jika hari ini
        if (isToday) {
          parent.children[base].style = { ...parent.children[base].style, border: '6px solid rgb(255, 0, 0)', borderRadius: '5px' };
        }
      }
    }
  }

  return [kuliahBulananSlide];
};

/**
 * Custom hook untuk menguruskan slides data
 * Handle loadSlides dan generate announce slides dari rawData
 * Menggunakan data dari DataContext (memory) untuk elakkan fetch berulang
 */
export const useSlides = () => {
  const [slideData, setSlideData] = useState([slidesTemplate.home]);
  const [loading, setLoading] = useState(true);
  const { announcementsData, kuliahData, kuliahBatalData, imagesData, slidesConfigData, slideshowData, loading: dataLoading, isReloading, reloadCounter } = useData();

  // Simpan originalDateTime untuk setiap announcement (untuk update countdown dinamik)
  const announcementDateTimesRef = useRef([]);

  // Memoize slideData structure - hanya regenerate bila content benar-benar berubah (bukan countdown)
  // Countdown akan update secara dinamik tanpa re-init slider
  const stableSlideData = useMemo(() => {
    if (dataLoading) {
      return slideData;
    }

    // Apply config dari slides.txt ke template (jika ada)
    // Image dalam slides.txt sekarang adalah kod, perlu resolve ke path dari imagesData
    const applyConfig = (template, configKey) => {
      if (!slidesConfigData || !slidesConfigData[configKey]) return template;
      const cfg = slidesConfigData[configKey];
      const updated = { ...template };
      if (cfg.image) {
        // Resolve image code ke path dari imagesData; pastikan path mutlak (mula dengan /) supaya request ke origin betul
        let imagePath = imagesData && imagesData[cfg.image] ? imagesData[cfg.image] : cfg.image;
        if (imagePath && !imagePath.startsWith('/')) imagePath = '/' + imagePath;
        updated.image = { ...updated.image, src: imagePath };
      }
      if (cfg.duration != null) updated.duration = cfg.duration;
      if (cfg.datetime != null) updated.datetime = cfg.datetime;
      return updated;
    };

    const homeSlide = applyConfig(slidesTemplate.home, 'home');

    // Process semua slides menggunakan fungsi-fungsi berasingan
    const announceSlides = processAnnouncements(announcementsData, slidesConfigData, applyConfig);
    const kuliahHariSlides = processKuliahHarian(kuliahData, kuliahBatalData, imagesData, slidesConfigData, applyConfig);
    const kuliahMigguanSlides = processKuliahMingguan(kuliahData, kuliahBatalData, imagesData, slidesConfigData, applyConfig);
    const kuliahBulananSlides = processKuliahBulanan(kuliahData, kuliahBatalData, slidesConfigData, applyConfig);
    const slideshowSlides = processSlideshow(slideshowData, slidesConfigData, applyConfig);

    // Return slideData: home + announce + slideshow + kuliah hari + kuliah mingguan + kuliah bulanan
    return [homeSlide, ...announceSlides, ...kuliahHariSlides, ...kuliahMigguanSlides, ...kuliahBulananSlides, ...slideshowSlides];
    // return [...kuliahMigguanSlides];
  }, [announcementsData, kuliahData, kuliahBatalData, imagesData, slidesConfigData, slideshowData, dataLoading, isReloading, reloadCounter]); // PENTING: Mesti include semua data sources + reloadCounter

  // Update slideData hanya bila stableSlideData structure berubah
  useEffect(() => {
    if (dataLoading) {
      setLoading(true);
      return;
    }

    setSlideData(stableSlideData);
    setLoading(false);
  }, [stableSlideData, dataLoading]);

  return { slideData, loading };
};
