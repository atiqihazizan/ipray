// ============================================================================
// IMPORTS
// ============================================================================
// Import screen utilities dari utils folder
import { getContainerSize, top, bottom, sz } from '../utils/screenUtils';
// Import build functions dan constants dari slideBuilders
import { buildKuliahWeeklyChildren, KULIAH_NUM_CARDS } from './slideBuilders';

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
  // masa: {
  //   enabled: true,
  //   position: { bottom: 0, right: 20 },
  //   size: 72,
  //   format: '12h',
  //   showSeconds: false,
  //   showAmPm: false,
  //   isCurrentTime: true,
  //   color: '#FFD700'
  // },
  loading: {
    enabled: true,
    image: "/img/loading.gif"
  }
};

// ============================================================================
// SLIDES TEMPLATE
// ============================================================================
export const slidesTemplate = {
  home: {
    duration: 1000, // Custom duration untuk slide 1 (5 saat)
    transitionType: 'auto', // 'auto' = automatic transition, 'static' = tiada transition
    image: { src: "/images/slides/bg-mta.jpg", alt: "Slide 1" },
    captions: [
      {
        type: "div", transition: "CLIP|LR", duration: 1500,
        style: { left: 0, right: 0, top: top(120), width: sz().width, height: 70, textAlign: 'center', fontSize: 88, color: '#00FFFF', textShadow: '3px 3px 0px rgba(0,0,0,1)', fontWeight: 'bold', fontFamily: "'din_bold', sans-serif", lineHeight: 70, margin: '3rem auto 14px' },
        content: "MASJID TUAN ABDULLAH"
      },
      {
        type: "div", transition: "CLIP|LR", duration: 500, delay: -300,
        style: { left: 0, right: 0, top: top(120 + 70 + 60), width: sz().width, height: 70, textAlign: 'center', fontSize: 88, color: '#00FFFF', textShadow: '3px 3px 0px rgba(0,0,0,1)', fontWeight: 'bold', fontFamily: "'din_bold', sans-serif", lineHeight: 70, margin: '3rem auto 14px' },
        content: "TANAH LIAT"
      },
    ],
    datetime: ['date', 'solat', 'time'] // overlay yang ditunjukkan: date=tarikh, solat=waktu solat, time=masa semasa
  },
  announce: {
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
  kuliahHari: {
    transitionType: 'auto',
    datetime: ['next-solat', 'small-time'],
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
          {
            type: "div", transition: "CLIP|LR", delay: -500, content: "PENCERAMAH",
            style: { position: 'absolute', left: 0, top: top(229), width: sz().width, height: 70, fontSize: 47, textAlign: 'center', fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '-53px' },
          },
          {
            type: "div", transition: "CLIP|L", delay: -500, content: "NAMA KITAB",
            style: { position: 'absolute', left: 0, top: top(314), width: sz().width, height: 70, fontSize: 47, fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '603px' },
          },
        ]
      }
    ]
  },
  kuliahWeekly: {
    transitionType: 'auto',
    datetime: ['next-solat', 'small-time'],
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
            type: "div", transition: "CLIP|LR", duration: 1000, content: "KULIAH MINGGU INI",
            style: { position: 'absolute', left: 0, right: 0, top: top(33), width: sz().width, height: 70, textAlign: 'center', fontSize: 80, color: '#FFFFFF', fontFamily: "'SairaCondensed', sans-serif", fontWeight: 'bold', lineHeight: 70, margin: 0 }
          },
          // Header kategori - "KULIAH SUBUH", "KULIAH DHUHA", etc (di-set dalam useSlides)
          {
            type: "div", transition: "CLIP|LR", duration: 1000, content: "",
            style: { position: 'absolute', left: 0, right: 0, top: top(160), width: sz().width, height: 50, textAlign: 'center', fontSize: 47, color: 'rgb(245 206 28)', fontWeight: 'bold', fontFamily: "system-ui", letterSpacing: '3px', transform: 'scaleX(0.85)', transformOrigin: 'center center', lineHeight: 50, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }
          },
          // Cards akan di-build dynamically dalam useSlides berdasarkan bilangan items dalam kategori
          ...buildKuliahWeeklyChildren()
        ]
      }
    ]
  },
  kuliahBulanan: {
    transitionType: 'auto',
    datetime: ['next-solat', 'small-time'],
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
    transitionType: 'auto',
    datetime: [],
    image: { src: "/img/slideshow/mountant0.jpeg", alt: "Slideshow" },
    // Captions: array imej dibina dalam useSlides (processSlideshow) - setiap caption type img, FADE, delay berurutan
    captions: []
  }
};
