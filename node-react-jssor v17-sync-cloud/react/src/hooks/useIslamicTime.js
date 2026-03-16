import { useState, useEffect } from 'react';
import { TIME_EVENTS } from '../utils/timeEvents';
import { useTakwimData } from './useTakwimData';

/**
 * Bina islamicTime dari window event time-update (driver masa dalam useTimeDriver; tiada provider).
 * loading/zone dari useTakwimData.
 */
function useIslamicTimeFromEvents() {
  const { takwimParsed, loading: takwimLoading } = useTakwimData();
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    const handler = (e) => setPayload(e.detail || null);
    window.addEventListener(TIME_EVENTS.TIME_UPDATE, handler);
    return () => window.removeEventListener(TIME_EVENTS.TIME_UPDATE, handler);
  }, []);

  const { time, snapshot } = payload || {};
  const islamicTime =
    time != null && snapshot
      ? {
          time,
          gregorian: snapshot.gregorian,
          hijri: snapshot.hijri,
          prayer: snapshot.prayer
        }
      : null;

  return {
    islamicTime,
    loading: takwimLoading ?? true,
    error: null,
    refresh: () => {},
    zone: takwimParsed?.zone || ''
  };
}

/**
 * Custom Hook untuk menguruskan waktu Islam (Hijri, Masehi, Waktu Solat).
 * Data masa dari window event time-update (satu interval dalam useTimeDriver); tiada TimeProvider.
 *
 * @param {Object} externalTakwimParsed - Tidak digunakan; disimpan untuk API
 * @returns {Object} { islamicTime, loading, error, refresh, zone }
 */
export const useIslamicTime = (externalTakwimParsed = null) => {
  return useIslamicTimeFromEvents(externalTakwimParsed);
};

/**
 * Hook mudah untuk dapatkan waktu semasa sahaja
 */
export const useCurrentTime = () => {
  const { islamicTime, loading } = useIslamicTimeFromEvents();
  return {
    time: islamicTime?.time || null,
    loading
  };
};

/**
 * Hook untuk dapatkan tarikh Hijri semasa (initial dari event; update lepas Maghrib via hijri-date-changed di DisplayDate)
 */
export const useHijriDate = () => {
  const { islamicTime, loading } = useIslamicTimeFromEvents();
  return {
    hijri: islamicTime?.hijri || null,
    loading
  };
};

/**
 * Hook untuk dapatkan tarikh Masehi semasa
 */
export const useGregorianDate = () => {
  const { islamicTime, loading } = useIslamicTimeFromEvents();
  return {
    gregorian: islamicTime?.gregorian || null,
    loading
  };
};

/**
 * Hook untuk dapatkan waktu solat
 */
export const usePrayerTimes = (externalTakwimParsed = null) => {
  const { islamicTime, loading } = useIslamicTimeFromEvents(externalTakwimParsed);
  const prayer = islamicTime?.prayer || null;

  const nextPrayerData =
    prayer?.next && prayer?.nextTime
      ? { next: prayer.next, nextTime: prayer.nextTime }
      : null;
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
 */
export const useIslamicTimeWithCallback = (onMinuteChange) => {
  const { islamicTime, loading, error, refresh, zone } = useIslamicTimeFromEvents();
  const [prevMinute, setPrevMinute] = useState(null);

  useEffect(() => {
    if (islamicTime?.time) {
      const currentMinute = islamicTime.time.minutes;
      if (prevMinute !== null && prevMinute !== currentMinute && typeof onMinuteChange === 'function') {
        onMinuteChange({
          time: islamicTime.time,
          hijri: islamicTime.hijri,
          gregorian: islamicTime.gregorian,
          prayer: islamicTime.prayer
        });
      }
      setPrevMinute(currentMinute);
    }
  }, [islamicTime, prevMinute, onMinuteChange]);

  return { islamicTime, loading, error, refresh, zone };
};

export default useIslamicTime;
