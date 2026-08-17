/**
 * Widget tarikh/jam/next-prayer untuk slide JSSOR.
 * Semua widget adalah PURE — return caption object baru setiap panggilan supaya
 * boleh dipakai pada banyak slide tanpa berkongsi rujukan.
 *
 * DOM elements di-track melalui data-ipray-id (bukan id) supaya berbilang slide
 * boleh wujud serentak dalam DOM (JSSOR simpan semua slide). useTimeDriver
 * mengupdate SEMUA elemen yang sepadan (querySelectorAll + fallback id="ipray-*"
 * untuk backward-compat dengan DateTimeOverlay / PrayerSequencePage).
 */
import { height } from '../utils/screenUtils';

const _PRAYERS = ['Subuh', 'Syuruk', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];

const _now = () => new Date();

const _fmtP = (t) => {
  if (!t) return '--:--';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}`;
};

const _prayerData = () => {
  try {
    const today = _now().toISOString().slice(0, 10);
    return JSON.parse(localStorage.getItem(`ipray-prayer-times-${today}`) || 'null')
      ?? JSON.parse(localStorage.getItem('ipray-prayer-times') || 'null')
      ?? {};
  } catch (_) { return {}; }
};

const _dSz = () => height(86);
const _dLb = () => height(36);
// Lebar widget tarikh dikira dari kandungan sebenar (bukan % skrin):
// - digit hari: 2 char × ~1.2× fontSize
// - label: char terpanjang (hijri "ZULHIJJAH" = 9) × ~0.65× fontSize
// - + gap/padding
const _dW = () => {
  const digitW = _dSz() * 1.2 * 2;
  // const labelW = _dLb() * 0.65 * 9;
  const labelW = _dLb() * 0.65 * 6;
  // return Math.round(digitW + labelW + height(32));
  return Math.round(digitW + labelW + height(2));
};
const _dH = () => height(100);
const _pTS = () => height(95);
const _pLS = () => height(39);

/** Widget tarikh Gregorian — top-left. Nilai dikemaskini useTimeDriver setiap tick. */
export function buildGregorianWidget() {
  const now = _now();
  const gDay = String(now.getDate()).padStart(2, '0');
  const gDayName = ['AHAD', 'ISNIN', 'SELASA', 'RABU', 'KHAMIS', 'JUMAAT', 'SABTU'][now.getDay()];
  const gMonth = ['JAN', 'FEB', 'MAC', 'APR', 'MEI', 'JUN', 'JUL', 'OGO', 'SEP', 'OKT', 'NOV', 'DIS'][now.getMonth()];
  const gYear = now.getFullYear();

  return {
    // type: "div", transition: "CLIP|L", duration: 1500,
    type: "div", transition: "T", duration: 1500,
    style: { position: 'absolute', left: 0, top: 0 },
    content: `<div style="display:flex;align-items:flex-start;gap:8px;background-color:rgba(71,71,71,0.78);clip-path:polygon(0 0,100% 0,88% 100%,0 100%);padding:0 ${height(16)}px ${height(4)}px;height:${_dH()}px;width:${_dW()}px;font-family:'Bebas',sans-serif;text-shadow:3px 3px 0px rgba(0,0,0,1);"><div data-ipray-id="date-g-day" style="font-size:${_dSz()}px;line-height:1;font-weight:normal;color:#FF00FF;">${gDay}</div><div style="display:flex;flex-direction:column;font-size:${_dLb()}px;line-height:1.2;font-weight:normal;padding-top:${height(4)}px;"><div data-ipray-id="date-g-dayname" style="color:#FFFFFF;">${gDayName}</div><div style="color:#00FFFF;"><span data-ipray-id="date-g-month">${gMonth}</span> <span data-ipray-id="date-g-year">${gYear}</span></div></div></div>`
  };
}

/** Widget tarikh Hijri — top-right. Nilai diisi useTimeDriver (perlu takwim data). */
export function buildHijriWidget() {
  const hijri = (typeof window !== 'undefined')
    ? window.data_ipray?.snapshot?.hijri ?? null
    : null;
  const hDay = hijri ? String(hijri.day).padStart(2, '0') : '';
  const hMonth = hijri?.monthName ?? '';
  const hYear = hijri?.year ?? '';

  return {
    // type: "div", transition: "CLIP|R", duration: 1500,
    type: "div", transition: "T", duration: 1500,
    // style: { position: 'absolute', left:'100', right: 0, top: 0, width: _dW() + height(32), height: _dSz() + height(8) },
    style: { position: 'absolute', right: 0, top: 0, },
    content: `<div style="display:flex;justify-content:flex-end;gap:8px;background-color:rgba(71,71,71,0.78);clip-path:polygon(0 0,100% 0,100% 100%,12% 100%);padding:0 ${height(16)}px ${height(4)}px;height:${_dH()}px;width:${_dW()}px;font-family:'Bebas',sans-serif;text-shadow:3px 3px 0px rgba(0,0,0,1);">
      <div style="display:flex;flex-direction:column;font-size:${_dLb()}px;line-height:1.2;font-weight:normal;padding-top:${height(4)}px;text-align:right;">
        <div data-ipray-id="date-h-month" style="color:#FFFFFF;">${hMonth}</div>
        <div data-ipray-id="date-h-year" style="color:#00FFFF;">${hYear}</div>
      </div>
      <div data-ipray-id="date-h-day" style="font-size:${_dSz()}px;line-height:1;font-weight:normal;color:#FF00FF;">${hDay}</div>
    </div>`
  };
}

/**
 * Base widget jam — bottom-right. Nilai dikemaskini useTimeDriver setiap saat.
 * Outer hanya anchor positioning; semua visual (font, warna, bentuk) dibawa
 * oleh inner div menerusi innerStyle. Nisbah saiz outer kepada fontSize boleh
 * di-set per-widget supaya visual kekal sama seperti sebelum refactor.
 */
function _buildClock({ idPrefix, fontSize, heightMultiplier = 1.25, widthMultiplier = 3 * 0.6, innerStyle = {} }) {
  const now = _now();
  const h12raw = now.getHours() % 12 || 12;
  const h12 = h12raw < 10 ? `\u2002${h12raw}` : `${h12raw}`;
  const m2 = String(now.getMinutes()).padStart(2, '0');

  const base = {
    fontFamily: "'Bebas', monospace",
    fontWeight: '900',
    fontSize: `${fontSize}px`,
    color: '#FFFF00',
    textShadow: '3px 3px 0 rgba(0,0,0,1)',
    backgroundColor: 'rgba(16,16,16,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'end',
    // width: '100%',
    height: '100%',
    ...innerStyle,
  };

  const toInline = (obj) => Object.entries(obj)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
    .join(';');

  return {
    type: 'div', transition: 'R', duration: 1500,
    style: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      height: Math.round(fontSize * heightMultiplier),
      width: Math.round(fontSize * widthMultiplier),
      display: 'flex',
      justifyContent: 'end',
    },
    content: `<div style="${toInline(base)}">` +
             `<span data-ipray-id="${idPrefix}h">${h12}</span>` +
             `<span data-ipray-id="${idPrefix}colon" style="transition:none;width:35px;">:</span>` +
             `<span data-ipray-id="${idPrefix}m">${m2}</span>` +
             `</div>`
  };
}

/** Widget jam besar — bottom-right, untuk slide home. */
export function buildClockWidget() {
  return _buildClock({
    idPrefix: 'clock-',
    fontSize: height(128),
    // Nisbah asal: tinggi (130+15*2)/128 = 1.25, lebar (200*3*0.6)/128 = 2.8125
    heightMultiplier: 160 / 128,
    widthMultiplier: 360 / 128,
    innerStyle: {
      padding: `0 ${height(25)}px 0 ${height(35)}px`,
      borderTopLeftRadius: `${height(15)}px`,
      transformOrigin: 'top center',
      textAlign: 'center',
      lineHeight: '1.2',
    }
  });
}

/** Widget jam kecil — bottom-right, untuk slide bukan home supaya tidak ganggu konten. */
export function buildClockSmWidget() {
  return _buildClock({
    idPrefix: 'clock-sm-',
    fontSize: height(80),
    // Nisbah asal: tinggi (100+1*2)/80 = 1.275, lebar (120*3*0.6)/80 = 2.7
    heightMultiplier: 102 / 80,
    widthMultiplier: 216 / 80,
    innerStyle: {
      // padding: `0 ${height(15)}px 0 0`,
      // clipPath: 'polygon(15% 0%, 100% 0, 100% 100%, 0 100%, 0% 25%)',
      padding: `0 ${height(15)}px 0 ${height(15)}px`,
      borderTopLeftRadius: `${height(15)}px`,
      marginBottom: height(1) + "px",
      transformOrigin: 'center center',
      textAlign: 'center',
      lineHeight:'1.5'
    }
  });
}

/** Widget solat seterusnya — bottom-left. Data awal dibaca dari localStorage (dikemaskini useTimeDriver). */
export function buildNextPrayerWidget() {
  const data = _prayerData();
  const now = _now();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const active = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];

  let next = null;
  for (const name of active) {
    const t = data[name];
    if (!t) continue;
    const [h, m] = t.split(':').map(Number);
    if (h * 60 + m > nowMin) { next = { name, time: t }; break; }
  }
  if (!next) next = { name: 'Subuh', time: data['Subuh'] || '' };

  return {
    type: "div", transition: "L", duration: 1500,
    style: { position: 'absolute', left: 0, bottom: 0 },
    // content: `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;background-color:rgba(16,16,16,0.5);clip-path:polygon(80% 0, 100% 25%, 100% 100%, 0 100%, 0 0);padding:${height(10)}px;font-family:'Bebas',sans-serif;">
    content: `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;background-color:rgba(16,16,16,0.5);border-top-right-radius: ${height(15)}px;padding:${height(10)}px;font-family:'Bebas',sans-serif;">
      <div data-ipray-id="next-name" style="font-size:${height(20)}px;line-height:1;color:#FFFF00;text-shadow:4px 4px 0px rgba(0,0,0,1);padding-bottom:${height(8)}px;">${next.name.toUpperCase()}</div>
      <div data-ipray-id="next-time" style="font-size:${height(50)}px;line-height:1;color:#FFFF00;text-shadow:3px 3px 0px rgba(0,0,0,1);">${_fmtP(next.time)}</div>
    </div>`
  };
}

/** Widget grid waktu solat — bottom-left flex row. Teks diisi useTimeDriver. */
export function buildPrayerTimesWidget() {
  const data = _prayerData();

  return {
    type: "div", transition: "B", duration: 1500,
    style: {
      position: 'absolute',
      left: 0, bottom: 0,
      display: 'flex', backgroundColor: 'rgba(16,16,16,0)',
      color: '#FFFF00',
      fontFamily: "'Bebas', sans-serif", fontWeight: 'normal'
    },
    content: _PRAYERS.map(name => {
      const n = name.toLowerCase();
      const t = _fmtP(data[name]);
      const [tH, tM] = t.split(':');
      return `<div data-ipray-id="wrap-${n}" style="display:flex;flex-direction:column;align-items:center;padding:${height(8)}px ${height(16)}px;">
      <div data-ipray-id="label-${n}" style="font-family:'Bebas',sans-serif;font-size:${_pLS()}px;color:#FFFF00;text-shadow:4px 4px 0 rgba(0,0,0,1);padding-bottom:${height(4)}px;line-height:1;font-weight:normal;transition:color 0.3s ease;">${name.toUpperCase()}</div>
      <div data-ipray-id="time-${n}" style="font-family:'Bebas',sans-serif;font-size:${_pTS()}px;line-height:1;font-weight:normal;color:#FFFF00;text-shadow:3px 3px 0 rgba(0,0,0,1);transition:color 0.3s ease;">
        <span data-ipray-id="time-${n}-h">${tH}</span>
        <span data-ipray-id="colon-${n}" style="transition:none">:</span>
        <span data-ipray-id="time-${n}-m">${tM}</span>
      </div>
    </div>`;
    }).join('')
  };
}
