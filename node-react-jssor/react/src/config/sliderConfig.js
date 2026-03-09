// ============================================================================
// IMPORTS
// ============================================================================
// Import screen utilities dari utils folder
import { getContainerSize, top, bottom, sz, height } from '../utils/screenUtils';
// Import build functions dan constants dari slideBuilders
import { buildKuliahWeeklyChildren, KULIAH_NUM_CARDS } from './slideBuilders';
import { MOSQUE_NAME, MOSQUE_LOCATION } from './mosqueInfo';

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
    TITLE1_TOP = 120,
    TITLE_LEFT = 0,
    TITLE_RIGHT = 0,
    TITLE_BG = 'transparent',
    TITLE_GAP = 30,
    TITLE_ALIGN = 'center',
    TITLE1_SIZE = 88,
    TITLE1_COLOR = '#00FFFF',
    TITLE2_SIZE = 88,
    TITLE2_COLOR = '#00FFFF'
  } = homeTitleConfig;

  const alignItems = TITLE_ALIGN === 'left' ? 'flex-start' : TITLE_ALIGN === 'right' ? 'flex-end' : 'center';

  return {
    type: 'home',
    duration: 1000,
    transitionType: 'auto',
    image: { src: "/images/slides/bg-mta.jpg", alt: "Slide 1" },
    captions: [
      {
        type: "div", transition: "CLIP|LR", duration: 1500,
        style: { 
          left: TITLE_LEFT, right: TITLE_RIGHT, top: top(TITLE1_TOP), //width: sz().width,
          textShadow: '3px 3px 0px rgba(0,0,0,1)', fontWeight: 'bold', 
          fontFamily: "'din_bold', sans-serif", lineHeight: 70, margin: '3rem auto 14px',
          backgroundColor: TITLE_BG,
          // '-webkit-text-stroke': '1px red',
          // webkitTextStrokeColor: 'red',
          // webkittextstrokewidth: '1px',
          clip: 'auto'
        },
        content: `<div style="display: flex; flex-direction: column; align-items: ${alignItems}; justify-content: center; gap: ${TITLE_GAP}px; text-align: ${TITLE_ALIGN};">
        <span style="font-size: ${TITLE1_SIZE}px; color: ${TITLE1_COLOR};">${MOSQUE_NAME}</span>
        <span style="font-size: ${TITLE2_SIZE}px; color: ${TITLE2_COLOR};">${MOSQUE_LOCATION}</span>
        </div>`
      },
    ],
    datetime: ['date', 'solat-time']
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
    image: { src: "/images/slides/bg-mta.jpg", alt: "Slide 1" },
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
    datetime: ['date', 'solat-time']
  },
  announce: {
    type: 'announce',
    transitionType: 'auto',
    datetime: [],
    image: { src: "/images/slides/picture4.jpg", alt: "Slide 2" },
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
    datetime: ['solat-time-small'],
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
    datetime: ['solat-time-small'],
    image: { src: "/images/slides/picture4.jpg", alt: "Kuliah Harian" },
    captions: [
      {
        // Parent container - di-control PlayIn/PlayOut dalam useSlides (sama konsep announcement)
        type: "div",
        duration: 500,
        style: { position: 'absolute', left: 0, top: 0, width: sz().width, height: sz().height },
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
    datetime: ['solat-time-small'],
    image: { src: "/images/slides/picture4.jpg", alt: "Kuliah Mingguan" },
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
    datetime: ['solat-time-small'],
    image: { src: "/images/slides/picture4.jpg", alt: "Kuliah Bulanan" },
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
    datetime: [],
    image: { src: "/img/slideshow/mountant0.jpeg", alt: "Slideshow" },
    // Captions: array imej dibina dalam useSlides (processSlideshow) - setiap caption type img, FADE, delay berurutan
    captions: []
  }
};
