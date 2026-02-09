import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCurrentIslamicTime } from '../utils/islamicTimeUtils';
import { useTakwimData } from './useTakwimData';

/**
 * Custom Hook untuk menguruskan waktu Islam (Hijri, Masehi, Waktu Solat)
 * Update setiap 0.5 saat
 * 
 * @param {Object} externalTakwimParsed - Optional: Parsed takwim data {zone, hdata, wdata}
 * @returns {Object} { islamicTime, loading, error }
 */
export const useIslamicTime = (externalTakwimParsed = null) => {
  const [islamicTime, setIslamicTime] = useState(null);
  const [lastMinute, setLastMinute] = useState(null);
  
  // Guna useTakwimData jika takwimDataParsed tidak diberikan
  const { takwimParsed: internalTakwimParsed, loading: takwimLoading } = useTakwimData();
  
  // Guna external jika diberikan, jika tidak guna internal
  const takwimDataParsed = externalTakwimParsed || internalTakwimParsed;
  
  // Loading bergantung kepada data takwim tersedia atau tidak
  const loading = externalTakwimParsed ? !externalTakwimParsed : takwimLoading;
  const error = null;

  /**
   * Update waktu semasa
   */
  const updateTime = useCallback(() => {
    if (!takwimDataParsed) return;
    
    try {
      const currentTime = getCurrentIslamicTime({
        hdata: takwimDataParsed.hdata,
        wdata: takwimDataParsed.wdata
      });
      
      setIslamicTime(currentTime);
      
      // Simpan minit semasa untuk perbandingan
      const currentMinute = currentTime.time.minutes;
      if (lastMinute !== currentMinute) {
        setLastMinute(currentMinute);
      }
    } catch (err) {
      console.error('Error updating time:', err);
    }
  }, [takwimDataParsed, lastMinute]);

  /**
   * Refresh - placeholder (data refresh handled at context level)
   */
  const refresh = useCallback(() => {
    console.log('Refresh takwim data from context');
  }, []);

  /**
   * Setup interval untuk update setiap 0.5 saat
   */
  useEffect(() => {
    if (!takwimDataParsed) return;

    // Update immediately
    updateTime();

    // Setup interval - 1000ms = 1 saat
    const intervalId = setInterval(() => {
      updateTime();
    }, 1000);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [takwimDataParsed, updateTime]);

  return {
    islamicTime,
    loading,
    error,
    refresh,
    zone: takwimDataParsed?.zone || ''
  };
};

/**
 * Hook mudah untuk dapatkan waktu semasa sahaja
 * Update setiap 0.5 saat
 * 
 * @returns {Object} { time, loading }
 */
export const useCurrentTime = () => {
  const { islamicTime, loading } = useIslamicTime();
  
  return {
    time: islamicTime?.time || null,
    loading
  };
};

/**
 * Hook untuk dapatkan tarikh Hijri semasa
 * Update setiap 0.5 saat (akan berubah pada waktu Maghrib)
 * 
 * @returns {Object} { hijri, loading }
 */
export const useHijriDate = () => {
  const { islamicTime, loading } = useIslamicTime();
  
  return {
    hijri: islamicTime?.hijri || null,
    loading
  };
};

/**
 * Hook untuk dapatkan tarikh Masehi semasa
 * Update setiap 0.5 saat
 * 
 * @returns {Object} { gregorian, loading }
 */
export const useGregorianDate = () => {
  const { islamicTime, loading } = useIslamicTime();
  
  return {
    gregorian: islamicTime?.gregorian || null,
    loading
  };
};

/**
 * Hook untuk dapatkan waktu solat
 * Update setiap 0.5 saat
 *
 * @param {Object} externalTakwimParsed - Optional: Parsed takwim data {zone, hdata, wdata}
 * @returns {Object} { prayer, loading, nextPrayerData, nextPrayerName }
 */
export const usePrayerTimes = (externalTakwimParsed = null) => {
  const { islamicTime, loading } = useIslamicTime(externalTakwimParsed);
  const prayer = islamicTime?.prayer || null;

  const nextPrayerData = useMemo(() => {
    return prayer?.next && prayer?.nextTime
      ? { next: prayer.next, nextTime: prayer.nextTime }
      : null;
  }, [prayer?.next, prayer?.nextTime]);

  const nextPrayerName = prayer?.next || null;

  return {
    prayer,
    loading,
    nextPrayerData,
    nextPrayerName
  };
};

/**
 * Hook dengan callback apabila minit berubah
 * Berguna untuk trigger animasi atau sound
 * 
 * @param {Function} onMinuteChange - Callback yang dipanggil apabila minit berubah
 * @returns {Object} { islamicTime, loading }
 */
export const useIslamicTimeWithCallback = (onMinuteChange) => {
  const { islamicTime, loading, error, refresh, zone } = useIslamicTime();
  const [prevMinute, setPrevMinute] = useState(null);

  useEffect(() => {
    if (islamicTime && islamicTime.time) {
      const currentMinute = islamicTime.time.minutes;
      
      if (prevMinute !== null && prevMinute !== currentMinute) {
        // Minit berubah, panggil callback
        if (typeof onMinuteChange === 'function') {
          onMinuteChange({
            time: islamicTime.time,
            hijri: islamicTime.hijri,
            gregorian: islamicTime.gregorian,
            prayer: islamicTime.prayer
          });
        }
      }
      
      setPrevMinute(currentMinute);
    }
  }, [islamicTime, prevMinute, onMinuteChange]);

  return {
    islamicTime,
    loading,
    error,
    refresh,
    zone
  };
};

export default useIslamicTime;
