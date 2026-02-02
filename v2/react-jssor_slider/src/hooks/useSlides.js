import { useState, useEffect, useMemo, useRef } from 'react';
import { slidesTemplate, CAPTION_ORDER, KULIAH_NUM_CARDS, sliderConfig, buildKuliahWeeklyCategoryChildren, buildKuliahBulananChildren } from '../config/sliderConfig';
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
 * Process kuliah data ke slides (group by type)
 */
const processKuliah = (kuliahData, imagesData, slidesConfigData, applyConfig) => {
  if (!kuliahData || kuliahData.length === 0) return [];
  
  const esc = escapeHtml;
  
  // Dapatkan current week berdasarkan current date
  // RULE: week = ceil(day_of_month / 7)
  const currentDate = new Date();
  const currentWeek = getWeekCode(currentDate);
  
  // Filter data untuk current week sahaja (semua hari dalam minggu tersebut)
  // RULE: Show ONLY data for the CURRENT week
  let dataToDisplay = kuliahData.filter(item => {
    const arr = item.split("|");
    const week = arr[0];
    return week === currentWeek;
  });
  
  // Jika tiada data untuk current week, return empty array
  if (dataToDisplay.length === 0) {
    return [];
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
  
  // Define urutan paparan kategori: km → kd → ks → kk
  const CATEGORY_ORDER = ['KULIAH MAGHRIB', 'KULIAH DHUHA', 'KULIAH SUBUH', 'KULIAH KHAS'];
  
  // Create slide untuk setiap kategori (ikut urutan yang ditetapkan)
  const kuliahSlides = [];
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
        
        // Element 1: Penceramah + Kitab + Date (wrapped dalam satu div untuk transition serentak)
        if (parent.children[base + 1]) {
          const penceramahHtml = `<span style="display:block;font-size:46px;line-height:1.35;font-family:'Anton',sans-serif;text-align:${textAlign};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(penceramah)}</span>`;
          const kitabHtml = kitab ? `<div style="font-size:25px;word-wrap:break-word;white-space:normal;line-height:1.4;font-family:'Anton',sans-serif;text-align:${textAlign};">${esc(kitab)}</div>` : '';
          const dateHtml = hariTarikh ? `<span style="display:block;font-size:34px;line-height:1.35;font-family:'Anton',sans-serif;text-align:${textAlign};">${esc(hariTarikh)}</span>` : '';
          
          // parent.children[base + 1].content = `<div style="display:flex;flex-direction:column;gap:5px">${penceramahHtml}${kitabHtml}${dateHtml}</div>`;
          parent.children[base + 1].content = `${penceramahHtml}${kitabHtml}${dateHtml}`;
        }
      }
    }
    
    kuliahSlide.transitionType = categoryIndex === 0 ? 'auto' : 'static';
    kuliahSlides.push(kuliahSlide);
  });
  
  return kuliahSlides;
};

/**
 * Process kuliah data ke kalendar bulanan (group by week+day)
 */
const processKuliahBulanan = (kuliahData, slidesConfigData, applyConfig) => {
  if (!kuliahData || kuliahData.length === 0) return [];
  
  const esc = escapeHtml;
  
  // Get current month dan current day
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();
  
  // Process semua data: calculate actual date
  const dataWithDates = kuliahData
    .filter(item => item.trim() !== '')
    .map(item => {
      const arr = item.split("|");
      const week = arr[0];
      const day = arr[1];
      const type = arr[2];
      const penceramah = (arr[3] || "").trim();
      const kitab = (arr[5] || "").trim();
      
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
        original: item
      };
    })
    .filter(item => {
      return item.date.getFullYear() === currentYear && item.date.getMonth() === currentMonth;
    })
    .sort((a, b) => a.date - b.date);
  
  if (dataWithDates.length === 0) return [];
  
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
        
        // DayNumber HTML
        const dayNumberStyle = `text-align:right;font-size:117px;line-height:141px;font-family:'bebas',sans-serif;color:#80808040;`;
        const dayNumberHtml = `<div style="${dayNumberStyle}">${dayNumberStr}</div>`;
        
        // Type + Penceramah + Kitab HTML
        let contentHtml = '';
        if (dayData.kuliah && dayData.kuliah.length > 0) {
          const allKuliah = dayData.kuliah.map(k => {
            const typeLabel = k.type.toUpperCase();
            // Kitab: split by comma jika ada, kemudian papar setiap item dengan ul/li
            let kitabHtml = '';
            if (k.kitab) {
              // Split by comma dan trim setiap item
              const kitabItems = k.kitab.split(',').map(item => item.trim()).filter(item => item);
              // Setiap item kitab sebagai li dalam ul dengan bullet point
              const kitabItemsHtml = kitabItems.map(item => {
                return `<li style="font-size:15px;word-wrap:break-word;white-space:normal;line-height:1;">${esc(item)}</li>`;
              }).join('');
              kitabHtml = `<ul style="margin-top:-3px;margin-left:19px;list-style-type:square">${kitabItemsHtml}</ul>`;
            }
            return `<div style="display:flex; flex-direction:column; margin-bottom:5px">
              <div style="white-space:nowrap; max-width:246px; overflow:hidden; text-overflow:ellipsis;display:flex; margin-bottom:3px">
                <div style="font-size:16px;width:25px">${typeLabel}</div>
                <span style="line-height:1; margin:0 2px">:</span>
                <div style="font-size:20px; line-height:1.2">${esc(k.penceramah)}</div>
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
          parent.children[base].style = {...parent.children[base].style,backgroundColor: 'rgb(255 25 0 / 45%)'};
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
  const { announcementsData, kuliahData, imagesData, slidesConfigData, loading: dataLoading } = useData();
  
  // Simpan originalDateTime untuk setiap announcement (untuk update countdown dinamik)
  const announcementDateTimesRef = useRef([]);

  // Memoize slideData structure - hanya regenerate bila content benar-benar berubah (bukan countdown)
  // Countdown akan update secara dinamik tanpa re-init slider
  const stableSlideData = useMemo(() => {
    if (dataLoading) return slideData;
    
    // Apply config dari slides.txt ke template (jika ada)
    // Image dalam slides.txt sekarang adalah kod, perlu resolve ke path dari imagesData
    const applyConfig = (template, configKey) => {
      if (!slidesConfigData || !slidesConfigData[configKey]) return template;
      const cfg = slidesConfigData[configKey];
      const updated = { ...template };
      if (cfg.image) {
        // Resolve image code ke path dari imagesData
        const imagePath = imagesData && imagesData[cfg.image] ? imagesData[cfg.image] : cfg.image;
        updated.image = { ...updated.image, src: imagePath };
      }
      if (cfg.duration != null) updated.duration = cfg.duration;
      if (cfg.datetime != null) updated.datetime = cfg.datetime;
      return updated;
    };

    const homeSlide = applyConfig(slidesTemplate.home, 'home');

    // Process semua slides menggunakan fungsi-fungsi berasingan
    const announceSlides = processAnnouncements(announcementsData, slidesConfigData, applyConfig);
    const kuliahSlides = processKuliah(kuliahData, imagesData, slidesConfigData, applyConfig);
    const kuliahBulananSlides = processKuliahBulanan(kuliahData, slidesConfigData, applyConfig);

    // Return slideData: home + announce + kuliah + kuliahBulanan
    return [homeSlide, ...announceSlides, ...kuliahSlides, ...kuliahBulananSlides];
    // return [homeSlide];
  }, [announcementsData, kuliahData, imagesData, slidesConfigData, dataLoading]); // Exclude countdown dari dependencies

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
