import { useContext, useState, useEffect } from 'react';
import { TimeContext, SnapshotContext } from '../contexts/TimeContext';

/**
 * Bina objek islamicTime dari TimeContext + SnapshotContext (satu interval dalam TimeProvider).
 * @param {Object} externalTakwimParsed - tidak digunakan bila dalam TimeProvider; disimpan untuk API
 */
function useIslamicTimeFromContext(externalTakwimParsed = null) {
  const timeContext = useContext(TimeContext);
  const snapshotContext = useContext(SnapshotContext);
  const { time, loading, zone } = timeContext || {};
  const { snapshot } = snapshotContext || {};

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
    loading: loading ?? true,
    error: null,
    refresh: () => {},
    zone: zone || ''
  };
}

/**
 * Custom Hook untuk menguruskan waktu Islam (Hijri, Masehi, Waktu Solat).
 * Guna TimeContext + SnapshotContext — satu interval dalam TimeProvider, hanya masa update setiap saat.
 *
 * @param {Object} externalTakwimParsed - Optional (legacy API)
 * @returns {Object} { islamicTime, loading, error, refresh, zone }
 */
export const useIslamicTime = (externalTakwimParsed = null) => {
  return useIslamicTimeFromContext(externalTakwimParsed);
};

/**
 * Hook mudah untuk dapatkan waktu semasa sahaja
 */
export const useCurrentTime = () => {
  const { islamicTime, loading } = useIslamicTimeFromContext();
  return {
    time: islamicTime?.time || null,
    loading
  };
};

/**
 * Hook untuk dapatkan tarikh Hijri semasa (initial dari snapshot; update lepas Maghrib via event di DisplayDate)
 */
export const useHijriDate = () => {
  const { islamicTime, loading } = useIslamicTimeFromContext();
  return {
    hijri: islamicTime?.hijri || null,
    loading
  };
};

/**
 * Hook untuk dapatkan tarikh Masehi semasa
 */
export const useGregorianDate = () => {
  const { islamicTime, loading } = useIslamicTimeFromContext();
  return {
    gregorian: islamicTime?.gregorian || null,
    loading
  };
};

/**
 * Hook untuk dapatkan waktu solat
 */
export const usePrayerTimes = (externalTakwimParsed = null) => {
  const { islamicTime, loading } = useIslamicTimeFromContext(externalTakwimParsed);
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
  const { islamicTime, loading, error, refresh, zone } = useIslamicTimeFromContext();
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
