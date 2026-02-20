/**
 * Process data kuliah ke slides: mingguan, harian, bulanan.
 * Bulanan: input kuliahBulananProcessed dari backend (array of { dayNumber, dayOfWeek, date, entries }).
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
import { top, getContainerSize, textSize } from '../utils/screenUtils';
import { escapeHtml } from './slideHelpers';

export { processKuliahMingguan } from './kuliahWeeklyProcessor';
export { processKuliahHarian } from './kuliahHarianProcessor';

/**
 * @param {Array<{ dayNumber: number, dayOfWeek: number, date: string, entries: Array<{ type?, penceramah?, kitab?, isBatal?, notes?, replacementText? }> }>} kuliahBulananProcessed
 */
export function processKuliahBulanan(kuliahBulananProcessed, slidesConfigData, applyConfig) {
  const esc = escapeHtml;
  const safeData = kuliahBulananProcessed && Array.isArray(kuliahBulananProcessed) ? kuliahBulananProcessed : [];
  const currentDate = new Date();
  const currentDay = currentDate.getDate();
  const totalDays = safeData.length;
  if (totalDays === 0) {
    const kuliahBulananTemplate = applyConfig(slidesTemplate.kuliahBulanan, 'kuliahBulanan');
    const slide = JSON.parse(JSON.stringify(kuliahBulananTemplate));
    if (slide.captions?.[0]?.children?.[0]) slide.captions[0].children[0].content = 'JADUAL KULIAH BULAN INI';
    return [slide];
  }

  const firstDayOfWeek = safeData[0]?.dayOfWeek ?? 0;
  const dayOfWeekArray = safeData.map((d) => d.dayOfWeek);
  const calendarPositions = safeData.map((_, i) => {
    const dayNum = i + 1;
    if (dayNum === 1) return { row: 0, col: firstDayOfWeek };
    const daysFromStart = dayNum - 1;
    return {
      row: Math.floor((firstDayOfWeek + daysFromStart) / 7),
      col: (firstDayOfWeek + daysFromStart) % 7
    };
  });

  const kuliahBulananTemplate = applyConfig(slidesTemplate.kuliahBulanan, 'kuliahBulanan');
  const kuliahBulananSlide = JSON.parse(JSON.stringify(kuliahBulananTemplate));
  const parent = kuliahBulananSlide.captions[0];

  if (parent) {
    if (parent.children && parent.children.length > 0) {
      parent.children[0].content = 'JADUAL KULIAH BULAN INI';
    }
    const cards = buildKuliahBulananChildren(totalDays, dayOfWeekArray, calendarPositions);
    parent.children = [parent.children[0], ...cards];

    const dayNumFontSize = Math.round(textSize(117));
    const KULIAH_BULANAN_FONT_SIZE = Math.round(textSize(24));
    const KITAB_ITEM_FONT_SIZE = Math.round(textSize(15));

    for (let i = 0; i < totalDays; i++) {
      const dayData = safeData[i];
      const base = 1 + i;
      if (!parent.children[base]) continue;

      const dayNumberStr = String(dayData.dayNumber).padStart(2, '0');
      const isToday = dayData.dayNumber === currentDay;
      const dayNumberColor = isToday ? '#cc000040' : '#80808040';
      const dayNumberStyle = `text-align:right; font-size:${dayNumFontSize}px; font-family:'bebas',sans-serif; color:${dayNumberColor}; position:absolute; right:0; line-height:1.1; bottom:0;`;
      const dayNumberHtml = `<div style="${dayNumberStyle}">${dayNumberStr}</div>`;

      let contentHtml = '';
      if (dayData.entries && dayData.entries.length > 0) {
        const rows = dayData.entries.map((k, rowIndex) => {
          if (k.replacementText != null && k.replacementText !== '') {
            const rowGapTop = rowIndex === 0 ? '0' : '1px';
            const replacementStyle = `font-size:${KULIAH_BULANAN_FONT_SIZE}px; font-weight:bold; vertical-align:top; padding:0; padding-top:${rowGapTop}; color:#ff0000; text-transform:uppercase; text-align:center;`;
            return `<tr><td colspan="3" style="${replacementStyle}">${esc(k.replacementText)}</td></tr>`;
          }
          const typeLabel = (k.type || '').toUpperCase();
          const isBatal = k.isBatal === true;
          let kitabHtml = '';
          if (k.kitab) {
            const kitabItems = String(k.kitab)
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean);
            const itemStyle = isBatal
              ? `font-size:${KITAB_ITEM_FONT_SIZE}px;word-wrap:break-word;white-space:normal;line-height:1;text-decoration:line-through;opacity:0.6;`
              : `font-size:${KITAB_ITEM_FONT_SIZE}px;word-wrap:break-word;white-space:normal;line-height:1`;
            const kitabItemsHtml = kitabItems.map((item) => `<li style="${itemStyle}">${esc(item)}</li>`).join('');
            kitabHtml = `<ul style="margin-top:-3px;margin-left:19px;list-style-type:square">${kitabItemsHtml}</ul>`;
          }
          const typeStyle = isBatal
            ? `font-size:${KULIAH_BULANAN_FONT_SIZE}px;text-decoration:line-through;opacity:0.6;`
            : `font-size:${KULIAH_BULANAN_FONT_SIZE}px;`;
          const penceramahStyle = isBatal
            ? `font-size:${KULIAH_BULANAN_FONT_SIZE}px;text-decoration:line-through;opacity:0.6;`
            : `font-size:${KULIAH_BULANAN_FONT_SIZE}px;`;
          const rowGapTop = rowIndex === 0 ? '0' : '1px';
          return `<tr>
            <td style="${typeStyle} vertical-align:top; padding:0 5px; padding-top:${rowGapTop}; white-space:nowrap; width:49.3px">${typeLabel}</td>
            <td style="font-size:${KULIAH_BULANAN_FONT_SIZE}px; vertical-align:top; padding:0; padding-right: 3px; padding-top:${rowGapTop}; color:#666;">|</td>
            <td style="vertical-align:top; padding:0; padding-top:${rowGapTop}; text-align:left;">
              <div style="padding-right:3px; word-break: break-all; height: 40px; overflow: hidden;">
                ${isBatal
                  ? `<span style="color:#e00;font-size:${KULIAH_BULANAN_FONT_SIZE}px;">(DITANGGUH)</span>`
                  : `<span style="display:block; ${penceramahStyle} word-wrap:break-word; white-space:normal; margin:0; padding:0; text-align:left; line-height:1.25;padding-top: 4px;">${esc(k.penceramah || '')}</span> `}
              </div>
            </td></tr>`;
        });
        contentHtml = `<div style="font-size:${KULIAH_BULANAN_FONT_SIZE}px;font-family:'Roboto',sans-serif;font-weight:bold; position:absolute; top:0; left:0; margin:0; padding:0;width:100%">
          <table style="border-collapse:collapse; width:100%; margin:0; padding:0;"><tbody>${rows.join('')}</tbody></table>
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

  return [kuliahBulananSlide];
}
