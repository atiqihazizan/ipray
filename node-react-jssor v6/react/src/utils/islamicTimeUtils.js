/**
 * Islamic Time Utilities
 * Utility lengkap untuk menguruskan waktu solat, tarikh Hijri dan Masehi
 * Menggunakan data dari takwim.txt dengan format offline
 */

// Nama bulan Hijri
export const HIJRI_MONTHS = [
  "HIJRAH", "MUHARRAM", "SAFAR", "RAB.AWAL", "RAB.AKHIR", 
  "JAM.AWAL", "JAM.AKHIR", "REJAB", "SYA`BAN", "RAMADHAN", 
  "SYAWAL", "ZULKAEDAH", "ZULHIJJAH"
];

// Nama bulan Masehi (short)
export const MASIHI_MONTHS = [
  "MASIHI", "JAN", "FEB", "MAC", "APR", "MEI", "JUN", 
  "JUL", "OGS", "SEP", "OKT", "NOV", "DIS"
];

// Nama hari
export const DAY_NAMES = [
  "AHAD", "ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT", "SABTU"
];

// Nama waktu solat
export const PRAYER_NAMES = [
  "MASA", "SUBUH", "SYURUK", "ZOHOR", "ASAR", "MAGHRIB", "ISYAK"
];

// Jumlah hari dalam bulan
const MONTH_DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Parse fail takwim.txt
 * @param {string} text - Kandungan fail takwim.txt
 * @returns {Object} { zone, hdata, wdata }
 */
export const parseTakwimFile = (text) => {
  const lines = text.split(/\r?\n/);
  
  // Baris 1: Nama zon
  const zone = lines[0] || "";
  
  // Baris 2: HIJRI_DATA
  const hijriLine = lines[1] || "";
  const hijriData = hijriLine.split("=")[1] || "";
  
  // Parse HIJRI_DATA dari format HEX
  const hdata = [24]; // Element pertama adalah 24
  for (let i = 0; i < hijriData.length; i += 2) {
    const byte = parseInt(hijriData.substr(i, 2), 16);
    hdata.push(byte);
  }
  
  // Parse data waktu solat (dari baris 3 seterusnya)
  const wdata = [null]; // Index 0 tidak digunakan
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(/\t+/);
    if (parts.length === 8) {
      const times = [];
      // parts[0] adalah tarikh (DD-MM-YYYY DD-MM-YYYY)
      // parts[1-7] adalah waktu solat
      for (let j = 1; j < 8; j++) {
        times.push(timeToValue(parts[j]));
      }
      times.push(parts[0]); // Simpan tarikh sebagai element terakhir
      wdata.push(times);
    }
  }
  
  return { zone, hdata, wdata };
};

/**
 * Convert string masa "HH:MM" kepada integer HHMM
 * @param {string} timeStr - Format "HH:MM"
 * @returns {number} Integer HHMM (contoh: "06:15" => 615)
 */
export const timeToValue = (timeStr) => {
  const parts = timeStr.split(":");
  return parseInt(parts[0]) * 100 + parseInt(parts[1]);
};

/**
 * Convert integer HHMM kepada string "HH:MM"
 * @param {number} value - Integer HHMM
 * @returns {string} Format "HH:MM"
 */
export const valueToTime = (value) => {
  const hours = Math.floor(value / 100);
  const minutes = value % 100;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Convert waktu ke format 12-jam
 * @param {number} value - Integer HHMM
 * @returns {string} Format "H:MM" (12-jam)
 */
export const timeTo12Hour = (value) => {
  let hours = Math.floor(value / 100);
  const minutes = value % 100;
  
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Convert waktu kepada minit sejak tengah malam
 * @param {number} hhmm - Integer HHMM
 * @returns {number} Jumlah minit
 */
export const timeToMinutes = (hhmm) => {
  const hours = Math.floor(hhmm / 100);
  const minutes = hhmm % 100;
  return hours * 60 + minutes;
};

/**
 * Convert minit sejak tengah malam kepada HHMM
 * @param {number} minutes - Jumlah minit
 * @returns {number} Integer HHMM
 */
export const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours * 100 + mins;
};

/**
 * Kira jumlah hari dalam tahun dan hari sejak epoch (2000)
 * @param {number} year - Tahun Masehi
 * @param {number} month - Bulan (1-12)
 * @param {number} day - Hari
 * @returns {Array} [days dalam tahun, daysm sejak epoch]
 */
export const getYearDays = (year, month, day) => {
  let days = day;
  for (let i = 1; i < month; i++) {
    days += MONTH_DAYS[i];
  }
  
  let daysm = days;
  const yy = year % 100; // Tahun sejak 2000 (0-99)
  
  // Formula: daysm = days + (tahun sejak 2000 * 365) + bilangan tahun lompat + 1
  // Tahun lompat: setiap 4 tahun (2000, 2004, 2008, ...)
  // Untuk tahun yy, bilangan tahun lompat = Math.floor((yy - 1) / 4) + 1
  // +1 kerana tahun 2000 sendiri adalah tahun lompat
  if (yy > 0) {
    const leapYears = Math.floor((yy - 1) / 4) + 1;
    daysm += (yy * 365) + leapYears;
  }
  
  return [days, daysm];
};

/**
 * Kira tarikh Hijri dari tarikh Masehi
 * @param {Object} params - { hdata, daysm, maghrib, currentMinutes }
 * @returns {Object} { day, month, year }
 */
export const calculateHijri = ({ hdata, daysm, maghrib = 0, currentMinutes = 0 }) => {
  // Starting point: 25 Syaaban 1420H (adjusted from 24 to fix off-by-one error)
  let DayH = 25;
  let MonH = 9;
  let YearH = 1420;
  let DaysH = daysm;
  
  // Jika masa sekarang >= Maghrib dan < tengah malam, tambah 1 hari Hijri
  if (maghrib <= currentMinutes && currentMinutes < 1440) {
    DaysH++;
  }
  
  let SetF = 31 - DayH;
  let DatP = 1;
  let BitP = 0;
  let SetS = hdata[DatP];
  
  while (DaysH > 0) {
    if (SetS & 0x01) SetF++;
    
    if (DaysH > SetF) {
      DayH = 0;
      DaysH -= SetF;
      MonH++;
      
      if (MonH === 13) {
        MonH = 1;
        YearH++;
      }
      
      SetS = (SetS >> 1);
      SetF = 29;
      BitP++;
      
      if (BitP === 8) {
        DatP++;
        BitP = 0;
        SetS = hdata[DatP];
      }
    } else {
      DayH += DaysH;
      DaysH = 0;
    }
  }
  
  return {
    day: DayH,
    month: MonH,
    year: YearH,
    monthName: HIJRI_MONTHS[MonH],
    formatted: `${DayH}-${HIJRI_MONTHS[MonH]}`
  };
};

/**
 * Dapatkan maklumat tarikh dan waktu semasa lengkap
 * @param {Object} params - { hdata, wdata, timeService }
 * @returns {Object} Maklumat lengkap tarikh, waktu, dan waktu solat
 */
export const getCurrentIslamicTime = ({ hdata, wdata, timeService }) => {
  const timestamp = Date.now();
  const now = new Date(timestamp);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const dayOfWeek = now.getDay();
  
  // Kira hari dalam tahun
  const [days, daysm] = getYearDays(year, month, day);
  
  // Dapatkan waktu solat untuk hari ini
  // Jika data tidak ada untuk hari ini (contoh: tahun 2026 tapi data untuk 2021),
  // cuba guna data dari hari yang sama dalam tahun data (modulo 365)
  let todayPrayer = wdata[days] || [];
  if (!todayPrayer || todayPrayer.length === 0) {
    // Guna data dari hari yang sama dalam tahun (untuk tahun yang berbeza)
    const dayInDataYear = ((days - 1) % 365) + 1;
    todayPrayer = wdata[dayInDataYear] || [];
  }
  
  const maghribTime = todayPrayer[5] || 0;
  const maghribMinutes = timeToMinutes(maghribTime);
  const currentMinutes = hours * 60 + minutes;
  const currentTime = hours * 100 + minutes;
  
  // Kira tarikh Hijri
  const hijri = calculateHijri({
    hdata,
    daysm,
    maghrib: maghribMinutes,
    currentMinutes
  });
  
  // Tentukan waktu solat semasa dan seterusnya
  const prayerInfo = getCurrentPrayerInfo({ wdata, days, currentMinutes });
  
  return {
    // Tarikh Masehi
    gregorian: {
      year,
      month,
      day,
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      monthName: MASIHI_MONTHS[month],
      dayFormatted: padZero(day),
      formatted: `${padZero(day)} ${MASIHI_MONTHS[month]} ${year}`,
      fullFormatted: `${DAY_NAMES[dayOfWeek]}, ${padZero(day)} ${MASIHI_MONTHS[month]} ${year}`
    },
    
    // Tarikh Hijri
    hijri: {
      day: hijri.day,
      month: hijri.month,
      year: hijri.year,
      monthName: hijri.monthName,
      dayFormatted: padZero(hijri.day),
      formatted: `${padZero(hijri.day)} ${hijri.monthName} ${hijri.year}H`,
      shortFormatted: `${padZero(hijri.day)}-${hijri.monthName}`
    },
    
    // Waktu semasa
    time: {
      hours,
      minutes,
      seconds,
      hours12: hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours),
      ampm: hours >= 12 ? 'PM' : 'AM',
      formatted24: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
      formatted12: `${hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours)}:${minutes.toString().padStart(2, '0')}`,
      totalMinutes: currentMinutes,
      timeValue: currentTime
    },
    
    // Waktu solat
    prayer: {
      times: getPrayerTimes(todayPrayer),
      current: prayerInfo.current,
      next: prayerInfo.next,
      nextTime: prayerInfo.nextTime,
      timeToNext: prayerInfo.timeToNext,
      timeToNextFormatted: prayerInfo.timeToNextFormatted
    },
    
    // Data mentah
    raw: {
      days,
      daysm,
      currentMinutes,
      maghribMinutes,
      hdataLength: hdata.length,
      wdataLength: wdata.length
    }
  };
};

/**
 * Dapatkan waktu solat dalam format yang mudah
 * @param {Array} prayerData - Data waktu solat dari wdata
 * @returns {Object} Waktu solat
 */
const getPrayerTimes = (prayerData) => {
  if (!prayerData || prayerData.length < 7) {
    return {};
  }
  
  return {
    Imsak: valueToTime(prayerData[0]),
    Subuh: valueToTime(prayerData[1]),
    Syuruk: valueToTime(prayerData[2]),
    Zohor: valueToTime(prayerData[3]),
    Asar: valueToTime(prayerData[4]),
    Maghrib: valueToTime(prayerData[5]),
    Isyak: valueToTime(prayerData[6]),
    // Format untuk display
    formatted: {
      Subuh: timeTo12Hour(prayerData[1]),
      Syuruk: timeTo12Hour(prayerData[2]),
      Zohor: timeTo12Hour(prayerData[3]),
      Asar: timeTo12Hour(prayerData[4]),
      Maghrib: timeTo12Hour(prayerData[5]),
      Isyak: timeTo12Hour(prayerData[6])
    }
  };
};

/**
 * Dapatkan maklumat waktu solat semasa dan seterusnya
 * @param {Object} params - { wdata, days, currentMinutes }
 * @returns {Object} Info waktu solat
 */
const getCurrentPrayerInfo = ({ wdata, days, currentMinutes }) => {
  const todayPrayer = wdata[days] || [];
  const tomorrowPrayer = wdata[days + 1] || todayPrayer;
  
  let currentPrayer = null;
  let nextPrayer = null;
  let nextTime = 0;
  let timeToNext = 0;
  let currentPrayerIndex = null;
  
  // Cari waktu solat semasa dan seterusnya
  for (let i = 1; i <= 6; i++) {
    const prayerTime = todayPrayer[i];
    const prayerMinutes = timeToMinutes(prayerTime);
    
    if (currentMinutes < prayerMinutes) {
      // Waktu solat seterusnya untuk hari ini
      nextPrayer = PRAYER_NAMES[i];
      nextTime = prayerTime;
      timeToNext = prayerMinutes - currentMinutes;
      
      // Waktu solat semasa adalah yang sebelumnya
      if (i > 1) {
        currentPrayer = PRAYER_NAMES[i - 1];
        currentPrayerIndex = i - 1;
      }
      break;
    }
  }
  
  // Jika tiada waktu solat lagi untuk hari ini, gunakan Subuh hari ini
  if (!nextPrayer) {
    nextPrayer = "SUBUH";
    nextTime = todayPrayer[1] || 0;
    timeToNext = 0;
    currentPrayer = "ISYAK";
    currentPrayerIndex = 6;
  }
  
  // Check jika sedang dalam minit pertama waktu solat semasa
  // Jika ya, nextPrayer akan tunjuk waktu solat semasa (delay 1 minit)
  if (currentPrayer && currentPrayerIndex) {
    const currentPrayerTime = todayPrayer[currentPrayerIndex];
    const currentPrayerMinutes = timeToMinutes(currentPrayerTime);
    
    // Jika currentMinutes sama dengan currentPrayerMinutes (dalam minit pertama)
    if (currentMinutes === currentPrayerMinutes) {
      // Delay nextPrayer - tunjuk current prayer
      nextPrayer = currentPrayer;
      nextTime = currentPrayerTime;
      timeToNext = 0; // Sudah masuk waktu
    }
  }
  
  // Format masa tinggal
  const hoursLeft = Math.floor(timeToNext / 60);
  const minutesLeft = timeToNext % 60;
  
  return {
    current: currentPrayer,
    next: nextPrayer,
    nextTime: valueToTime(nextTime),
    timeToNext,
    timeToNextFormatted: `${hoursLeft} jam ${minutesLeft} minit`
  };
};

/**
 * Format nombor dengan leading zero
 * @param {number} num - Nombor
 * @returns {string} Nombor dengan leading zero
 */
export const padZero = (num) => {
  return num.toString().padStart(2, '0');
};

/**
 * Convert data takwim.txt ke format array untuk prayerTimeService
 * @param {string} text - Kandungan fail takwim.txt
 * @returns {Array} Array of prayer times dalam format { date, Subuh, Syuruk, Zohor, Asar, Maghrib, Isyak }
 */
export const convertTakwimToArray = (text) => {
  const lines = text.split(/\r?\n/);
  const result = [];
  
  // Skip baris 1 (zone) dan baris 2 (HIJRI_DATA)
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(/\t+/);
    if (parts.length === 8) {
      // parts[0] = "DD-MM-YYYY DD-MM-YYYY" (Masehi Hijri)
      const gregorianDate = parts[0].split(' ')[0]; // Ambil tarikh Masehi sahaja
      const [day, month, year] = gregorianDate.split('-').map(Number);
      
      // Format date sebagai YYYY-MM-DD
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // parts[1-7] adalah waktu solat: Imsak, Subuh, Syuruk, Zohor, Asar, Maghrib, Isyak
      result.push({
        date: dateStr,
        Subuh: parts[2], // Index 2 = Subuh
        Syuruk: parts[3], // Index 3 = Syuruk
        Zohor: parts[4], // Index 4 = Zohor
        Asar: parts[5], // Index 5 = Asar
        Maghrib: parts[6], // Index 6 = Maghrib
        Isyak: parts[7] // Index 7 = Isyak
      });
    }
  }
  
  return result;
};

/**
 * Export fungsi-fungsi utility
 */
export default {
  parseTakwimFile,
  getCurrentIslamicTime,
  calculateHijri,
  getYearDays,
  timeToValue,
  valueToTime,
  timeTo12Hour,
  timeToMinutes,
  minutesToTime,
  padZero,
  convertTakwimToArray,
  HIJRI_MONTHS,
  MASIHI_MONTHS,
  DAY_NAMES,
  PRAYER_NAMES
};
