import { useEffect } from 'react';
import { TIME_EVENTS } from '../utils/timeEvents';

const ACTIVE_PRAYERS = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];

/**
 * Listen prayer-warning event: navigate ke PrayerSequencePage.
 */
export default function PrayerTimeController({ setCurrentView, setPrayerName, setPrayerTimeStr }) {
  useEffect(() => {
    if (typeof setCurrentView !== 'function') return;

    const prayerWarningHandler = (e) => {
      const prayerName = e.detail?.prayerName;
      if (!prayerName || !ACTIVE_PRAYERS.includes(prayerName)) return;

      if (typeof setPrayerName === 'function') setPrayerName(prayerName);
      if (typeof setPrayerTimeStr === 'function') setPrayerTimeStr(e.detail?.prayerTimeStr ?? null);
      setCurrentView('prayer');
    };

    window.addEventListener(TIME_EVENTS.PRAYER_WARNING, prayerWarningHandler);
    return () => {
      window.removeEventListener(TIME_EVENTS.PRAYER_WARNING, prayerWarningHandler);
    };
  }, [setCurrentView, setPrayerName, setPrayerTimeStr]);

  return null;
}
