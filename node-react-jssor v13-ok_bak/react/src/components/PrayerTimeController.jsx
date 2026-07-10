import { useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { TIME_EVENTS } from '../utils/timeEvents';

const ACTIVE_PRAYERS = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];

/**
 * Listen prayer-warning event: beep dan navigate ke PrayerSequencePage.
 * Listen syuruk-time: beep sahaja, tiada navigate.
 */
export default function PrayerTimeController({ setCurrentView, setPrayerName, setPrayerTimeStr }) {
  const { PRAYER_TIME_CONFIG } = useData();

  useEffect(() => {
    if (typeof setCurrentView !== 'function') return;

    const prayerWarningHandler = (e) => {
      const prayerName = e.detail?.prayerName;
      if (!prayerName || !ACTIVE_PRAYERS.includes(prayerName)) return;

      if (typeof setPrayerName === 'function') setPrayerName(prayerName);
      if (typeof setPrayerTimeStr === 'function') setPrayerTimeStr(e.detail?.prayerTimeStr ?? null);
      setCurrentView('prayer');
    };

    const syurukHandler = () => {
      const beepCount = PRAYER_TIME_CONFIG?.BEEP_COUNT ?? 5;
      if (beepCount > 0) {
        if (audioService.getIsPlaying()) audioService.stop();
        audioService.play({ volume: 1, playCount: beepCount }).catch(() => {});
      }
    };

    window.addEventListener(TIME_EVENTS.PRAYER_WARNING, prayerWarningHandler);
    window.addEventListener(TIME_EVENTS.SYURUK_TIME, syurukHandler);
    return () => {
      window.removeEventListener(TIME_EVENTS.PRAYER_WARNING, prayerWarningHandler);
      window.removeEventListener(TIME_EVENTS.SYURUK_TIME, syurukHandler);
    };
  }, [setCurrentView, setPrayerName, setPrayerTimeStr, PRAYER_TIME_CONFIG]);

  return null;
}
