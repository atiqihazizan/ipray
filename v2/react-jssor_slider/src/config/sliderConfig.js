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
export const KULIAH_KATEGORI = 'JADUAL KULIAH MINGGU INI'
export const KULIAH_NUM_CARDS = 6;

export function buildKuliahWeeklyCategoryChildren(numCards) {
  const KULIAH_CARD_WIDTH = 620;
  const KULIAH_CARD_HEIGHT = 193;
  const KULIAH_CARD_GAP = 40;
  const KULIAH_COLUMN_WIDTH = 900;
  const COL1_START_LEFT = 77;
  const SCREEN_WIDTH = 1824;
  const COL2_START_LEFT = COL1_START_LEFT + KULIAH_COLUMN_WIDTH;
  const ROW_HEIGHT = KULIAH_CARD_HEIGHT + 35;
  const IMAGE_WIDTH = 193;
  const IMAGE_GAP = 20;
  const PENCERAMAH_TOP = 35;
  const KITAB_TOP = 110;
  const DATE_TOP = 150;
  const TEXT_WIDTH = (SCREEN_WIDTH - (IMAGE_WIDTH * 2) ) / 2;//KULIAH_CARD_WIDTH - IMAGE_WIDTH - IMAGE_GAP;
  const baseTop = 240;

  const tempKuliahWeekly = [
    { type: "img", transition: "FADE", duration: 1000, delay: 0, content: "", style: { position: 'absolute', left: 0, top: 0, width: 193, height: 193, objectFit: 'fill', borderRadius: 10, boxShadow: 'rgba(0, 0, 0, 0.3) 0px 4px 8px' } },
    { type: "div", transition: "CLIP|L", delay: 0, content: "", style: { position: 'absolute', left: 220, top: 0, width: 646,display:'flex',flexDirection:'column',gap:5 } }
  ];

  return Array.from({ length: numCards }, (_, cardIndex) => {
    const isCol1 = cardIndex < 3;
    const row = isCol1 ? cardIndex : cardIndex - 3;
    const colLeft = isCol1 ? COL1_START_LEFT : COL2_START_LEFT;
    const topOffset = row * ROW_HEIGHT;

    return tempKuliahWeekly.map((c, elementIndex) => {
      let style = { ...c.style };
      let left = 0;
      let top = baseTop + topOffset;

      if (isCol1) {
        if (elementIndex === 0) {
          left = colLeft;
        } else if (elementIndex === 1) {
          left = colLeft + IMAGE_WIDTH + IMAGE_GAP;
          top = baseTop + topOffset + PENCERAMAH_TOP;
          style.width = TEXT_WIDTH;
        }
      } else {
        // Col2: guna right untuk alignment dan transition CLIP|R
        const COL2_RIGHT = SCREEN_WIDTH - colLeft - 155;
        if (elementIndex === 0) {
          // Image - rapat ke kanan (kekal FADE)
          style.right = COL2_RIGHT - KULIAH_CARD_WIDTH;
          left = undefined;
        } else if (elementIndex === 1) {
          // Text wrapped (Penceramah + Kitab + Date) - di sebelah kiri image
          style.right = COL2_RIGHT - KULIAH_CARD_WIDTH + IMAGE_WIDTH + IMAGE_GAP;
          left = undefined;
          top = baseTop + topOffset;
          style.width = TEXT_WIDTH;
          c.transition = "CLIP|R";
        }
      }

      if (left !== undefined) {
        style.left = left;
      }
      if (style.right !== undefined) {
        delete style.left;
      }
      style.top = top;

      return {
        ...c,
        style,
        content: ""
      };
    });
  }).flat();
}

function buildKuliahWeeklyChildren() {
  return buildKuliahWeeklyCategoryChildren(KULIAH_NUM_CARDS);
}

export function buildKuliahBulananChildren(numCards, dayOfWeekArray = [], calendarPositions = []) {
  const KULIAH_BULAN_WIDTH = 256;
  const CARD_HEIGHT = 142;
  const START_LEFT = 29;
  const START_TOP = 184;

  const tempKuliahBulanan = [
    { type: "div", transition: "CLIP|LR", duration: 500, content: "", style: { position: 'absolute', left: 0, top: 184, width: KULIAH_BULAN_WIDTH, height: CARD_HEIGHT, padding: '0 5px' } }
  ];

  return Array.from({ length: numCards }, (_, cardIndex) => {
    let row = 0;
    let col = 0;

    if (calendarPositions[cardIndex]) {
      row = calendarPositions[cardIndex].row;
      col = calendarPositions[cardIndex].col;
    } else {
      const dayOfWeek = dayOfWeekArray[cardIndex] !== undefined ? dayOfWeekArray[cardIndex] : (cardIndex % 7);
      row = Math.floor(cardIndex / 7);
      col = dayOfWeek;
    }

    const leftOffset = col * (KULIAH_BULAN_WIDTH + 12);
    const topOffset = row * (CARD_HEIGHT + 11);

    return tempKuliahBulanan.map((c) => {
      return {
        ...c,
        style: {
          ...c.style,
          left: START_LEFT + leftOffset,
          top: START_TOP + topOffset
        },
        content: ""
      };
    });
  }).flat();
}

// Debug mode: set true untuk development, false untuk production
// DEBUG: true = autoPlay false, loop 0 | DEBUG: false = autoPlay true, loop 1
const DEBUG = false;

export const sliderConfig = {
  container: { id: "slider1_container", width: 1920, height: 1080, maxWidth: 1920, minWidth: 320 },
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
  masa: {
    enabled: true,
    position: { bottom: 0, right: 20 },
    size: 72,
    format: '12h',
    showSeconds: false,
    showAmPm: false,
    isCurrentTime: true,
    color: '#FFD700'
  },
  loading: {
    enabled: true,
    image: "/img/loading.gif"
  }
};

export const slidesTemplate = {
  home: {
    duration: 1000, // Custom duration untuk slide 1 (5 saat)
    transitionType: 'auto', // 'auto' = automatic transition, 'static' = tiada transition
    image: { src: "/images/slides/bg-mta.jpg", alt: "Slide 1" },
    captions: [
      {
        type: "div", transition: "CLIP|LR", duration: 1500,
        style: { left: 0, right: 0, top: 120, width: 1920, height: 70, textAlign: 'center', fontSize: 88, color: '#00FFFF', textShadow: '3px 3px 0px rgba(0,0,0,1)', fontWeight: 'bold', fontFamily: "'din_bold', sans-serif", lineHeight: 70, margin: '3rem auto 14px' },
        content: "MASJID TUAN ABDULLAH"
      },
      {
        type: "div", transition: "CLIP|LR", duration: 500, delay: -300,
        style: { left: 0, right: 0, top: (120 + 70 + 60), width: 1920, height: 70, textAlign: 'center', fontSize: 88, color: '#00FFFF', textShadow: '3px 3px 0px rgba(0,0,0,1)', fontWeight: 'bold', fontFamily: "'din_bold', sans-serif", lineHeight: 70, margin: '3rem auto 14px' },
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
        style: { position: 'absolute', left: 0, top: 0, width: 1920, height: 1080 },
        children: [
          {
            type: "div", transition: "CLIP|LR", duration: 1000, content: "",
            style: { position: 'absolute', left: 0, right: 0, top: 33, width: 1920, height: 70, textAlign: 'center', fontSize: 60, color: '#FFFFFF', fontFamily: "'Anton', sans-serif", lineHeight: 70, margin: 0 },
          },
          {
            type: "div", transition: "CLIP|LR", duration: 1000, content: "",
            style: { position: 'absolute', left: 0, right: 0, top: 166, width: 1920, height: 50, textAlign: 'center', fontSize: 47, color: 'rgb(245 206 28)', fontWeight: 'bold', fontFamily: "system-ui", letterSpacing: '3px', transform: 'scaleX(0.85)', transformOrigin: 'center center', lineHeight: 50, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
          },
          {
            type: "div", transition: "CLIP|LR", delay: -500, content: "",
            style: { position: 'absolute', left: 0, top: 229, width: 1920, height: 70, fontSize: 47, textAlign: 'center', fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '-53px' },
          },
          {
            type: "div", transition: "CLIP|L", delay: -500, content: "",
            style: { position: 'absolute', left: 0, top: 314, width: 1920, height: 70, fontSize: 47, fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '603px' },
          },
          {
            type: "div", transition: "CLIP|L", delay: -300, content: "",
            style: { position: 'absolute', left: 0, top: 398, width: 1920, height: 70, fontSize: 47, fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '603px' },
          },
          {
            type: "div", transition: "CLIP|L", delay: -300, content: "",
            style: { position: 'absolute', left: 0, top: 480, width: 1920, height: 70, fontSize: 47, fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '603px' },
          },
          {
            type: "div", transition: "CLIP|L", delay: -300, content: "",
            style: { position: 'absolute', left: 0, top: 560, width: 1920, height: 70, fontSize: 47, fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '603px' },
          },
          {
            type: "div", transition: "CLIP|L", delay: -300, content: "",
            style: { position: 'absolute', left: 0, top: 642, width: 1920, height: 70, fontSize: 47, fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 70, margin: 0, marginLeft: '603px' },
          },
          {
            type: "div", transition: "CLIP|LR", delay: -300, content: "",
            style: { position: 'absolute', left: 0, bottom: 192, width: 1920, height: 180, textAlign: 'center', fontSize: 62, color: '#FFFFFF', fontWeight: 'bold', fontFamily: "system-ui", lineHeight: 180, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
          }
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
        style: { position: 'absolute', left: 0, top: 0, width: 1920, height: 1080 },
        // Children: 1 kategori global + 1 header kategori + dynamic cards (tajuk kategori, image, teks gabungan). Data isi dalam useSlides.
        children: [
          // Kategori global - "JADUAL KULIAH MINGGUAN" (di-set dalam useSlides)
          {
            type: "div", transition: "CLIP|LR", duration: 1000, content: KULIAH_KATEGORI,
            style: { position: 'absolute', left: 0, right: 0, top: 33, width: 1920, height: 70, textAlign: 'center', fontSize: 60, color: '#FFFFFF', fontFamily: "'Anton', sans-serif", lineHeight: 70, margin: 0 }
          },
          // Header kategori - "KULIAH SUBUH", "KULIAH DHUHA", etc (di-set dalam useSlides)
          {
            type: "div", transition: "CLIP|LR", duration: 1000, content: "",
            style: { position: 'absolute', left: 0, right: 0, top: 160, width: 1920, height: 50, textAlign: 'center', fontSize: 47, color: 'rgb(245 206 28)', fontWeight: 'bold', fontFamily: "system-ui", letterSpacing: '3px', transform: 'scaleX(0.85)', transformOrigin: 'center center', lineHeight: 50, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }
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
        style: { position: 'absolute', left: 0, top: 0, width: 1920, height: 1080 },
        // Children: 1 kategori global + 1 header kategori + dynamic cards (tajuk kategori, image, teks gabungan). Data isi dalam useSlides.
        children: [
          // Kategori global - "JADUAL KULIAH MINGGUAN" (di-set dalam useSlides)
          {
            type: "div",
            transition: "CLIP|LR",
            duration: 1000,
            content: 'JADUAL KULIAH BULAN INI',
            style: { position: 'absolute', left: 0, right: 0, top: 33, width: 1920, height: 70, textAlign: 'center', fontSize: 60, color: '#FFFFFF', fontFamily: "'Anton', sans-serif", lineHeight: 70, margin: 0 }
          },
          // Cards akan dibina dinamik dalam useSlides menggunakan buildKuliahBulananChildren
          // Setiap card ada 2 children: [0]=no hari, [1]=type+penceramah
        ]
      }
    ]
  }
};