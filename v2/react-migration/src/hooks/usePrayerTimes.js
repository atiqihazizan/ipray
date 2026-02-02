import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { getYearDays, calculateHijriDate } from '../utils/hijriUtils'

export const usePrayerTimes = (prayerData, config = { timeFormat: true, imsakDisplay: false }) => {
  // Safe config access dengan null check
  const safeConfig = {
    timeFormat: config?.timeFormat ?? true,
    imsakDisplay: config?.imsakDisplay ?? false
  }
  
  const [currentTime, setCurrentTime] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [currentDate, setCurrentDate] = useState({ day: 0, dayName: '', monthYear: '' })
  const [hijriDate, setHijriDate] = useState({ day: 0, monthName: '', year: 0 })
  const [prayerTimes, setPrayerTimes] = useState([])
  const [nextPrayer, setNextPrayer] = useState(null)
  const [timeToNext, setTimeToNext] = useState(0)
  const [isPrayerTime, setIsPrayerTime] = useState(false)
  const [isBlinking, setIsBlinking] = useState(false)
  const [use24Hour, setUse24Hour] = useState(safeConfig.timeFormat) // true = 24 jam, false = 12 jam
  const [preAzanBlink, setPreAzanBlink] = useState(false)
  const [masukWaktu, setMasukWaktu] = useState(false)
  const [currentPrayerIndex, setCurrentPrayerIndex] = useState(null)
  const [showImsak, setShowImsak] = useState(safeConfig.imsakDisplay) // true = show imsak, false = hide imsak
  const [holdTransition, setHoldTransition] = useState(false) // Hold transition untuk pre-azan
  // OPTIMIZED: showDot state removed - using CSS animation instead
  
  // Track jika audio sudah play untuk elak double trigger
  const audioPlayedRef = useRef(false)
  const lastPrayerMinuteRef = useRef(null)
  
  // OPTIMIZED: Create audio instance only once and cleanup properly
  const beepAudio = useMemo(() => {
    const audio = new Audio('./audio/beep_loop_solat.wav')
    audio.preload = 'auto'
    return audio
  }, [])

  // Constants - sama seperti original
  const wdays = ["AHAD", "ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT", "SABTU"]
  const mname = ["MASIHI", "JAN", "FEB", "MAC", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
  const hname = ["HIJRAH", "MUHARRAM", "SAFAR", "RAB.AWAL", "RAB.AKHIR", "JAM.AWAL", "JAM.AKHIR", "REJAB", "SYA`BAN", "RAMADHAN", "SYAWAL", "ZULKAEDAH", "ZULHIJJAH"]
  const wname = ["IMSAK", "SUBUH", "SYURUK", "ZOHOR", "ASAR", "MAGHRIB", "ISYAK"]

  // Helper functions - sama seperti original
  const NUM2 = (dd) => parseInt(dd) < 10 ? "0" + dd : "" + dd
  
  const TimeToMin = (hhmm) => {
    hhmm = parseInt(hhmm)
    const h = Math.floor(hhmm / 100)
    const m = hhmm % 100
    return h * 60 + m
  }
  
  const TimeToTime = (dd) => {
    let h = parseInt(dd / 100)
    let m = parseInt(dd % 100)
    return (h == 0 ? 12 : (h > 12 ? h-12 : h)) + ":" + NUM2(m)
  }

  // Update current time - OPTIMIZED: Reduced from 500ms to 1000ms
  useEffect(() => {
    let tickCount = 0 // Counter untuk track kelipan
    
    const updateTime = () => {
      tickCount++
      
      // Update masa/tarikh setiap tick (segera)
      if (tickCount % 1 === 0) {
        // const now = new Date('2025-10-04')// new Date()
        const now = new Date()
        const hours = now.getHours()
        const minutes = now.getMinutes()
        const seconds = now.getSeconds()
        
        setCurrentTime({ hours, minutes, seconds })
        
        // Update date
        const day = now.getDate()
        const dayName = wdays[now.getDay()]
        const monthYear = mname[now.getMonth() + 1] + " " + now.getFullYear()

        setCurrentDate({ day, dayName, monthYear })
        
        // Calculate Hijri date (berubah selepas Maghrib)
        const [days, daysm] = getYearDays(now.getFullYear(), now.getMonth() + 1, day)
        let maghribMins = 0
        if (prayerData?.wdata && prayerData.wdata[days] && prayerData.wdata[days][5]) maghribMins = TimeToMin(prayerData.wdata[days][5])
        const hijri = calculateHijriDate(daysm, maghribMins, hours * 60 + minutes, prayerData?.hdata)
        
        setHijriDate({ day: hijri.day, monthName: hname[hijri.month], year: hijri.year })
      }
    }

    updateTime()
    const interval = setInterval(updateTime, 1000) // OPTIMIZED: 1 second instead of 500ms
    return () => {
      clearInterval(interval)
      // OPTIMIZED: Cleanup audio
      if (beepAudio) {
        beepAudio.pause()
        beepAudio.currentTime = 0
      }
    }
  }, [beepAudio])

  // Update prayer times when data changes
  useEffect(() => {
    if (!prayerData?.wdata) {
      // Use mock data for development - guna Imsak hingga Isyak atau Subuh hingga Isyak jika imsak hide
      const allMockTimes = [
        { name: "IMSAK", time: "05:48", minutes: 348 },
        { name: "SUBUH", time: "05:58", minutes: 358 },
        { name: "SYURUK", time: "07:04", minutes: 424 },
        { name: "ZOHOR", time: "13:10", minutes: 790 },
        { name: "ASAR", time: "16:23", minutes: 983 },
        { name: "MAGHRIB", time: "19:11", minutes: 1151 },
        { name: "ISYAK", time: "20:12", minutes: 1212 }
      ]
      const mockTimes = showImsak ? allMockTimes : allMockTimes.slice(1) // Skip imsak jika hide
      setPrayerTimes(mockTimes)
      setNextPrayer(0)
      setTimeToNext(60)
      return
    }

    const now = new Date()
    const [days] = getYearDays(now.getFullYear(), now.getMonth() + 1, now.getDate())
    const currentMins = now.getHours() * 60 + now.getMinutes()
    
    const times = []
    let nextPrayerIndex = null
    let minTimeToNext = Infinity

    // Process prayer times - guna Imsak hingga Isyak (index 0-6) atau Subuh hingga Isyak jika imsak hide
    const startIndex = showImsak ? 0 : 1
    for (let i = startIndex; i <= 6; i++) {
      const prayerTime = prayerData.wdata[days]?.[i]
      if (prayerTime) {
        const timeInMins = TimeToMin(prayerTime)
        const timeStr = TimeToTime(prayerTime)
        
        times.push({ name: wname[i], time: timeStr, minutes: timeInMins, originalIndex: i /* Simpan index asal untuk rujukan */})

        // Check if this is the next prayer
        if (timeInMins > currentMins && timeInMins - currentMins < minTimeToNext) {
          minTimeToNext = timeInMins - currentMins
          nextPrayerIndex = showImsak ? i : i - 1 // Adjust index jika imsak hide
        }
      }
    }

    // Check if we need to look at next day's first prayer
    if (nextPrayerIndex === null && prayerData.wdata[days + 1]) {
      if (showImsak) {
        // Jika imsak show, cari imsak hari berikutnya
        const imsakTime = TimeToMin(prayerData.wdata[days + 1][0])
        const timeToImsak = (24 * 60) - currentMins + imsakTime
        if (timeToImsak < minTimeToNext) {
          minTimeToNext = timeToImsak
          nextPrayerIndex = 0 // Imsak is index 0
        }
      } else {
        // Jika imsak hide, cari subuh hari berikutnya
        const subuhTime = TimeToMin(prayerData.wdata[days + 1][1])
        const timeToSubuh = (24 * 60) - currentMins + subuhTime
        if (timeToSubuh < minTimeToNext) {
          minTimeToNext = timeToSubuh
          nextPrayerIndex = 0 // Subuh is index 0 dalam array yang tidak termasuk imsak
        }
      }
    }

    setPrayerTimes(times)
    setTimeToNext(minTimeToNext)

    // Cari waktu solat semasa (wnow) dan waktu seterusnya (wnxt)
    let wnow = 0
    let wnxt = 0
    let masukWaktuIndex = 0
    let foundCurrentPrayer = false
    
    // Cari waktu solat semasa berdasarkan masa sekarang
    for (let i = 0; i < times.length; i++) {
      const prayer = times[i]
      const nextPrayer = times[i + 1] || times[0] // Wrap ke awal jika akhir array
      
      // Special case untuk Isyak ke Imsak (cross midnight)
      if (i === times.length - 1) { // Isyak (index 6)
        // Jika masa sekarang >= Isyak, maka waktu semasa adalah Isyak
        if (currentMins >= prayer.minutes) {
          wnow = i
          foundCurrentPrayer = true
          break
        }
      } else {
        // Normal case untuk waktu lain
        if (currentMins >= prayer.minutes && currentMins < nextPrayer.minutes) {
          wnow = i
          foundCurrentPrayer = true
          break
        }
      }
    }
    
    // Cari waktu seterusnya
    if (!foundCurrentPrayer) {
      // Masa sekarang sebelum waktu solat pertama (before Subuh/Imsak)
      wnxt = 0 // Waktu seterusnya adalah waktu solat pertama
    } else if (wnow + 1 >= times.length) {
      // Cross midnight - selepas Isyak
      wnxt = 0 // Selalu kembali ke index 0 (imsak jika show, subuh jika hide)
    } else {
      wnxt = wnow + 1
    }
    
    // Cek jika masa sekarang tepat sama dengan mana-mana waktu solat
    for (let i = 0; i < times.length; i++) {
      if (currentMins === times[i].minutes) {
        masukWaktuIndex = i + 1 // +1 untuk flag masuk waktu
        break
      }
    }
    
    // Jika tepat masuk waktu, override wnxt
    if (masukWaktuIndex > 0) wnxt = masukWaktuIndex - 1 // -1 untuk convert ke array index
    
    setNextPrayer(wnxt)
    
    // 1. PROSES 1: 10 minit sebelum - Kelipan untuk tarik perhatian
    const timeLeft = 10 // 10 minit sebelum
    if (minTimeToNext <= timeLeft && minTimeToNext > 0) {
      if (!preAzanBlink) {
        setPreAzanBlink(true)
        setIsBlinking(true)
        setHoldTransition(true) // Hold transition dan kekalkan page = 0
      }
    }
    
    // Reset pre-azan flag jika sudah lebih dari 10 minit (HANYA jika bukan dalam masukWaktu)
    if (minTimeToNext > timeLeft && !masukWaktu) {
      setPreAzanBlink(false)
      // JANGAN reset holdTransition di sini - ia akan di-reset dalam block 3 selepas 3 minit
    }

    // 2. PROSES 2: Masuk waktu tepat - Audio beep (sekali sahaja)
    if (!masukWaktu && masukWaktuIndex > 0) {
      const currentIndex = masukWaktuIndex - 1 // Convert ke array index
      const currentPrayerMinute = times[currentIndex]?.minutes
      
      // Elak double trigger - check jika bukan waktu solat yang sama
      if (lastPrayerMinuteRef.current !== currentPrayerMinute && !audioPlayedRef.current) {
        lastPrayerMinuteRef.current = currentPrayerMinute
        audioPlayedRef.current = true
        
        setCurrentPrayerIndex(currentIndex)
        setMasukWaktu(true)
        setPreAzanBlink(false) // Reset pre-azan flag
        setIsPrayerTime(true)
        setIsBlinking(true)
        // KEKALKAN holdTransition = true (JANGAN reset di sini!)
        
        // Pastikan audio tidak play dua kali - reset dan tunggu sikit sebelum play
        beepAudio.pause()
        beepAudio.currentTime = 0
        setTimeout(() => {
          beepAudio.play().catch(e => console.error('Audio play error:', e))
          beepAudio.onended = () => setIsBlinking(false)
        }, 100)
      }
    }
    
    // 3. PROSES 3: Reset selepas 3 minit dari masuk waktu solat
    if (masukWaktu && currentPrayerIndex !== null) {
      const prayerTime = times[currentPrayerIndex]?.minutes || 0
      const timeSincePrayer = currentMins - prayerTime
      
      if (timeSincePrayer < 3) {
        // Masih belum 3 minit - kekalkan tunjuk waktu semasa
        setNextPrayer(currentPrayerIndex)
      } else {
        // Sudah 3 minit - reset semua
        setMasukWaktu(false)
        setIsPrayerTime(false)
        setCurrentPrayerIndex(null)
        setHoldTransition(false) // Reset hold transition juga
        audioPlayedRef.current = false // Reset audio flag untuk waktu solat seterusnya
      }
    }
    
    // Reset audio flag jika masuk minit baru (elak stuck)
    if (masukWaktuIndex === 0 && audioPlayedRef.current) {
      const allPrayerMinutes = times.map(t => t.minutes)
      if (!allPrayerMinutes.includes(currentMins)) {
        audioPlayedRef.current = false
      }
    }

  }, [prayerData, currentTime, showImsak])

  // Update format apabila config berubah
  useEffect(() => {
    setUse24Hour(safeConfig.timeFormat)
    setShowImsak(safeConfig.imsakDisplay)
  }, [safeConfig.timeFormat, safeConfig.imsakDisplay])

  // Fungsi untuk tukar format jam - OPTIMIZED: useCallback
  const toggleHourFormat = useCallback(() => setUse24Hour(!use24Hour), [use24Hour])
  
  // Fungsi untuk toggle imsak - OPTIMIZED: useCallback
  const toggleImsak = useCallback(() => setShowImsak(!showImsak), [showImsak])

  // Format jam berdasarkan state - OPTIMIZED: useMemo
  const displayHours = useMemo(() => {
    return use24Hour ? currentTime.hours : (currentTime.hours === 0 ? 12 : (currentTime.hours > 12 ? currentTime.hours - 12 : currentTime.hours))
  }, [use24Hour, currentTime.hours])

  return {
    currentTime: { ...currentTime, displayHours: displayHours, use24Hour: use24Hour },
    currentDate,
    hijriDate,
    prayerTimes,
    nextPrayer,
    timeToNext,
    isPrayerTime,
    isBlinking,
    preAzanBlink,
    masukWaktu,
    currentPrayerIndex,
    showImsak,
    holdTransition, // State untuk hold transition
    // showDot removed - using CSS animation instead
    toggleHourFormat,
    toggleImsak
  }
}