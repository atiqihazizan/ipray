import { textSize } from "../../utils/screenUtils";

export const bgStyle = {
  width: "100vw",
  height: "100vh",
  backgroundImage: "url(/img/bg-page4.jpg)",
  backgroundSize: "cover",
  backgroundPosition: "center",
  display: "flex",
  flexDirection: "column",
  // justifyContent: "center",
  alignItems: "center",
  position: "fixed",
  top: 0,
  left: 0,
  zIndex: 9999,
  paddingTop: "100px",
};

export const bgSolatStyle = {
  ...bgStyle,
  // backgroundImage: "url(/img/SOLAT.png)",
  // backgroundColor: "#000000",
};

export const titleStyle = {
  color: "#FFFFFF",
  fontSize: "120px",
  fontFamily: "'Anton', sans-serif",
  fontWeight: "normal",
  textAlign: "center",
  margin: 0,
  lineHeight: 1.2,
};

export const countdownStyle = {
  color: "#FFFFFF",
  fontSize: "80px",
  fontFamily: "'Roboto Mono', monospace",
  fontWeight: "bold",
  textAlign: "center",
  margin: "20px 0 0 0",
  letterSpacing: "4px",
};

export const countdownStyleIqamah = {
  color: "#FFFFFF",
  fontSize: `${textSize(145)}px`,
  fontFamily: "'bebas-neue', sans-serif",
  fontWeight: "bold",
  textAlign: "center",
  margin: `${textSize(16)}px 0 0 0`,
  letterSpacing: `${textSize(7)}px`,
  lineHeight: 0.25,
};

// ---------- Kongsi layout AzanScreen & IqamahScreen (grid 2 lajur, center) ----------
export const gridScreenStyle = {
  ...bgStyle,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  alignItems: "center",
  justifyContent: "center",
  gap: "2rem",
  padding: 0,
};

export const leftColumnPegawaiStyle = {
  width: "100%",
  // marginTop: "13rem",
  marginTop: "8rem",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

export const rightColumnCenterStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

export const pegawaiTitleStyle = () => ({
  color: "#000593",
  fontSize: `${textSize(80)}px`,
  textAlign: "center",
  fontFamily: "'ArchivoBlack', sans-serif",
  fontWeight: "bold",
  // WebkitTextStroke: `${Math.max(1, Math.round(textSize(1)))}px #FFFFFF`,
  WebkitTextStroke: `.1px #FFFFFF`,
  lineHeight: 1,
  margin: 0,
});

export const pegawaiSmallStyle = {
  fontSize: `${textSize(32)}px`,
  color: "#fff",
  textAlign: "center",
  fontFamily: "'SairaCondensed', sans-serif",
  margin: 0,
};

export const countdownBoxStyle = {
  backgroundColor: "black",
  borderRadius: "16px",
};

export const countdownBoxTextStyle = {
  color: "red",
  margin: "6rem 2rem",
  WebkitTextStroke: "1px #FFFFFF",
};

/** Baris pegawai (imej + label : nama) — kongsi Azan & Iqamah */
export const officerRowStyle = { display: "flex", alignItems: "center", width: "100%" };
export const officerColImgStyle = { width: "32%", padding: "0.5rem", textAlign: "center" };
export const officerColLabelStyle = { width: "auto", padding: "0.5rem", color: "#fff", fontSize: "3rem" };
export const officerImgStyle = { width: "250px", height: "auto" };

/** Jadual pegawai — 3 lajur: imej 200px, label 100px, nama full width. Kongsi Azan & Iqamah. */
export const officerTableStyle = { width: "100%", borderCollapse: "collapse" };
export const officerTdImageStyle = { width: "250px", padding: "0.5rem", verticalAlign: "middle", textAlign: "center" };
// export const officerTdLabelStyle = { width: "200px", padding: "0.5rem", verticalAlign: "middle", color: "#fff", fontSize: "3rem", textAlign: "center" };
export const officerTdLabelStyle = { width: "200px", padding: "0.5rem", verticalAlign: "middle", color: "#fff", fontSize: "2rem", textAlign: "left", fontWeight: "bold", fontFamily: "'SairaCondensed', sans-serif" };
export const officerTdNameStyle = { padding: "0.5rem", verticalAlign: "middle", color: "#fff", fontSize: "3rem", lineHeight: .75, fontFamily: "'SairaCondensed', sans-serif", fontWeight: "bold" };

/** Untuk teks Jawi — guna Scheherazade New, fontSize scale mengikut ratio skrin (base 96px @ 1080p) */
export const jawiTitleStyleIqamah = () => ({
  color: "#239b47",
  WebkitTextStroke: `${Math.max(1, Math.round(textSize(10)))}px #FFFFFF`,
  paintOrder: "stroke fill",
  fontSize: `${textSize(256)}px`,
  fontFamily: "'ScheherazadeNew', 'Traditional Arabic', serif",
  fontWeight: 700,
  textAlign: "center",
  margin: 0,
  lineHeight: 1.4,
  direction: "rtl",
});

/** Saiz fon tajuk Azan (base px @ 1080p) — boleh ubah di sini */
const AZAN_TITLE_FONT_SIZE = 256;

/** Style tajuk Azan (Jawi) — skrin Azan, warna merah, font size khas Azan */
export const jawiTitleStyleAzan = () => ({
  color: "#dc2626",
  WebkitTextStroke: `${Math.max(1, Math.round(textSize(10)))}px #FFFFFF`,
  paintOrder: "stroke fill",
  fontSize: `${textSize(AZAN_TITLE_FONT_SIZE)}px`,
  fontFamily: "'ScheherazadeNew', 'Traditional Arabic', serif",
  fontWeight: 700,
  textAlign: "center",
  margin: 0,
  lineHeight: 1.4,
  direction: "rtl",
});

/** Untuk teks Jawi — guna Scheherazade New, fontSize scale mengikut ratio skrin (base 96px @ 1080p) */
export const jawiTitleStyle = () => ({
  color: "#239b47",
  WebkitTextStroke: `${Math.max(1, Math.round(textSize(15)))}px #FFFFFF`,
  paintOrder: "stroke fill",
  fontSize: `${textSize(400)}px`,
  fontFamily: "'ScheherazadeNew', 'Traditional Arabic', serif",
  fontWeight: 700,
  textAlign: "center",
  margin: 0,
  lineHeight: 1.4,
  direction: "rtl",
});

/** Subtitle Arab/Jawi — font lebih kecil, guna ratio (base 28px @ 1080p) */
export const jawiSubtitleStyle = () => ({
  position: 'absolute',
  bottom: '330px',
  color: "#FFFFFF",
  WebkitTextStroke: `${Math.max(1, Math.round(textSize(5)))}px #000000`,
  paintOrder: "stroke fill",
  fontSize: `${textSize(100)}px`,
  fontFamily: "'ScheherazadeNew', 'Traditional Arabic', serif",
  // fontWeight: 600,
  textAlign: "center",
  margin: `${textSize(16)}px 0 0 0`,
  maxWidth: "90vw",
  lineHeight: 1.6,
  direction: "rtl",
});

export const subtitleStyle = {
  color: "#FFFFFF",
  fontSize: "26px",
  fontFamily: "'Roboto', sans-serif",
  textAlign: "center",
  margin: "16px 0 0 0",
  maxWidth: "90vw",
};
