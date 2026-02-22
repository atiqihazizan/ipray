import { useState, useEffect, useRef } from 'react';
import { getCurrentIslamicTime } from '../utils/islamicTimeUtils';
import { useTakwimData } from './useTakwimData';
import { useData } from '../contexts/DataContext';

const ACTIVE_PRAYERS = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];

/**
 * Hook untuk navigate bila masuk waktu solat.
 * Flow: masuk waktu → page azan (AZAN_DURATION_MIN) → page iqamah (IQAMAH_DURATION_MIN) → page solat (SOLAT_DURATION_MIN) → kembali slide.
 * Semua duration dalam minit, dari config.txt.
 * @returns {string} currentView - 'slide' | 'azan' | 'iqamah' | 'solat'
 */
export function usePrayerTimeNavigation() {
  const [currentView, setCurrentView] = useState('slide');
  const { takwimParsed } = useTakwimData();
  const { PRAYER_TIME_CONFIG, timeService } = useData();
  const prayerTriggeredRef = useRef({});
  const timerAzanRef = useRef(null);
  const timerIqamahRef = useRef(null);
  const timerSolatRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!takwimParsed?.wdata || !PRAYER_TIME_CONFIG) return;

    const azanMin = PRAYER_TIME_CONFIG.AZAN_DURATION_MIN ?? 0.5;
    const iqamahMin = PRAYER_TIME_CONFIG.IQAMAH_DURATION_MIN ?? 2;
    const solatMin = PRAYER_TIME_CONFIG.SOLAT_DURATION_MIN ?? 3;
    const azanMs = azanMin * 60 * 1000;
    const iqamahMs = iqamahMin * 60 * 1000;
    const solatMs = solatMin * 60 * 1000;

    const check = () => {
      try {
        const islamicTime = getCurrentIslamicTime({
          hdata: takwimParsed.hdata,
          wdata: takwimParsed.wdata,
          timeService
        });
        if (!islamicTime?.prayer?.times) return;

        const { time: currentTime, prayer: { times: prayerTimes } } = islamicTime;
        const currentSeconds = currentTime.seconds;

        if (currentSeconds !== 0) return;

        for (const name of ACTIVE_PRAYERS) {
          const timeStr = prayerTimes[name];
          if (!timeStr) continue;

          const [prayerHours, prayerMinutes] = timeStr.split(':').map(Number);
          const isPrayerTime =
            currentTime.hours === prayerHours && currentTime.minutes === prayerMinutes;

          if (isPrayerTime) {
            const todayKey = `${name}-${new Date().toDateString()}`;
            if (prayerTriggeredRef.current[todayKey]) return;

            prayerTriggeredRef.current[todayKey] = true;

            if (timerAzanRef.current) clearTimeout(timerAzanRef.current);
            if (timerIqamahRef.current) clearTimeout(timerIqamahRef.current);
            if (timerSolatRef.current) clearTimeout(timerSolatRef.current);

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
            return;
          } else {
            const todayKey = `${name}-${new Date().toDateString()}`;
            const currentTimeMinutes = currentTime.hours * 60 + currentTime.minutes;
            const ptMinutes = prayerHours * 60 + prayerMinutes;
            if (currentTimeMinutes > ptMinutes + 1) {
              delete prayerTriggeredRef.current[todayKey];
            }
          }
        }
      } catch (e) {
        // ignore
      }
    };

    check();
    intervalRef.current = setInterval(check, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerAzanRef.current) clearTimeout(timerAzanRef.current);
      if (timerIqamahRef.current) clearTimeout(timerIqamahRef.current);
      if (timerSolatRef.current) clearTimeout(timerSolatRef.current);
    };
  }, [takwimParsed, PRAYER_TIME_CONFIG, timeService]);

  return currentView;
}
