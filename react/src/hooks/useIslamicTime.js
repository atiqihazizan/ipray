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

export const useIslamicTime = () => {
  return useIslamicTimeFromEvents();
};

/**
 * Hook untuk dapatkan waktu solat
 */
export const usePrayerTimes = () => {
  const { islamicTime, loading } = useIslamicTimeFromEvents();
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

export default useIslamicTime;
