import { useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import audioService from '../services/audioService';
import { TIME_EVENTS } from '../utils/timeEvents';

const ACTIVE_PRAYERS = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];

/**
 * Listen prayer-time event; trigger beep dan navigate (azan → iqamah → solat → slide).
 * AppContent tidak subscribe time context — hanya terima currentView dari callback ini.
 */
export default function PrayerTimeController({ setCurrentView }) {
  const { PRAYER_TIME_CONFIG } = useData();
  const timerAzanRef = useRef(null);
  const timerIqamahRef = useRef(null);
  const timerSolatRef = useRef(null);

  useEffect(() => {
    if (typeof setCurrentView !== 'function') return;

    const azanMin = PRAYER_TIME_CONFIG?.AZAN_DURATION_MIN ?? 0.5;
    const iqamahMin = PRAYER_TIME_CONFIG?.IQAMAH_DURATION_MIN ?? 2;
    const solatMin = PRAYER_TIME_CONFIG?.SOLAT_DURATION_MIN ?? 3;
    const azanMs = azanMin * 60 * 1000;
    const iqamahMs = iqamahMin * 60 * 1000;
    const solatMs = solatMin * 60 * 1000;

    const handler = (e) => {
      const prayerName = e.detail?.prayerName;
      if (!prayerName || !ACTIVE_PRAYERS.includes(prayerName)) return;

      if (timerAzanRef.current) clearTimeout(timerAzanRef.current);
      if (timerIqamahRef.current) clearTimeout(timerIqamahRef.current);
      if (timerSolatRef.current) clearTimeout(timerSolatRef.current);

      const beepCount = PRAYER_TIME_CONFIG?.BEEP_COUNT ?? 5;
      if (beepCount > 0) {
        if (audioService.getIsPlaying()) audioService.stop();
        audioService.play({ volume: 1, playCount: beepCount }).catch(() => {});
      }

      setCurrentView('azan');

      timerAzanRef.current = setTimeout(() => {
        timerAzanRef.current = null;
        setCurrentView('iqamah');
        timerIqamahRef.current = setTimeout(() => {
          timerIqamahRef.current = null;
          setCurrentView('solat');
          timerSolatRef.current = setTimeout(() => {
            timerSolatRef.current = null;
            setCurrentView('slide');
          }, solatMs);
        }, iqamahMs);
      }, azanMs);
    };

    window.addEventListener(TIME_EVENTS.PRAYER_TIME, handler);
    return () => {
      window.removeEventListener(TIME_EVENTS.PRAYER_TIME, handler);
      if (timerAzanRef.current) clearTimeout(timerAzanRef.current);
      if (timerIqamahRef.current) clearTimeout(timerIqamahRef.current);
      if (timerSolatRef.current) clearTimeout(timerSolatRef.current);
    };
  }, [setCurrentView, PRAYER_TIME_CONFIG]);

  return null;
}
