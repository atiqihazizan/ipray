import { useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import audioService from '../services/audioService';
import { TIME_EVENTS } from '../utils/timeEvents';

const ACTIVE_PRAYERS = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];

/**
 * Listen prayer-time event: beep dan navigate ke halaman solat (azan → iqamah → solat → slide).
 * Listen syuruk-time: beep sahaja, tiada warning sebelum dan tiada navigate ke PrayerSequencePage.
 */
export default function PrayerTimeController({ setCurrentView }) {
  const { PRAYER_TIME_CONFIG } = useData();

  useEffect(() => {
    if (typeof setCurrentView !== 'function') return;

    const prayerHandler = (e) => {
      const prayerName = e.detail?.prayerName;
      if (!prayerName || !ACTIVE_PRAYERS.includes(prayerName)) return;

      const beepCount = PRAYER_TIME_CONFIG?.BEEP_COUNT ?? 5;
      if (beepCount > 0) {
        if (audioService.getIsPlaying()) audioService.stop();
        audioService.play({ volume: 1, playCount: beepCount }).catch(() => {});
      }

      setCurrentView('prayer');
    };

    const syurukHandler = () => {
      const beepCount = PRAYER_TIME_CONFIG?.BEEP_COUNT ?? 5;
      if (beepCount > 0) {
        if (audioService.getIsPlaying()) audioService.stop();
        audioService.play({ volume: 1, playCount: beepCount }).catch(() => {});
      }
    };

    window.addEventListener(TIME_EVENTS.PRAYER_TIME, prayerHandler);
    window.addEventListener(TIME_EVENTS.SYURUK_TIME, syurukHandler);
    return () => {
      window.removeEventListener(TIME_EVENTS.PRAYER_TIME, prayerHandler);
      window.removeEventListener(TIME_EVENTS.SYURUK_TIME, syurukHandler);
    };
  }, [setCurrentView, PRAYER_TIME_CONFIG]);

  return null;
}
