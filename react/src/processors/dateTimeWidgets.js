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
import { height, sz } from '../utils/screenUtils';

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
const _dW = () => Math.round(sz().width * 0.25);
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
    type: "div", transition: "CLIP|L", duration: 1500,
    style: { position: 'absolute', left: 0, top: 0 },
    content: `<div style="display:flex;align-items:flex-start;gap:8px;background-color:rgba(71,71,71,0.78);clip-path:polygon(0 0,100% 0,88% 100%,0 100%);padding:0 ${height(16)}px ${height(4)}px;width:${_dW()}px;font-family:'Bebas',sans-serif;text-shadow:3px 3px 0px rgba(0,0,0,1);"><div data-ipray-id="date-g-day" style="font-size:${_dSz()}px;line-height:1;font-weight:normal;color:#FF00FF;">${gDay}</div><div style="display:flex;flex-direction:column;font-size:${_dLb()}px;line-height:1.2;font-weight:normal;padding-top:${height(4)}px;"><div data-ipray-id="date-g-dayname" style="color:#FFFFFF;">${gDayName}</div><div style="color:#00FFFF;"><span data-ipray-id="date-g-month">${gMonth}</span> <span data-ipray-id="date-g-year">${gYear}</span></div></div></div>`
  };
}

/** Widget tarikh Hijri — top-right. Nilai diisi useTimeDriver (perlu takwim data). */
export function buildHijriWidget() {
  return {
    type: "div", transition: "R", duration: 1500,
    style: { position: 'absolute', right: 0, top: 0 },
    content: `<div style="display:flex;justify-content:flex-end;gap:8px;background-color:rgba(71,71,71,0.78);clip-path:polygon(0 0,100% 0,100% 100%,12% 100%);padding:0 ${height(16)}px ${height(4)}px;width:${_dW()}px;font-family:'Bebas',sans-serif;text-shadow:3px 3px 0px rgba(0,0,0,1);"><div style="display:flex;flex-direction:column;font-size:${_dLb()}px;line-height:1.2;font-weight:normal;padding-top:${height(4)}px;text-align:right;"><div data-ipray-id="date-h-month" style="color:#FFFFFF;"></div><div data-ipray-id="date-h-year" style="color:#00FFFF;"></div></div><div data-ipray-id="date-h-day" style="font-size:${_dSz()}px;line-height:1;font-weight:normal;color:#FF00FF;"></div></div>`
  };
}

/** Widget jam besar — bottom-right. Elemen diupdate useTimeDriver setiap saat (DOM-driven). */
export function buildClockWidget() {
  const now = _now();
  const h12 = now.getHours() % 12 || 12;
  const m2 = String(now.getMinutes()).padStart(2, '0');

  return {
    type: "div", transition: "MCLIP|R", duration: 1500,
    style: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      fontFamily: "'Bebas', monospace",
      fontWeight: "900",
      fontSize: height(128),
      transform: "scaleY(1.0)",
      color: '#FFFF00',
      textShadow: '3px 3px 0px rgba(0,0,0,1)',
      backgroundColor: 'rgba(16,16,16,0.5)',
      borderTopLeftRadius: height(10),
      padding: `${height(0)}px ${height(18)}px ${height(0)}px ${height(24)}px`,
    },
    content: `<span data-ipray-id="clock-h">${h12}</span><span data-ipray-id="clock-colon" style="transition:none">:</span><span data-ipray-id="clock-m">${m2}</span>`
  };
}

/** Widget jam kecil — bottom-right, untuk slide bukan home supaya tidak ganggu konten. */
export function buildClockSmWidget() {
  const now = _now();
  const h12 = now.getHours() % 12 || 12;
  const m2 = String(now.getMinutes()).padStart(2, '0');

  return {
    type: "div", transition: "MCLIP|R", duration: 1500,
    style: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      fontFamily: "'Bebas', monospace",
      fontWeight: "900",
      fontSize: height(60),
      transform: "scaleY(1.0)",
      color: '#FFFF00',
      textShadow: '3px 3px 0px rgba(0,0,0,1)',
      backgroundColor: 'rgba(16,16,16,0.5)',
      borderTopLeftRadius: height(6),
      padding: `${height(2)}px ${height(10)}px ${height(2)}px ${height(14)}px`,
    },
    content: `<span data-ipray-id="clock-sm-h">${h12}</span><span data-ipray-id="clock-sm-colon" style="transition:none">:</span><span data-ipray-id="clock-sm-m">${m2}</span>`
  };
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
    content: `<div style="display:flex;align-items:center;gap:${height(12)}px;background-color:rgba(16,16,16,0.5);clip-path:polygon(0 0,100% 0,92% 100%,0 100%);padding:${height(8)}px ${height(20)}px ${height(8)}px ${height(16)}px;font-family:'Bebas',sans-serif;text-shadow:3px 3px 0px rgba(0,0,0,1);">
      <div style="display:flex;flex-direction:column;gap:${height(4)}px;">
        <div style="font-size:${height(18)}px;line-height:1;color:#FFFFFF;letter-spacing:2px;">SOLAT SETERUSNYA</div>
        <div data-ipray-id="next-name" style="font-size:${height(38)}px;line-height:1;color:#FFD700;">${next.name.toUpperCase()}</div>
      </div>
      <div style="width:3px;height:${height(44)}px;background:#FFFFFF;"></div>
      <div data-ipray-id="next-time" style="font-size:${height(56)}px;line-height:1;color:#FFFF00;">${_fmtP(next.time)}</div>
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
      return `<div data-ipray-id="wrap-${n}" style="display:flex;flex-direction:column;align-items:center;padding:${height(8)}px ${height(16)}px;"><div data-ipray-id="label-${n}" style="font-family:'Bebas',sans-serif;font-size:${_pLS()}px;color:#FFFF00;text-shadow:4px 4px 0 rgba(0,0,0,1);padding-bottom:${height(4)}px;line-height:1;font-weight:normal;transition:color 0.3s ease;">${name.toUpperCase()}</div><div data-ipray-id="time-${n}" style="font-family:'Bebas',sans-serif;font-size:${_pTS()}px;line-height:1;font-weight:normal;color:#FFFF00;text-shadow:3px 3px 0 rgba(0,0,0,1);transition:color 0.3s ease;"><span data-ipray-id="time-${n}-h">${tH}</span><span data-ipray-id="colon-${n}" style="transition:none">:</span><span data-ipray-id="time-${n}-m">${tM}</span></div></div>`;
    }).join('')
  };
}
