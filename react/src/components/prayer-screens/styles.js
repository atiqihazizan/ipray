import { textSize } from "../../utils/screenUtils";

const textJawi = [
  'Neirizi',
  'Lateef',
  'ScheherazadeNew',
  'Amiri',
]
export const ARABIC_FONT_FAMILY = `'${textJawi[2]}'`;

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

// Latar hitam pekat (bukan gambar masjid) khas untuk skrin SEDANG SOLAT — kurangkan
// gangguan visual supaya jemaah lebih khusyuk semasa solat.
export const bgSolatStyle = {
  ...bgStyle,
  backgroundImage: "none",
  backgroundColor: "#000000",
};

export const countdownStyleIqamah = {
  color: "#FFFFFF",
  fontSize: `${textSize(300)}px`,
  fontFamily: "'DIN', sans-serif",
  fontWeight: "900",
  textAlign: "center",
  margin: `${textSize(16)}px 0 0 0`,
  letterSpacing: "2px",
  transform: "scaleY(1.45)",
  display: "inline-block",
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
  marginTop: "8rem",
  paddingBottom: "3rem",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

export const rightColumnCenterStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  // marginTop: "-2rem",
  // paddingBottom: "3rem",
  // gap: "15vh",
  height: "100vh",
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

// Kotak hitam latar countdown dibuang — gantikan dengan sapuan tepi (stroke) tebal
// (sama pendekatan macam tajuk Jawi أذان/اقامة) supaya angka tetap jelas dibaca dari
// jarak jauh tanpa perlu latar pepejal.
export const countdownBoxStyle = {};

export const countdownBoxTextStyle = {
  color: "red",
  margin: 0,
  WebkitTextStroke: `${Math.max(1, Math.round(textSize(3)))}px #FFFFFF`,
  paintOrder: "stroke fill",
  textShadow: "0 0 24px rgba(0,0,0,0.9), 0 6px 12px rgba(0,0,0,0.85)",
  width: "1010px",
};

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
  fontFamily: ARABIC_FONT_FAMILY,
  fontWeight: 700,
  textAlign: "center",
  margin: 0,
  // marginTop: "-13vh",
  // lineHeight: 1.4,
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
  fontFamily: ARABIC_FONT_FAMILY,
  fontWeight: 700,
  textAlign: "center",
  margin: 0,
  // marginTop: "-13vh",
  // lineHeight: 1.4,
  direction: "rtl",
});

/** Untuk teks Jawi — guna Scheherazade New, fontSize scale mengikut ratio skrin (base 96px @ 1080p) */
export const jawiTitleStyle = () => ({
  color: "#239b47",
  WebkitTextStroke: `${Math.max(1, Math.round(textSize(15)))}px #FFFFFF`,
  paintOrder: "stroke fill",
  fontSize: `${textSize(400)}px`,
  fontFamily: ARABIC_FONT_FAMILY,
  fontWeight: 700,
  textAlign: "center",
  margin: 0,
  lineHeight: 1.4,
  direction: "rtl",
});


