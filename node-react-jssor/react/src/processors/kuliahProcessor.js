/**
 * Process data kuliah ke slides: mingguan, harian, bulanan.
 */
import { slidesTemplate, KULIAH_NUM_CARDS } from '../config/sliderConfig';
import {
  buildKuliahWeeklyCategoryChildren,
  buildKuliahBulananChildren
} from '../config/slideBuilders';
import {
  TYPE_LABELS,
  DAY_NAMES,
  formatShortDate,
  calculateDateFromCodes
} from '../utils/kuliahHelpers';
import { top, getContainerSize } from '../utils/screenUtils';
import { escapeHtml, isKuliahBatal, isKuliahBatalByWeekDay } from './slideHelpers';

export { processKuliahMingguan } from './kuliahWeeklyProcessor';
export { processKuliahHarian } from './kuliahHarianProcessor';

export function processKuliahBulanan(kuliahData, kuliahBatalData, slidesConfigData, applyConfig) {
  const esc = escapeHtml;
  const safeKuliahData = kuliahData && Array.isArray(kuliahData) ? kuliahData : [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();

  const dataWithDates = safeKuliahData
    .filter((item) => item.trim() !== '')
    .map((item) => {
      const arr = item.split('|');
      const week = arr[0];
      const day = arr[1];
      const type = arr[2];
      const penceramah = (arr[3] || '').trim();
      const kitab = (arr[5] || '').trim();
      const isBatal = isKuliahBatal(item, kuliahBatalData);
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
        isBatal: isBatal,
        original: item
      };
    })
    .filter((item) => item.date.getFullYear() === currentYear && item.date.getMonth() === currentMonth)
    .sort((a, b) => a.date - b.date);

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarGrid = [];
  const calendarPositions = [];

  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const date = new Date(currentYear, currentMonth, dayNum);
    const dayOfWeek = date.getDay();
    let row = 0;
    let col = dayOfWeek;
    if (dayNum === 1) {
      col = firstDayOfWeek;
    } else {
      const daysFromStart = dayNum - 1;
      row = Math.floor((firstDayOfWeek + daysFromStart) / 7);
      col = (firstDayOfWeek + daysFromStart) % 7;
    }
    const kuliahForDay = dataWithDates.filter((item) => item.dayNumber === dayNum);
    calendarGrid.push({ dayNumber: dayNum, dayOfWeek: dayOfWeek, date: date, kuliah: kuliahForDay });
    calendarPositions.push({ row, col });
  }

  const kuliahBulananTemplate = applyConfig(slidesTemplate.kuliahBulanan, 'kuliahBulanan');
  const kuliahBulananSlide = JSON.parse(JSON.stringify(kuliahBulananTemplate));
  const parent = kuliahBulananSlide.captions[0];

  if (parent) {
    if (parent.children && parent.children.length > 0) {
      parent.children[0].content = 'JADUAL KULIAH BULAN INI';
    }
    const dayOfWeekArray = calendarGrid.map((d) => d.dayOfWeek);
    const cards = buildKuliahBulananChildren(totalDays, dayOfWeekArray, calendarPositions);
    parent.children = [parent.children[0], ...cards];

    for (let i = 0; i < totalDays; i++) {
      const dayData = calendarGrid[i];
      const base = 1 + i;

      if (parent.children[base]) {
        const dayNumberStr = String(dayData.dayNumber).padStart(2, '0');
        const isToday = dayData.dayNumber === currentDay;
        const dayNumberColor = isToday ? '#cc000040' : '#80808040';
        const dayNumberStyle = `text-align:right; font-size:117px; font-family:'bebas',sans-serif; color:${dayNumberColor}; position:absolute; right:0; line-height:1.1; bottom:0;`;
        const dayNumberHtml = `<div style="${dayNumberStyle}">${dayNumberStr}</div>`;

        let contentHtml = '';
        if (dayData.kuliah && dayData.kuliah.length > 0) {
          const KULIAH_BULANAN_FONT_SIZE = 24; // type & penceramah - senang adjust
          const allKuliah = dayData.kuliah
            .map((k, rowIndex) => {
              const typeLabel = k.type.toUpperCase();
              const batalInfo = isKuliahBatalByWeekDay(k.original, kuliahBatalData);
              let kitabHtml = '';
              if (k.kitab) {
                const kitabItems = k.kitab
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean);
                const itemStyle = batalInfo.isBatal
                  ? 'font-size:15px;word-wrap:break-word;white-space:normal;line-height:1;text-decoration:line-through;opacity:0.6;'
                  : 'font-size:15px;word-wrap:break-word;white-space:normal;line-height:1';
                const kitabItemsHtml = kitabItems.map((item) => `<li style="${itemStyle}">${esc(item)}</li>`).join('');
                kitabHtml = `<ul style="margin-top:-3px;margin-left:19px;list-style-type:square">${kitabItemsHtml}</ul>`;
              }
              const typeStyle = batalInfo.isBatal
                ? `font-size:${KULIAH_BULANAN_FONT_SIZE}px;text-decoration:line-through;opacity:0.6;`
                : `font-size:${KULIAH_BULANAN_FONT_SIZE}px;`;
              const penceramahStyle = batalInfo.isBatal
                ? `font-size:${KULIAH_BULANAN_FONT_SIZE}px;text-decoration:line-through;opacity:0.6;`
                : `font-size:${KULIAH_BULANAN_FONT_SIZE}px;`;
              const rowGapTop = rowIndex === 0 ? '0' : '1px';
              return `<tr>
              <td style="${typeStyle} vertical-align:top; padding:0 5px; padding-top:${rowGapTop}; white-space:nowrap;">${typeLabel}</td>
              <td style="font-size:${KULIAH_BULANAN_FONT_SIZE}px; vertical-align:top; padding:0; padding-right: 3px; padding-top:${rowGapTop}; color:#666;">|</td>
              <td style="vertical-align:top; padding:0; padding-top:${rowGapTop}; text-align:left;">
                <div style=" padding-right:3px;">
                  ${batalInfo.isBatal 
                    ? `<span style="color:#e00;font-size:${KULIAH_BULANAN_FONT_SIZE}px;">(DITANGGUH)</span>` 
                    : `<span style="display:block; ${penceramahStyle} word-wrap:break-word; white-space:normal; margin:0; padding:0; text-align:left; line-height:1.25;padding-top: 4px;">${esc(k.penceramah)}</span> `}
                </div>
              </td></tr>`;
            })
            .join('');
          contentHtml = `<div style="font-size:${KULIAH_BULANAN_FONT_SIZE}px;font-family:'Roboto',sans-serif;font-weight:bold; position:absolute; top:0; left:0; margin:0; padding:0;">
          <table style="border-collapse:collapse; width:100%; margin:0; padding:0;"><tbody>${allKuliah}</tbody></table>
          </div>`;
        }

        parent.children[base].content = `${dayNumberHtml}${contentHtml}`;
        if (isToday) {
          parent.children[base].style = {
            ...parent.children[base].style,
            border: '6px solid rgb(255, 0, 0)',
            borderRadius: '5px'
          };
        }
      }
    }
  }

  return [kuliahBulananSlide];
}
