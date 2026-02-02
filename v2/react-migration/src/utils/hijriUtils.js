// Utility functions untuk pengiraan tarikh hijri
// Menggunakan algoritma yang sama seperti kod asal

const hname = ["HIJRAH", "MUHARRAM", "SAFAR", "RAB.AWAL", "RAB.AKHIR", "JAM.AWAL", "JAM.AKHIR", "REJAB", "SYA`BAN", "RAMADHAN", "SYAWAL", "ZULKAEDAH", "ZULHIJJAH"]

/**
 * Mengira jumlah hari dalam tahun Masihi
 * @param {number} year - Tahun
 * @param {number} month - Bulan (1-12)
 * @param {number} day - Hari
 * @returns {Array} [days, daysm] - hari dalam bulan dan hari dalam tahun
 */
export const getYearDays = (year, month, day) => {
  const mdays = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let days = day
  for (let i = 1; i < month; i++) days += mdays[i]
  let daysm = days
  let yy = (year % 100)
  if (yy > 0) daysm += (yy * 365) + parseInt((yy - 1) / 4) + 1
  return [days, daysm]
}

/**
 * Mengira tarikh hijri menggunakan algoritma yang tepat
 * @param {number} daysm - Jumlah hari dalam tahun Masihi
 * @param {number} maghrib - Waktu maghrib dalam minit (0 jika tidak tersedia)
 * @param {number} mins - Masa sekarang dalam minit
 * @param {Array} hdata - Data hijri dari takwim.txt
 * @returns {Object} {day, month, year, monthName}
 */
export const calculateHijriDate = (daysm, maghrib = 0, mins = 0, hdata = null) => {
  let DayH = 24, MonH = 9, YearH = 1420
  let DaysH = daysm
  
  // Berubah selepas maghrib
  if (maghrib <= mins && mins < 1440) DaysH++

  // Guna algoritma hijri yang tepat dengan hdata dari takwim.txt
  let useFallback = false
  const DaysH_Original = DaysH // SIMPAN nilai asal untuk fallback
  
  if (hdata && hdata.length > 1) {
    let SetF = 31 - DayH, DatP = 1, BitP = 0
    let SetS = hdata[DatP]
    let hdataExhausted = false
    
    let iterations = 0
    while (DaysH > 0 && !hdataExhausted && iterations < 50) {
      iterations++
      if (SetS & 0x01) SetF++
      if (DaysH > SetF) {
        DayH = 0
        DaysH -= SetF
        MonH++
        if (MonH === 13) {
          MonH = 1
          YearH++
        }
        SetS = (SetS >> 1)
        SetF = 29
        BitP++
        if (BitP == 8) {
          DatP++
          BitP = 0
          if (DatP < hdata.length) {
            SetS = hdata[DatP]
          } else {
            hdataExhausted = true
            break
          }
        }
      } else {
        DayH += DaysH
        DaysH = 0
      }
    }
    
    // Jika hdata tidak mencukupi, guna fallback
    if (DaysH > 0 || hdataExhausted) useFallback = true
  } else {
    // Tiada hdata, guna fallback
    useFallback = true
  }
  
  // Fallback approximation - GUNA DaysH_Original (nilai asal, bukan yang sudah dikurangkan)
  if (useFallback) {
    const gregorianYear = 2000 + Math.floor(DaysH_Original / 365.25)
    const hijriYear = gregorianYear - 578
    const daysInHijriYear = DaysH_Original % 365
    const hijriDays = Math.floor(daysInHijriYear * 0.970) + 6
    
    DayH = (hijriDays % 30) + 1
    MonH = Math.floor(hijriDays / 30) + 1 - 6
    YearH = hijriYear
    
    // Pastikan dalam range yang betul
    if (MonH > 12) {
      MonH = MonH % 12
      YearH++
    }
    if (MonH <= 0) {
      MonH = 12 + MonH
      YearH--
    }
    if (DayH > 30) {
      DayH = DayH % 30
      MonH++
    }
    if (DayH <= 0) {
      DayH = 30 + DayH
      MonH--
    }
  }

  return {
    day: DayH,
    month: MonH,
    year: YearH,
    monthName: hname[MonH] || hname[1]
  }
}

/**
 * Konversi tarikh Masihi ke Hijri
 * @param {string} masiDateStr - Tarikh Masihi dalam format YYYY-MM-DD
 * @param {Array} hdata - Data hijri dari takwim.txt
 * @returns {Object} {day, month, year, monthName, formatted}
 */
export const convertToHijri = (masiDateStr, hdata = null) => {
  const date = new Date(masiDateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  
  const [days, daysm] = getYearDays(year, month, day)
  const hijri = calculateHijriDate(daysm, 0, 0, hdata) // Tidak perlu maghrib untuk tarikh statik
  
  return {
    day: hijri.day,
    month: hijri.month,
    year: hijri.year,
    monthName: hijri.monthName,
    formatted: `${hijri.day}-${hijri.monthName}`
  }
}
