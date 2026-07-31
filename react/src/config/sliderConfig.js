// ============================================================================
// IMPORTS
// ============================================================================
// Import screen utilities dari utils folder
import { getContainerSize, top, bottom, sz, height } from '../utils/screenUtils';
// Import build functions dan constants dari slideBuilders
import { buildKuliahWeeklyChildren, KULIAH_NUM_CARDS } from './slideBuilders';
import { MOSQUE_NAME, MOSQUE_LOCATION, HOME_SLIDE_BACKGROUND } from './mosqueInfo';
import { withAssetBase } from '../services/apiBase';

// ============================================================================
// HOME TITLE BUILDER (Teks Hardcoded, Styling Dinamik)
// ============================================================================
/**
 * Build home template dengan styling dinamik dari HOME_TITLE_CONFIG
 * TEKS adalah HARDCODED untuk protect dari cetak rompak
 * @param {Object} homeTitleConfig - Config untuk styling title home (tanpa text)
 * @returns {Object} Home slide template
 */
export const buildHomeTemplate = (homeTitleConfig = {}) => {
  const {
    SHOW_TITLE = true,
    TITLE1_TOP = 120,
    TITLE_LEFT = 0,
    TITLE_RIGHT = 0,
    TITLE_BG = 'transparent',
    TITLE_GAP = 30,
    TITLE_ALIGN = 'center',
    TITLE1_SIZE = 88,
    TITLE1_COLOR = '#00FFFF',
    TITLE2_SIZE = 88,
    TITLE2_COLOR = '#00FFFF',
    DURATION_SEC = 10,
  } = homeTitleConfig;

  const showTitle = SHOW_TITLE !== false;

  const alignItems = TITLE_ALIGN === 'left' ? 'flex-start' : TITLE_ALIGN === 'right' ? 'flex-end' : 'center';

  const _now = new Date();
  const _h12 = _now.getHours() % 12 || 12;
  const _m2 = String(_now.getMinutes()).padStart(2, '0');

  // Initial gregorian date values
  const _gDay = String(_now.getDate()).padStart(2, '0');
  const _gDayName = ['AHAD','ISNIN','SELASA','RABU','KHAMIS','JUMAAT','SABTU'][_now.getDay()];
  const _gMonth = ['JAN','FEB','MAC','APR','MEI','JUN','JUL','OGO','SEP','OKT','NOV','DIS'][_now.getMonth()];
  const _gYear = _now.getFullYear();

  // Initial prayer times dari localStorage (dikemaskini oleh useTimeDriver pada tick pertama)
  const _prayerData = (() => {
    try {
      const today = _now.toISOString().slice(0, 10);
      return JSON.parse(localStorage.getItem(`ipray-prayer-times-${today}`) || 'null')
        ?? JSON.parse(localStorage.getItem('ipray-prayer-times') || 'null')
        ?? {};
    } catch (e) { return {}; }
  })();

  const _fmtP = (t) => {
    if (!t) return '--:--';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')}`;
  };

  const _PRAYERS = ['Subuh', 'Syuruk', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];
  const _dSz = height(86);
  const _dLb = height(36);
  const _dW  = Math.round(sz().width * 0.25);
  const _pTS = height(95);
  const _pLS = height(39);

  // Caption date gregorian — top-left, diupdate useTimeDriver via id
  const dateGregorianCaption = {
    type: "div", transition: "CLIP|L", duration: 1500,
    style: { position: 'absolute', left: 0, top: 0 },
    content: `<div style="display:flex;align-items:flex-start;gap:8px;background-color:rgba(71,71,71,0.78);clip-path:polygon(0 0,100% 0,88% 100%,0 100%);padding:0 ${height(16)}px ${height(4)}px;width:${_dW}px;font-family:'Bebas',sans-serif;text-shadow:3px 3px 0px rgba(0,0,0,1);"><div id="ipray-date-g-day" style="font-size:${_dSz}px;line-height:1;font-weight:normal;color:#FF00FF;">${_gDay}</div><div style="display:flex;flex-direction:column;font-size:${_dLb}px;line-height:1.2;font-weight:normal;padding-top:${height(4)}px;"><div id="ipray-date-g-dayname" style="color:#FFFFFF;">${_gDayName}</div><div style="color:#00FFFF;"><span id="ipray-date-g-month">${_gMonth}</span> <span id="ipray-date-g-year">${_gYear}</span></div></div></div>`
  };

  // Caption date hijri — top-right, diisi useTimeDriver (perlu takwim data)
  const dateHijriCaption = {
    type: "div", transition: "R", duration: 1500,
    style: { position: 'absolute', right: 0, top: 0 },
    content: `<div style="display:flex;justify-content:flex-end;gap:8px;background-color:rgba(71,71,71,0.78);clip-path:polygon(0 0,100% 0,100% 100%,12% 100%);padding:0 ${height(16)}px ${height(4)}px;width:${_dW}px;font-family:'Bebas',sans-serif;text-shadow:3px 3px 0px rgba(0,0,0,1);"><div style="display:flex;flex-direction:column;font-size:${_dLb}px;line-height:1.2;font-weight:normal;padding-top:${height(4)}px;text-align:right;"><div id="ipray-date-h-month" style="color:#FFFFFF;"></div><div id="ipray-date-h-year" style="color:#00FFFF;"></div></div><div id="ipray-date-h-day" style="font-size:${_dSz}px;line-height:1;font-weight:normal;color:#FF00FF;"></div></div>`
  };

  // Caption prayer times — bottom-left flex row, teks diisi useTimeDriver
  const prayerTimesCaption = {
    type: "div", transition: "B", duration: 1500,
    style: {
      position: 'absolute',
      left: 0, bottom: 0,
      display: 'flex', backgroundColor: 'rgba(16,16,16,0)' ,
      color: '#FFFF00',
      fontFamily: "'Bebas', sans-serif", fontWeight: 'normal'
    },
    content: _PRAYERS.map(name => {
      const n = name.toLowerCase();
      const t = _fmtP(_prayerData[name]);
      const [tH, tM] = t.split(':');
      return `<div id="ipray-wrap-${n}" style="display:flex;flex-direction:column;align-items:center;padding:${height(8)}px ${height(16)}px;"><div id="ipray-label-${n}" style="font-family:'Bebas',sans-serif;font-size:${_pLS}px;color:#FFFF00;text-shadow:4px 4px 0 rgba(0,0,0,1);padding-bottom:${height(4)}px;line-height:1;font-weight:normal;transition:color 0.3s ease;">${name.toUpperCase()}</div><div id="ipray-time-${n}" style="font-family:'Bebas',sans-serif;font-size:${_pTS}px;line-height:1;font-weight:normal;color:#FFFF00;text-shadow:3px 3px 0 rgba(0,0,0,1);transition:color 0.3s ease;"><span id="ipray-time-${n}-h">${tH}</span><span id="ipray-colon-${n}" style="transition:none">:</span><span id="ipray-time-${n}-m">${tM}</span></div></div>`;
    }).join('')
  };

  // Caption clock — elemen dengan ID ini diupdate oleh useTimeDriver setiap saat (DOM-driven)
  const clockCaption = {
    type: "div", transition: "MCLIP|R", duration: 1500,
    style: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      fontFamily: "'Bebas', monospace",
      fontWeight: "900",
      fontSize: height(128),
      // lineHeight: 1,
      // fontWeight: 'normal',
      transform: "scaleY(1.0)",
      color: '#FFFF00',
      textShadow: '3px 3px 0px rgba(0,0,0,1)',
      backgroundColor: 'rgba(16,16,16,0.5)',
      borderTopLeftRadius: height(10),
      // padding: `${height(4)}px ${height(18)}px ${height(17)}px ${height(24)}px`,
      padding: `${height(0)}px ${height(18)}px ${height(0)}px ${height(24)}px`,
    },
    content: `<span id="ipray-clock-h">${_h12}</span><span id="ipray-clock-colon" style="transition:none">:</span><span id="ipray-clock-m">${_m2}</span>`
  };

  const captions = showTitle ? [
      {
        type: "div", transition: "auto", duration: 1500,
        style: {
          left: TITLE_LEFT, right: TITLE_RIGHT, top: top(TITLE1_TOP),
          textShadow: '3px 3px 0px rgba(0,0,0,1)', fontWeight: 'bold',
          fontFamily: "'din_bold', sans-serif", lineHeight: 70, margin: '3rem auto 14px',
          backgroundColor: TITLE_BG,
        },
        content: `<div style="transform:scale(1.8, 2.40); display: flex; flex-direction: column; align-items: ${alignItems}; justify-content: center; gap: ${TITLE_GAP}px; text-align: ${TITLE_ALIGN};">
        <span style="font-size: ${TITLE1_SIZE}px; color: ${TITLE1_COLOR};">${MOSQUE_NAME}</span>
        <span style="font-size: ${TITLE2_SIZE}px; color: ${TITLE2_COLOR};">${MOSQUE_LOCATION}</span>
        </div>`
      },
      clockCaption,
      dateGregorianCaption,
      dateHijriCaption,
      prayerTimesCaption,
    ] : [clockCaption, dateGregorianCaption, dateHijriCaption, prayerTimesCaption];

  return {
    type: 'home',
    duration: DURATION_SEC * 1000,
    transitionType: 'auto',
    image: { src: HOME_SLIDE_BACKGROUND, alt: "Slide 1" },
    captions,
  };
};


// ============================================================================
// CONSTANTS
// ============================================================================
// Debug mode: set true untuk development, false untuk production
// DEBUG: true = autoPlay false, loop 0 | DEBUG: false = autoPlay true, loop 1
const DEBUG = false;

// Urutan caption untuk convert object captions kepada array (jika guna flat)
export const CAPTION_ORDER = ['kategori', 'tajuk', 'penceramah', 'tema', 'tarikh', 'masa', 'lokasi', 'sasaran', 'countdown'];

// Order children dalam parent announce (indeks = item[] selepas restructure)
// item[1]=tajuk, [2]=penceramah, [3]=tema, [4]=tarikh, [5]=masa, [6]=lokasi, [7]=sasaran, [8]=countdown
export const ANNOUNCE_CHILDREN_ORDER = ['tajuk', 'penceramah', 'tema', 'tarikh', 'masa', 'lokasi', 'sasaran', 'countdown'];

// Order untuk kuliah subs (children dalam parent)
// Data: image|penceramah|hari,dd mmm|kitab — paparan hari: "hari | dd mmm"
export const KULIAH_SUBS_ORDER = ['imagePenceramah', 'teksGabungan'];

// Template 1 card: image + 1 div text gabungan (penceramah + hari)
// Kategori global: 'JADUAL KULIAH MINGGUAN' (di top, children[0])
// Header kategori: "KULIAH SUBUH", "KULIAH DHUHA", etc (di bawah kategori, children[1])
// Cards: image + teks gabungan (children[2..n])
// KULIAH_NUM_CARDS diimport dari slideBuilders.js
export { KULIAH_NUM_CARDS };

// ============================================================================
// SLIDER CONFIG
// ============================================================================
export const sliderConfig = {
  container: {
    id: "slider1_container",
    get width() { return getContainerSize().width; },
    get height() { return getContainerSize().height; },
    minWidth: 320,
    maxWidth: 3840,
    fitMode: 'cover'
  },
  options: {
    // autoPlay: true = automatic play slides, false = manual navigation sahaja
    autoPlay: !DEBUG,
    // loop: 1 = loop dari slide terakhir kembali ke slide pertama, 0 = tiada loop (stop di slide terakhir)
    loop: DEBUG ? 0 : 1,
    autoPlaySteps: 1,
    autoPlayInterval: 3000,
    startIndex: 0, // pada refresh/init: mulakan di slide 0 (slide mula) supaya caption reset
    pauseOnHover: 0,
    arrowKeyNavigation: true,
    slideEasing: "$JssorEasing$.$EaseOutQuint",
    slideDuration: 800,
    minDragOffsetToSlide: 20,
    slideSpacing: 0,
    displayPieces: 1,
    parkingPosition: 0,
    uiSearchMode: 1,
    playOrientation: 1,
    dragOrientation: 0
  },
  loading: {
    enabled: true,
    image: "/img/loading.gif"
  }
};

// ============================================================================
// SLIDES TEMPLATE
// ============================================================================
export const slidesTemplate = {
  // Home slide - HARDCODED untuk protect dari cetak rompak
  home: {
    type: 'home',
    duration: 1000,
    transitionType: 'auto',
    image: { src: HOME_SLIDE_BACKGROUND, alt: "Slide 1" },
    captions: [
      {
        type: "div", transition: "CLIP|LR", duration: 1500,
        style: { left: 0, right: 0, top: top(120), width: sz().width, height: 70, textAlign: 'center', fontSize: 88, color: '#00FFFF', textShadow: '3px 3px 0px rgba(0,0,0,1)', fontWeight: 'bold', fontFamily: "'din_bold', sans-serif", lineHeight: 70, margin: '3rem auto 14px' },
        content: MOSQUE_NAME
      },
      // {
      //   type: "div", transition: "CLIP|LR", duration: 1500, delay: 700,
      //   style: { left: 0, right: 0, top: top(120 + 70 + 60), width: sz().width, height: 70, textAlign: 'center', fontSize: 88, color: '#00FFFF', textShadow: '3px 3px 0px rgba(0,0,0,1)', fontWeight: 'bold', fontFamily: "'din_bold', sans-serif", lineHeight: 70, margin: '3rem auto 14px' },
      //   content: MOSQUE_LOCATION
      // },
    ],
  },
  announce: {
    type: 'announce',
    transitionType: 'auto',
    image: { src: withAssetBase("/images/slides/picture4.jpg"), alt: "Slide 2" },
    // Captions struktur parent-child (sama konsep kuliah)
    // Parent: kategori (PENGUMUMAN/PEMBERITAHUAN) - play in pertama, play out terakhir
    // Children: 8 (tajuk, penceramah, tema, tarikh, masa, lokasi, sasaran, countdown)
    captions: [
      {
        // Parent - di-control PlayIn/PlayOut dalam useSlides
        type: "div",
        duration: 500,
        style: { position: 'absolute', left: 0, top: 0, width: sz().width, height: sz().height },
        children: [
          {
            type: "div", transition: "CLIP|LR", duration: 1000, content: "",
            style: { position: 'absolute', left: 0, right: 0, top: top(33), width: sz().width, height: 70, textAlign: 'center', fontSize: 80, color: '#FFFFFF', fontFamily: "'SairaCondensed', sans-serif", fontWeight: 'bold', lineHeight: 70, margin: 0 },
          },
          {
            type: "div", transition: "CLIP|LR", duration: 1000, content: "",
            style: { position: 'absolute', left: 0, right: 0, top: top(166), width: sz().width, height: 50, textAlign: 'center', fontSize: 47, color: 'rgb(245 206 28)', fontWeight: 'bold', fontFamily: "system-ui", letterSpacing: '3px', transform: 'scaleX(0.85)', transformOrigin: 'center center', lineHeight: 50, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
          },
          {
            type: "div", transition: "CLIP|LR", delay: -500, content: "",
            style: { position: 'absolute', left: 0, top: top(229), width: sz().width, height: 70, fontSize: 47, textAlign: 'center', fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '-53px' },
          },
          {
            type: "div", transition: "CLIP|L", delay: -500, content: "",
            style: { position: 'absolute', left: 0, top: top(314), width: sz().width, height: 70, fontSize: 47, fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '603px' },
          },
          {
            type: "div", transition: "CLIP|L", delay: -300, content: "",
            style: { position: 'absolute', left: 0, top: top(398), width: sz().width, height: 70, fontSize: 47, fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '603px' },
          },
          {
            type: "div", transition: "CLIP|L", delay: -300, content: "",
            style: { position: 'absolute', left: 0, top: top(480), width: sz().width, height: 70, fontSize: 47, fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '603px' },
          },
          {
            type: "div", transition: "CLIP|L", delay: -300, content: "",
            style: { position: 'absolute', left: 0, top: top(560), width: sz().width, height: 70, fontSize: 47, fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '603px' },
          },
          {
            type: "div", transition: "CLIP|L", delay: -300, content: "",
            style: { position: 'absolute', left: 0, top: top(642), width: sz().width, height: 70, fontSize: 47, fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '603px' },
          },
          {
            type: "div", transition: "CLIP|LR", delay: -300, content: "",
            style: { position: 'absolute', left: 0, bottom: bottom(192), width: sz().width, height: 180, textAlign: 'center', fontSize: 62, color: '#FFFFFF', fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 180, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
          }
        ]
      }
    ]
  },
  countDown: {
    type: 'countDown',
    transitionType: 'auto',
    image: null,
    captions: [
      {
        type: "div",
        duration: 500,
        style: { position: 'absolute', left: 0, top: 0, width: sz().width, height: sz().height },
        children: [
          {
            type: "div", transition: "CLIP|LR", duration: 1000, content: "",
            // style: { position: 'absolute', left: 0, right: 0, top: `${top(30)}%`, width: sz().width, height: height(200), textAlign: 'center', fontSize: 200, color: '#FFFFFF', fontFamily: "'SairaCondensed', sans-serif", fontWeight: 'bold', lineHeight: 1.2, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',clip:'auto' }
            style: { position: 'absolute', left: 0, right: 0, top: `${top(30)}%`, width: sz().width, textAlign: 'center', fontSize: 200, 
            color: '#FFFFFF', fontFamily: "'SairaCondensed', sans-serif", fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',clip:'auto' }
          },
          {
            type: "div", transition: "CLIP|LR", duration: 1000, content: "",
            style: { position: 'absolute', left: 0, right: 0, bottom: bottom(220), width: sz().width, height: 180, textAlign: 'center', fontSize: 100, color: 'rgb(245 206 28)', fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 180, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }
          }
        ]
      }
    ]
  },
  kuliahHari: {
    type: 'kuliahHari',
    transitionType: 'auto',
    image: { src: withAssetBase("/images/slides/picture4.jpg"), alt: "Kuliah Harian" },
    captions: [
      {
        // Parent container - di-control PlayIn/PlayOut dalam useSlides (sama konsep announcement)
        type: "div",
        duration: 500,
        style: { position: 'absolute', left: -3, top: 0, width: sz().width, height: sz().height },
        // Children: 1 kategori global + 1 header kategori + dynamic cards (tajuk kategori, image, teks gabungan). Data isi dalam useSlides.
        children: [
          {
            type: "div", transition: "CLIP|LR", duration: 1000, content: "KULIAH HARI INI",
            style: { position: 'absolute', left: 0, right: 0, top: top(33), width: sz().width, height: 70, textAlign: 'center', fontSize: 80, color: '#FFFFFF', fontFamily: "'SairaCondensed', sans-serif", fontWeight: 'bold', lineHeight: 70, margin: 0 }
          },
          // Header kategori - "KULIAH SUBUH", "KULIAH DHUHA", etc (di-set dalam useSlides)
          {
            type: "div", transition: "CLIP|LR", duration: 1000, content: "",
            style: { position: 'absolute', left: 0, right: 0, top: top(166), width: sz().width, height: 50, textAlign: 'center', fontSize: 47, color: 'rgb(245 206 28)', fontWeight: 'bold', fontFamily: "system-ui", letterSpacing: '3px', transform: 'scaleX(0.85)', transformOrigin: 'center center', lineHeight: 50, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
          },
          // {
          //   type: "div", transition: "CLIP|LR", delay: -500, content: "PENCERAMAH",
          //   style: { position: 'absolute', left: 0, top: top(229), width: sz().width, height: 70, fontSize: 47, textAlign: 'center', fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '-53px' },
          // },
          // {
          //   type: "div", transition: "CLIP|L", delay: -500, content: "NAMA KITAB",
          //   style: { position: 'absolute', left: 0, top: top(314), width: sz().width, height: 70, fontSize: 47, fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '603px' },
          // },
        ]
      }
    ]
  },
  kuliahWeekly: {
    type: 'kuliahWeekly',
    transitionType: 'auto',
    image: { src: withAssetBase("/images/slides/picture4.jpg"), alt: "Kuliah Mingguan" },
    // Captions struktur parent-child
    // Parent: container yang play in sekali (slide pertama), play out sekali (slide terakhir)
    // Children: 1 kategori + 6×3=18 (kategori, 6 cards: tajuk kategori + image + teks gabungan). Teks gabungan = penceramah + hari.
    captions: [
      {
        // Parent container - di-control PlayIn/PlayOut dalam useSlides (sama konsep announcement)
        type: "div",
        duration: 500,
        style: { position: 'absolute', left: 0, top: 0, width: sz().width, height: sz().height },
        // Children: 1 kategori global + 1 header kategori + dynamic cards (tajuk kategori, image, teks gabungan). Data isi dalam useSlides.
        children: [
          // Kategori global - "JADUAL KULIAH MINGGUAN" (di-set dalam useSlides)
          {
            type: "div", transition: "CLIP|LR", duration: 0, content: "KULIAH MINGGU INI",
            style: { position: 'absolute', left: 0, right: 0, top: top(33), width: sz().width, height: 70, textAlign: 'center', fontSize: 80, color: '#FFFFFF', fontFamily: "'SairaCondensed', sans-serif", fontWeight: 'bold', lineHeight: 70, margin: 0 }
          },
          // Header kategori - "KULIAH SUBUH", "KULIAH DHUHA", etc (di-set dalam useSlides)
          {
            type: "div", transition: "CLIP|LR", transition2:"NO_CLIP_OUT", duration: 0, content: "",
            style: { position: 'absolute', left: 0, right: 0, top: top(160), width: sz().width, height: 50, textAlign: 'center', fontSize: 47, color: 'rgb(245 206 28)', fontWeight: 'bold', fontFamily: "system-ui", letterSpacing: '3px', transform: 'scaleX(0.85)', transformOrigin: 'center center', lineHeight: 50, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }
          },
          // Cards akan di-build dynamically dalam useSlides berdasarkan bilangan items dalam kategori
          ...buildKuliahWeeklyChildren()
        ]
      }
    ]
  },
  kuliahBulanan: {
    type: 'kuliahBulanan',
    transitionType: 'auto',
    image: { src: withAssetBase("/images/slides/picture4.jpg"), alt: "Kuliah Bulanan" },
    // Captions struktur parent-child
    // Parent: container yang play in sekali (slide pertama), play out sekali (slide terakhir)
    // Children: 1 kategori + 6×3=18 (kategori, 6 cards: tajuk kategori + image + teks gabungan). Teks gabungan = penceramah + hari.
    captions: [
      {
        // Parent container - di-control PlayIn/PlayOut dalam useSlides (sama konsep announcement)
        type: "div",
        duration: 1500,
        style: { position: 'absolute', left: 0, top: 0, width: sz().width, height: sz().height },
        // Children: 1 kategori global + 1 header kategori + dynamic cards (tajuk kategori, image, teks gabungan). Data isi dalam useSlides.
        children: [
          // Kategori global - "JADUAL KULIAH MINGGUAN" (di-set dalam useSlides)
          {
            type: "div", transition: "CLIP|LR", duration: 1000, content: 'JADUAL KULIAH BULAN INI',
            style: { position: 'absolute', left: 0, right: 0, top: top(33), width: sz().width, height: 70, textAlign: 'center', fontSize: 80, color: '#FFFFFF', fontFamily: "'SairaCondensed', sans-serif", fontWeight: 'bold', lineHeight: 70, margin: 0 }
          },
          // Cards akan dibina dinamik dalam useSlides menggunakan buildKuliahBulananChildren
          // Setiap card ada 2 children: [0]=no hari, [1]=type+penceramah
        ]
      }
    ]
  },
  // Slideshow: satu slide, captions = array imej (FADE berurutan). Data dari slideshow.txt / default public/img/slideshow
  slideshow: {
    type: 'slideshow',
    transitionType: 'auto',
    image: { src: "/img/slideshow/mountant0.jpeg", alt: "Slideshow" },
    // Captions: array imej dibina dalam useSlides (processSlideshow) - setiap caption type img, FADE, delay berurutan
    captions: []
  }
};
