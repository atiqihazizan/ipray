/**
 * Process data kuliah ke slides: mingguan, harian, bulanan.
 * Bulanan: input kuliahBulananProcessed dari backend (array of { dayNumber, dayOfWeek, date, entries }).
 */
import { slidesTemplate, KULIAH_NUM_CARDS } from '../config/sliderConfig';
import {
  buildKuliahWeeklyCategoryChildren,
} from '../config/slideBuilders';
import {
  TYPE_LABELS,
  DAY_NAMES,
  resolveImagePath,
  formatShortDate,
  calculateDateFromCodes,
  TYPE_COLORS,
  TYPE_ORDER,
} from '../utils/kuliahHelpers';
import { sz, getRatio, top, getContainerSize, textSize } from '../utils/screenUtils';
import { escapeHtml } from './slideHelpers';
import { HIJRI_MONTHS } from '../utils/islamicTimeUtils';

function getHijriMonth(date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const jd = Math.floor((14 - m) / 12);
  const gy = y + 4800 - jd;
  const gm = m + 12 * jd - 3;
  let jdn = d + Math.floor((153 * gm + 2) / 5) + 365 * gy + Math.floor(gy / 4) - Math.floor(gy / 100) + Math.floor(gy / 400) - 32045;
  const l = jdn - 1948438 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hMonth = Math.floor((24 * l3) / 709);
  const hYear = 30 * n + j - 30;
  return { month: HIJRI_MONTHS[hMonth] || '', year: hYear };
}

export { processKuliahMingguan } from './kuliahWeeklyProcessor';
export { processKuliahHarian } from './kuliahHarianProcessor';

// const TYPE_COLORS = { ks: '#42a5f5', km: '#66bb6a', kd: '#ffa726', kk: '#ab47bc' };
// const TYPE_ORDER = { ks: 0, kd: 1, km: 2, kk: 3 };
const MALAY_MONTHS = ['JAN', 'FEB', 'MAC', 'APR', 'MEI', 'JUN', 'JUL', 'OGO', 'SEP', 'OKT', 'NOV', 'DIS'];
const MALAY_DAYS = ['AHAD', 'ISNIN', 'SELASA', 'RABU', 'KHAMIS', 'JUMAAT', 'SABTU'];

/**
 * @param {Array<{ dayNumber, dayOfWeek, date, entries }>} kuliahBulananProcessed
 * @param {Object} imagesData - Map imageCode -> imagePath
 */
export function processKuliahBulanan(kuliahBulananProcessed, imagesData, slidesConfigData, applyConfig) {
  const safeData = Array.isArray(kuliahBulananProcessed) ? kuliahBulananProcessed : [];
  const kuliahBulananTemplate = applyConfig(slidesTemplate.kuliahBulanan, 'kuliahBulanan');
  const slide = JSON.parse(JSON.stringify(kuliahBulananTemplate));
  const parent = slide.captions[0];
  if (!parent) return [slide];

  if (safeData.length === 0) {
    delete parent.children;
    parent.content = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;font-size:32px;font-family:'SairaCondensed',sans-serif;font-weight:bold;">JADUAL KULIAH BULAN INI</div>`;
    return [slide];
  }

  const { widthRatio: WR, heightRatio: HR } = getRatio();
  const s = (v) => Math.round(v * HR);
  const sw = (v) => Math.round(v * WR);

  const now = new Date();
  const today = now.getDate();
  const monthName = MALAY_MONTHS[now.getMonth()];
  const dayName = MALAY_DAYS[now.getDay()];
  const year = now.getFullYear();
  const hijri = getHijriMonth(now);

  const firstDayOfWeek = safeData[0]?.dayOfWeek ?? 0;
  const totalDays = safeData.length;
  const numRows = Math.ceil((firstDayOfWeek + totalDays) / 7);

  const MARGIN = sw(24);
  const TOP_H = s(100);
  const DAY_H = s(34);
  const BOTTOM_H = s(100);
  const LEGEND_H = s(55);
  const HEADER_SEP = s(6);
  const GRID_GAP = Math.max(1, Math.round(2 * Math.min(WR, HR)));
  const GRID_H = Math.round(sz().height) - TOP_H - DAY_H - BOTTOM_H - LEGEND_H - HEADER_SEP;
  const CELL_H = Math.floor((GRID_H - GRID_GAP * (numRows - 1)) / numRows);

  const hasReplacementOnly = (e) => e.replacementText != null && e.replacementText !== '' && !e.type;

  // Build grid map: "row-col" -> dayData
  const gridMap = {};
  for (const day of safeData) {
    const daysFromStart = day.dayNumber - 1;
    const row = Math.floor((firstDayOfWeek + daysFromStart) / 7);
    const col = (firstDayOfWeek + daysFromStart) % 7;
    gridMap[`${row}-${col}`] = day;
  }

  function buildCellHtml(dayData) {
    // if (!dayData) return `<div style="background:rgba(0,0,0,0.15);border-radius:3px;"></div>`;
    if (!dayData) return `<div style=""></div>`;

    const isToday = dayData.dayNumber === today;
    const dayNumFs = s(numRows <= 5 ? 96 : 76);
    const todayBorder = isToday ? `outline:${s(3)}px solid #f44336;outline-offset:-${s(3)}px; background-color:rgb(247, 190, 186) !important` : '';

    const sorted = [...(dayData.entries || [])].sort((a, b) => {
      if (hasReplacementOnly(a) && hasReplacementOnly(b)) return 0;
      if (hasReplacementOnly(a)) return 1;
      if (hasReplacementOnly(b)) return -1;
      return (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
    });
    const len = sorted.length;

    // Size config by entry count
    let photoSize, fontSize, pad, gap;
    if (len <= 1) {
      photoSize = s(125); fontSize = s(25); pad = s(8); gap = sw(1);
    } else if (len === 2) {
      photoSize = s(80); fontSize = s(23); pad = s(2); gap = sw(6);
    } else {
      photoSize = s(60); fontSize = s(20); pad = s(3); gap = sw(4);
    }
    const bw = len <= 1 ? s(3) : s(2);

    const entriesHtml = sorted.map((entry, idx) => {
      const isEven = idx % 2 === 1;
      const flexDir = isEven ? 'row-reverse' : 'row';
      const textAlign = isEven ? 'right' : 'left';
      const textPadd = len > 1 ? `${isEven ? 'padding-right' : 'padding-left'}:${photoSize-8}px;` : null;
      const imgPosY = idx == len - 1 ? 'bottom' : 'top';
      const imgPosX = isEven ? 'right' : 'left';
      const imgPos = len <= 1 ? 'inherit' : 'absolute';

      if (hasReplacementOnly(entry)) {
        return `<div style="display:flex;align-items:center;justify-content:center;padding:${pad}px;flex:1;">
          <span style="font-size:${fontSize}px;color:#f44336;font-weight:bold;text-align:center;font-family:'SairaCondensed',sans-serif;">${escapeHtml((entry.replacementText || '').toUpperCase())}</span>
        </div>`;
      }

      const color = TYPE_COLORS[entry.type] || '#888';
      const imgSrc = resolveImagePath(entry.imageCode, imagesData);
      const name = escapeHtml(entry.penceramah || '');
      // const whiteSpace = len <= 1 ? 'white-space:normal;' : 'white-space:nowrap;';
      const whiteSpace = 'white-space:normal;line-height:1.2;'

      // return `<div style="display:flex;flex-direction:${flexDir};align-items:center;padding:${pad}px ${pad + sw(2)}px;gap:${gap}px;background:rgba(255,255,255,0.03);border-radius:2px;${len > 1 ? 'flex:1;' : 'height:100%;'}">
      // <img src="${imgSrc}" style="position:absolute;${imgPosY}:1px;${imgPosX}:1px;width:${photoSize}px;height:${photoSize}px;border-radius:50%;border:${bw}px solid ${color};flex-shrink:0;object-fit:cover;object-position:top;background:rgba(0, 0, 0, 0.16);" onerror="this.onerror=null;this.src='/img/Random_user.svg';this.style.objectFit='contain';" />
      // <div style="font-size:${fontSize}px;color:black;font-weight:600;font-family:'Roboto',sans-serif;overflow:hidden;text-overflow:ellipsis;${whiteSpace}text-align:${textAlign};${textPadd} flex:1;min-width:0;">
      //     <span style="font-weight:bolder;color:${color};">
      //       ${entry.type.toUpperCase()}
      //       <span style="width:3px;height:${fontSize-4}px;margin:0px 1px 0;background:${color};flex-shrink:0;display:inline-flex;"></span>
      //     </span>${name}
      //   </div>
      return `<div style="position:relative;display:flex;flex-direction:${flexDir};align-items:center;padding:${pad}px ${pad + sw(2)}px;gap:${gap}px;background:rgba(255,255,255,0.03);border-radius:2px;${len > 1 ? 'flex:1;' : 'height:100%;'}">
        <img src="${imgSrc}" style="position:${imgPos};${imgPosY}:1px;${imgPosX}:1px;width:${photoSize}px;flex-shrink:0;object-fit:cover;object-position:top;border-radius:23px;" onerror="this.onerror=null;this.src='/img/Random_user.svg';this.style.objectFit='contain';" />
        <div style="font-size:${fontSize}px;color:${color};font-weight:600;font-family:'Roboto',sans-serif;overflow:hidden;text-overflow:ellipsis;${whiteSpace}text-align:${textAlign};${textPadd} flex:1;min-width:0;">
          ${name.toUpperCase()}
        </div>
      </div>`;
    }).join('');

    const containerStyle = len <= 1
      ? `display:flex;align-items:center;height:100%;`
      : `display:flex;flex-direction:column;height:100%;gap:${s(2)}px;padding:${s(2)}px 0;`;

    return `<div style="background:#ffff;border-radius:23px;position:relative;overflow:hidden;${todayBorder}">
      <div style="position:absolute;bottom:${s(2)}px;right:${sw(4)}px;font-size:${dayNumFs}px;font-weight:bold;color:rgb(121 121 121 / 36%);font-family:Georgia,serif;line-height:1;pointer-events:none;z-index:0;">${dayData.dayNumber}</div>
      <div style="${containerStyle}position:relative;z-index:1;">${entriesHtml}</div>
    </div>`;
  }

  // All grid cells
  const cells = [];
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < 7; col++) {
      cells.push(buildCellHtml(gridMap[`${row}-${col}`]));
    }
  }

  // Day headers
  const dayHeaders = MALAY_DAYS.map((d) =>
    `<div style="text-align:center;font-size:${s(46)}px;font-weight:bold;color:rgb(255, 162, 0);letter-spacing:0.5px;font-family:'SairaCondensed',sans-serif; background-color:#ed2a2a;border-radius:23px;">${d}</div>`
  ).join('');

  // Legend
  const legendHtml = [
    { label: 'KULIAH SUBUH', color: TYPE_COLORS.ks },
    { label: 'KULIAH MAGHRIB', color: TYPE_COLORS.km },
    { label: 'KULIAH DHUHA', color: TYPE_COLORS.kd },
    // { label: 'KULIAH KHAS', color: TYPE_COLORS.kk }
  ].map(({ label, color }) =>
    `<div style="display:flex;align-items:center;gap:${sw(10)}px;">
      <div style="width:${s(25)}px;height:${s(25)}px;border-radius:50%;border:${s(2)}px solid ${color};background:${color};flex-shrink:0;"></div>
      <span style="font-size:${s(25)}px;color:#aaa;font-family:'SairaCondensed',sans-serif;letter-spacing:0.9px;font-weight:bolder">${label}</span>
    </div>`
  ).join('');

  parent.content = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content: start;overflow:hidden;background:rgba(0, 0, 0, 0.46)">
    <div style="display:flex;align-items:center;justify-content:center;gap:${sw(32)}px;height:${TOP_H}px;padding:0 ${MARGIN}px;flex-shrink:0;">
      <div style="text-align:center;font-family:'SairaCondensed',sans-serif;line-height:1.1;">
        <div style="font-size:${s(22)}px;color:#aaa;letter-spacing:2px;">MASIHI</div>
        <div style="font-size:${s(52)}px;font-weight:bold;color:#fff;line-height:1;">${monthName} ${year}</div>
      </div>
      <div style="width:${sw(2)}px;height:${s(60)}px;background:rgba(255,255,255,0.25);flex-shrink:0;"></div>
      <div style="text-align:center;font-family:'SairaCondensed',sans-serif;line-height:1.1;">
        <div style="font-size:${s(22)}px;color:#aaa;letter-spacing:2px;">HIJRAH</div>
        <div style="font-size:${s(52)}px;font-weight:bold;color:#ffbd59;line-height:1;">${hijri.month} ${hijri.year}H</div>
      </div>
    </div>
    
    <!-- div style="display:grid;grid-template-columns:repeat(7,1fr);height:${DAY_H}px;margin:0 ${MARGIN}px;background:rgba(0,0,0,0.3);flex-shrink:0;border-bottom:1px solid #2a2a2a;align-items:center;" -->
    <div style="display:grid;grid-template-columns:repeat(7,1fr);height:${DAY_H}px;margin:0 ${MARGIN}px;flex-shrink:0;align-items:center;gap:35px">
      ${dayHeaders}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);grid-auto-rows:${CELL_H}px;gap:${17}px;margin:${HEADER_SEP + 30}px ${MARGIN}px 0;flex-shrink:0;">
      ${cells.join('')}
    </div>

    <!-- div style="display:flex;align-items:center;justify-content:center;gap:${sw(24)}px;height:${LEGEND_H}px;margin:0 ${MARGIN}px;background:rgba(0,0,0,0.25);border-top:1px solid #2a2a2a;flex-shrink:0;" -->
    <div style="display:flex;align-items:center;justify-content:center;gap:${sw(24)}px;height:${LEGEND_H}px;margin:0 ${MARGIN}px;flex-shrink:0;">
      ${legendHtml}
    </div>
  </div>`;

  delete parent.children;
  return [slide];
}
