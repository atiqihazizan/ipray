import { useState, useEffect, useRef, useMemo } from 'react';
import { useIslamicTime } from './useIslamicTime';
import audioService from '../services/audioService';
import { useData } from '../contexts/DataContext';

/**
 * Hook untuk DisplayTime component
 * Menggabungkan islamicTimeUtils dengan logik blink dan audio
 */
export const useDisplayTime = ({ 
  format = '24h', 
  showSeconds = true, 
  showAmPm = true,
  isCurrentTime = true,
  prayerName = null,
  nextPrayerTime = null 
}) => {
  const { islamicTime, loading } = useIslamicTime();
  const { PRAYER_TIME_CONFIG } = useData(); // Get config from context
  const [blink, setBlink] = useState(true);
  const [isPrayerTime, setIsPrayerTime] = useState(false); // Untuk blinking (15 saat)
  const [isInPrayerMinute, setIsInPrayerMinute] = useState(false); // Untuk highlight merah (sepanjang minit)
  const [is30SecondsBeforePrayer, setIs30SecondsBeforePrayer] = useState(false);
  
  const prayerBlinkTimeoutRef = useRef(null);
  const lastCheckedPrayerRef = useRef(null);
  const lastChecked30SecRef = useRef(null);
  const audioPrayerTimePlayedRef = useRef(false);
  const audioWarningPlayedRef = useRef(false);
  const warningTimeoutRef = useRef(null);

  // Blinking hanya berlaku jika showSeconds=false DAN masa sekarang
  const shouldBlink = !showSeconds && isCurrentTime;

  // Get prayer time value jika prayerName diberikan
  const getPrayerTimeValue = () => {
    if (!islamicTime || !prayerName) return null;
    
    const prayerTimes = islamicTime.prayer.times;
    const prayerMap = {
      'Imsak': prayerTimes.Imsak,
      'Subuh': prayerTimes.Subuh,
      'Syuruk': prayerTimes.Syuruk,
      'Zohor': prayerTimes.Zohor,
      'Asar': prayerTimes.Asar,
      'Maghrib': prayerTimes.Maghrib,
      'Isyak': prayerTimes.Isyak
    };
    
    return prayerMap[prayerName] || null;
  };

  // Check waktu solat jika prayerName diberikan
  useEffect(() => {
    if (!prayerName || !islamicTime) {
      setIsPrayerTime(false);
      return;
    }

    const prayerTimeStr = getPrayerTimeValue();
    if (!prayerTimeStr) {
      setIsPrayerTime(false);
      lastCheckedPrayerRef.current = null;
      return;
    }

    // Parse waktu solat
    const [prayerHours, prayerMinutes] = prayerTimeStr.split(':').map(Number);
    const currentHours = islamicTime.time.hours;
    const currentMinutes = islamicTime.time.minutes;

    // Check jika jam dan minit match dengan waktu solat
    const isTimeMatch = currentHours === prayerHours && currentMinutes === prayerMinutes;
    
    // Key untuk elak trigger berulang untuk minit yang sama
    const currentMinuteKey = `${currentHours}:${currentMinutes}`;

    if (isTimeMatch) {
      if (lastCheckedPrayerRef.current !== currentMinuteKey) {
        setIsPrayerTime(true); // Untuk blinking (akan direset selepas BLINK_DURATION)
        setIsInPrayerMinute(true); // Untuk highlight merah (kekal sepanjang minit)
        lastCheckedPrayerRef.current = currentMinuteKey;
        setIs30SecondsBeforePrayer(false);
        lastChecked30SecRef.current = null;
        audioPrayerTimePlayedRef.current = false;
        audioWarningPlayedRef.current = false; // Reset warning ref bila masuk waktu solat

        // Set timeout untuk stop blink selepas duration yang ditetapkan
        if (prayerBlinkTimeoutRef.current) clearTimeout(prayerBlinkTimeoutRef.current);
        prayerBlinkTimeoutRef.current = setTimeout(() => {
          // Hanya stop blinking state - JANGAN reset audio refs
          // Refs akan direset bila minit berubah (else block)
          setIsPrayerTime(false);
        }, PRAYER_TIME_CONFIG.BLINK_DURATION);
      }
    } else {
      // Reset SEMUA refs dan state bila minit berubah (bukan waktu solat lagi)
      if (isInPrayerMinute || lastCheckedPrayerRef.current !== null) {
        setIsPrayerTime(false);
        setIsInPrayerMinute(false);
        lastCheckedPrayerRef.current = null;
        audioPrayerTimePlayedRef.current = false;
        
        if (prayerBlinkTimeoutRef.current) {
          clearTimeout(prayerBlinkTimeoutRef.current);
          prayerBlinkTimeoutRef.current = null;
        }
      }
    }
  }, [islamicTime, prayerName, isPrayerTime]);

  // Check X saat sebelum waktu solat (range-based check - lebih robust)
  // Visual warning (blinking & merah) bergantung pada WARNING_START_SECONDS
  // Audio warning bergantung pada WARNING_BEEP_COUNT
  useEffect(() => {
    if (!prayerName || !islamicTime || isPrayerTime) {
      setIs30SecondsBeforePrayer(false);
      return;
    }

    const prayerTimeStr = getPrayerTimeValue();
    if (!prayerTimeStr) {
      setIs30SecondsBeforePrayer(false);
      return;
    }

    const [prayerHours, prayerMinutes] = prayerTimeStr.split(':').map(Number);
    const currentTime = new Date();
    currentTime.setHours(islamicTime.time.hours, islamicTime.time.minutes, islamicTime.time.seconds, 0);
    
    const prayerDate = new Date();
    prayerDate.setHours(prayerHours, prayerMinutes, 0, 0);

    const diffMs = prayerDate.getTime() - currentTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    // Check dalam range 1-WARNING_START_SECONDS saat sebelum waktu solat (untuk blinking/merah)
    const WARNING_SECONDS = PRAYER_TIME_CONFIG.WARNING_START_SECONDS;
    const isInWarningRange = diffSeconds > 0 && diffSeconds <= WARNING_SECONDS;
    const isExactWarningSecBefore = diffSeconds === WARNING_SECONDS; // Untuk trigger audio

    if (isInWarningRange) {
      // Set TRUE untuk blinking/merah (akan kekal sehingga masuk waktu solat)
      if (!is30SecondsBeforePrayer) {
        setIs30SecondsBeforePrayer(true);
      }
      
      // Trigger audio hanya pada exact WARNING_START_SECONDS (jika WARNING_BEEP_COUNT > 0)
      if (isExactWarningSecBefore && PRAYER_TIME_CONFIG.WARNING_BEEP_COUNT > 0) {
        const currentSecondKey = `${islamicTime.time.hours}:${islamicTime.time.minutes}:${islamicTime.time.seconds}`;
        if (lastChecked30SecRef.current !== currentSecondKey) {
          lastChecked30SecRef.current = currentSecondKey;
        }
      }
    } else if (is30SecondsBeforePrayer) {
      // Reset bila keluar dari warning range
      setIs30SecondsBeforePrayer(false);
      lastChecked30SecRef.current = null;
      audioWarningPlayedRef.current = false;
    }
  }, [islamicTime, prayerName, isPrayerTime, is30SecondsBeforePrayer]);

  // Play audio untuk warning 30 saat sebelum
  useEffect(() => {
    // Jika WARNING_BEEP_COUNT = 0, disable warning
    if (PRAYER_TIME_CONFIG.WARNING_BEEP_COUNT === 0) {
      return;
    }

    if (is30SecondsBeforePrayer && !isPrayerTime) {
      // Play audio hanya sekali - check guna lastChecked30SecRef
      const currentSecondKey = lastChecked30SecRef.current;
      
      // Audio hanya play bila ada currentSecondKey (exact 30 saat) DAN belum play
      if (!audioWarningPlayedRef.current && currentSecondKey) {
        if (audioService.getIsPlaying()) {
          audioService.stop();
        }
        
        audioService.play({ volume: 1, playCount: PRAYER_TIME_CONFIG.WARNING_BEEP_COUNT }).catch((error) => {
          console.warn('Gagal play audio amaran waktu solat:', error);
        });
        
        audioWarningPlayedRef.current = true;
      }
    }
    // audioWarningPlayedRef akan direset bila:
    // 1. Exit warning range (diffSeconds > 30 atau < 0)
    // 2. Masuk waktu solat
  }, [is30SecondsBeforePrayer, isPrayerTime, prayerName]);

  // Play audio apabila masuk waktu solat
  useEffect(() => {
    if (isPrayerTime) {
      if (!audioPrayerTimePlayedRef.current) {
        if (audioService.getIsPlaying()) {
          audioService.stop();
        }
        
        audioWarningPlayedRef.current = false;
        audioService.play({ volume: 1, playCount: PRAYER_TIME_CONFIG.BEEP_COUNT }).catch((error) => {
          console.warn('Gagal play audio waktu solat:', error);
        });
        
        audioPrayerTimePlayedRef.current = true;
      }
    } else {
      audioPrayerTimePlayedRef.current = false;
      if (!is30SecondsBeforePrayer && audioService.getIsPlaying()) {
        audioService.stop();
      }
    }
  }, [isPrayerTime, is30SecondsBeforePrayer]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (prayerBlinkTimeoutRef.current) {
        clearTimeout(prayerBlinkTimeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (audioService.getIsPlaying()) {
        audioService.stop();
      }
    };
  }, []);

  // Blink didorong oleh tick useIslamicTime (tiada setInterval sendiri untuk performance)
  // Setiap kali islamicTime berubah (setiap 500ms), toggle blink jika perlu
  useEffect(() => {
    if (!shouldBlink && !isPrayerTime && !is30SecondsBeforePrayer) {
      setBlink(true);
      return;
    }

    // Toggle blink setiap kali islamicTime berubah (setiap 500ms dari useIslamicTime interval)
    setBlink((prev) => !prev);
  }, [islamicTime, shouldBlink, isPrayerTime, is30SecondsBeforePrayer]);

  // Memoize formatTime - hanya recalculate bila dependencies berubah
  const formattedTime = useMemo(() => {
    if (loading || !islamicTime) return '00:00';

    // Jika ada nextPrayerTime (type=3), guna waktu yang diberikan
    if (nextPrayerTime) {
      // Format based on 12h or 24h
      if (format === '12h') {
        const [hours, minutes] = nextPrayerTime.split(':').map(Number);
        const hours12 = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
        const formatted = `${hours12}:${minutes.toString().padStart(2, '0')}`;
        return showAmPm ? `${formatted} ${hours >= 12 ? 'PM' : 'AM'}` : formatted;
      }
      return nextPrayerTime;
    }

    // Jika bukan current time dan ada prayerName, guna waktu solat (static - tidak perlu update setiap saat)
    if (!isCurrentTime && prayerName) {
      const prayerTimeStr = getPrayerTimeValue();
      if (!prayerTimeStr) return '0:00';
      
      // Format based on 12h or 24h
      if (format === '12h') {
        const [hours, minutes] = prayerTimeStr.split(':').map(Number);
        const hours12 = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
        const formatted = `${hours12}:${minutes.toString().padStart(2, '0')}`;
        return showAmPm ? `${formatted} ${hours >= 12 ? 'PM' : 'AM'}` : formatted;
      }
      return prayerTimeStr;
    }

    // Guna current time (perlu update setiap saat untuk type=1)
    const { hours, minutes, seconds } = islamicTime.time;
    
    let hoursDisplay = hours;
    let ampmStr = '';
    
    if (format === '12h') {
      hoursDisplay = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
      if (showAmPm) {
        ampmStr = ` ${hours >= 12 ? 'PM' : 'AM'}`;
      }
    }
    
    const hoursStr = hoursDisplay.toString();
    const minutesStr = minutes.toString().padStart(2, '0');
    const secondsStr = seconds.toString().padStart(2, '0');
    
    if (showSeconds) {
      return `${hoursStr}:${minutesStr}:${secondsStr}${ampmStr}`;
    }
    return `${hoursStr}:${minutesStr}${ampmStr}`;
  }, [
    loading,
    islamicTime?.time?.hours,
    islamicTime?.time?.minutes,
    islamicTime?.time?.seconds,
    format,
    showSeconds,
    showAmPm,
    isCurrentTime,
    prayerName,
    nextPrayerTime,
    islamicTime?.prayer?.times // Untuk prayer time (static)
  ]);

  // Memoize prayerTime value (static - tidak perlu update setiap saat)
  const prayerTimeValue = useMemo(() => {
    return !isCurrentTime && prayerName ? getPrayerTimeValue() : null;
  }, [isCurrentTime, prayerName, islamicTime?.prayer?.times]);

  return {
    time: formattedTime,
    currentTime: islamicTime?.time || null,
    prayerTime: prayerTimeValue,
    blink: shouldBlink || isPrayerTime || is30SecondsBeforePrayer ? blink : true,
    shouldBlink: shouldBlink || isPrayerTime || is30SecondsBeforePrayer,
    isPrayerTime,
    isInPrayerMinute, // Untuk highlight merah yang kekal sepanjang minit
    is30SecondsBeforePrayer,
    loading
  };
};

export default useDisplayTime;
