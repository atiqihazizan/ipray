/**
 * Date Formatter Utilities
 * Format tarikh dan masa untuk paparan dalam slider
 */

import { DAY_NAMES, MASIHI_MONTHS } from './islamicTimeUtils';

/**
 * Format tarikh dan masa dari string "yyyy-mm-dd hh:mm" atau "yyyy-mm-dd hh:mm-hh:mm"
 * @param {string} dateTimeString - Format: "2023-04-02 19:00" atau "2023-04-02 19:00-21:30"
 * @param {string} timeFormat - Format masa: "12" atau "24" (default: "12" untuk display)
 * @returns {Object} { date: "JUMAAT, 02 MAC 2023", time: "7PM" atau "7PM–9:30PM", standardTime: "19:00" }
 */
export const formatDateTime = (dateTimeString, timeFormat = '12') => {
  if (!dateTimeString) {
    return { date: '', time: '' };
  }

  // Split date dan time (boleh ada range time dengan dash)
  const [datePart, timePart] = dateTimeString.trim().split(' ');
  
  if (!datePart || !timePart) {
    return { date: '', time: '' };
  }

  // Parse date: yyyy-mm-dd
  const [year, month, day] = datePart.split('-').map(Number);
  
  if (!year || !month || !day) {
    return { date: '', time: '' };
  }

  // Buat Date object
  const date = new Date(year, month - 1, day);
  
  // Dapatkan nama hari
  const dayIndex = date.getDay();
  const dayName = DAY_NAMES[dayIndex];
  
  // Dapatkan nama bulan (month adalah 0-indexed dalam Date, tapi kita dah tolak 1)
  const monthName = MASIHI_MONTHS[month];
  
  // Format date: "JUMAAT, 02 MAC 2023"
  const formattedDate = `${dayName}, ${day.toString().padStart(2, '0')} ${monthName} ${year}`;
  
  // Parse time: boleh jadi "19:00" atau "19:00-21:30"
  const timeParts = timePart.split('-');
  const startTime = timeParts[0];
  const endTime = timeParts[1];
  
  // Format start time berdasarkan timeFormat
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const startFormatted = timeFormat === '24' 
    ? formatTimeTo24Hour(startHours, startMinutes)
    : formatTimeTo12Hour(startHours, startMinutes);
  
  // Format end time jika ada
  let formattedTime = startFormatted;
  if (endTime) {
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const endFormatted = timeFormat === '24'
      ? formatTimeTo24Hour(endHours, endMinutes)
      : formatTimeTo12Hour(endHours, endMinutes);
    formattedTime = `${startFormatted}–${endFormatted}`;
  }
  
  // Format standard time (24-hour format) untuk index 4
  const standardTime = timePart; // "19:00" atau "19:00-21:30"
  
  return {
    date: formattedDate,
    time: formattedTime, // Format berdasarkan timeFormat (default 12 untuk display)
    standardTime: standardTime // Selalu 24-hour format
  };
};

/**
 * Format jam dan minit kepada format 12 jam dengan AM/PM
 * @param {number} hours - Jam (0-23)
 * @param {number} minutes - Minit (0-59)
 * @returns {string} Format: "8PM", "8:30PM", "12:00PM", dll
 */
const formatTimeTo12Hour = (hours, minutes) => {
  const h = hours || 0;
  const m = minutes || 0;
  
  // Convert kepada 12-hour format
  let hour12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
  const ampm = h >= 12 ? 'PM' : 'AM';
  
  // Jika ada minit, tambah minit, jika tidak hanya jam
  if (m > 0) {
    return `${hour12}:${m.toString().padStart(2, '0')}${ampm}`;
  } else {
    return `${hour12}${ampm}`;
  }
};

/**
 * Format jam dan minit kepada format 24 jam
 * @param {number} hours - Jam (0-23)
 * @param {number} minutes - Minit (0-59)
 * @returns {string} Format: "19:00", "08:30", dll
 */
const formatTimeTo24Hour = (hours, minutes) => {
  const h = hours || 0;
  const m = minutes || 0;
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Kira countdown dari tarikh dan masa sekarang ke tarikh dan masa yang diberikan
 * @param {string} dateTimeString - Format: "2023-04-02 19:00" atau "2023-04-02 19:00-21:30"
 * @returns {string} Format: "3 HARI LAGI", "HARI INI", "1 HARI LAGI", atau "LEWAT" jika sudah lepas
 */
export const getCountdown = (dateTimeString) => {
  if (!dateTimeString) {
    return "";
  }

  // Split date dan time
  const [datePart, timePart] = dateTimeString.trim().split(' ');
  
  if (!datePart || !timePart) {
    return "";
  }

  // Parse date: yyyy-mm-dd
  const [year, month, day] = datePart.split('-').map(Number);
  
  if (!year || !month || !day) {
    return "";
  }

  // Parse time: ambil start time sahaja
  const startTime = timePart.split('-')[0];
  const [hours, minutes] = startTime.split(':').map(Number);

  // Buat Date object untuk target date/time
  const targetDate = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
  
  // Dapatkan tarikh dan masa sekarang
  const now = new Date();
  
  // Kira perbezaan dalam milliseconds
  const diffMs = targetDate.getTime() - now.getTime();
  
  // Kira perbezaan dalam hari (bulatkan ke bawah)
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Format countdown
  if (diffDays < 0) {
    return "LEWAT";
  } else if (diffDays === 0) {
    // Semak jika masih dalam hari yang sama (belum lepas masa)
    const sameDay = now.getDate() === targetDate.getDate() && 
                    now.getMonth() === targetDate.getMonth() && 
                    now.getFullYear() === targetDate.getFullYear();
    
    if (sameDay && diffMs >= 0) {
      return "HARI INI";
    } else if (diffMs < 0) {
      return "LEWAT";
    } else {
      return "HARI INI";
    }
  } else if (diffDays === 1) {
    return "1 HARI LAGI";
  } else {
    return `${diffDays} HARI LAGI`;
  }
};
