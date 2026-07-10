/**
 * Helper bersama untuk slide processors (escape, kuliah batal).
 */
import { getWeekCode, getDayCode } from '../utils/kuliahHelpers';

export const escapeHtml = (s) =>
  String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Semak kuliah match rekod kuliah-batal (Hari Ini & Mingguan). Match: tarikh semasa + type.
 * @returns {{ isBatal: boolean, notes: string }}
 */
export function isKuliahBatal(kuliahItem, kuliahBatalData) {
  if (!kuliahBatalData || !Array.isArray(kuliahBatalData) || kuliahBatalData.length === 0) {
    return { isBatal: false, notes: '' };
  }
  if (!kuliahItem || typeof kuliahItem !== 'string') {
    return { isBatal: false, notes: '' };
  }
  const arr = kuliahItem.split('|');
  const type = (arr[2] || '').trim();
  if (!type) return { isBatal: false, notes: '' };

  const currentDate = new Date();
  const dayStr = String(currentDate.getDate()).padStart(2, '0');
  const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
  const yearStr = String(currentDate.getFullYear());
  const formattedDate = `${dayStr}-${monthStr}-${yearStr}`;

  let matchedNotes = '';
  const match = kuliahBatalData.some((batal) => {
    if (!batal || !batal.date || !batal.type) return false;
    const batalDate = String(batal.date).trim();
    const batalType = String(batal.type).trim();
    if (batalDate === formattedDate && batalType === type) {
      matchedNotes = batal.notes || '';
      return true;
    }
    return false;
  });

  return { isBatal: match, notes: matchedNotes };
}

/**
 * Semak kuliah match rekod kuliah-batal (Bulanan). Match: week + day + type dari tarikh batal.
 * @returns {{ isBatal: boolean, notes: string }}
 */
export function isKuliahBatalByWeekDay(kuliahItem, kuliahBatalData) {
  if (!kuliahBatalData || !Array.isArray(kuliahBatalData) || kuliahBatalData.length === 0) {
    return { isBatal: false, notes: '' };
  }
  if (!kuliahItem || typeof kuliahItem !== 'string') {
    return { isBatal: false, notes: '' };
  }
  const arr = kuliahItem.split('|');
  const week = (arr[0] || '').trim();
  const dayCode = (arr[1] || '').trim();
  const type = (arr[2] || '').trim();
  if (!week || !dayCode || !type) return { isBatal: false, notes: '' };

  let matchedNotes = '';
  const match = kuliahBatalData.some((batal) => {
    if (!batal || !batal.date || !batal.type) return false;
    const batalDate = String(batal.date).trim();
    const batalType = String(batal.type).trim();
    const dateParts = batalDate.split('-');
    if (dateParts.length !== 3) return false;
    const dayNum = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);
    if (isNaN(dayNum) || isNaN(month) || isNaN(year)) return false;
    const date = new Date(year, month, dayNum);
    const batalWeek = getWeekCode(date);
    const batalDay = getDayCode(date);
    if (week === batalWeek && dayCode === batalDay && type === batalType) {
      matchedNotes = batal.notes || '';
      return true;
    }
    return false;
  });

  return { isBatal: match, notes: matchedNotes };
}
