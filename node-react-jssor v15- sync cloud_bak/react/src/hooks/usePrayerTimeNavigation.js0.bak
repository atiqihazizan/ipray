import { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { TIME_EVENTS } from '../utils/timeEvents';

const ACTIVE_PRAYERS = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];

/**
 * Hook untuk navigate bila masuk waktu solat.
 * Guna window listener 'prayer-time' (dipancar dari driver masa — satu interval sahaja).
 * Tiada setInterval di sini.
 * @returns {string} currentView - 'slide' | 'azan' | 'iqamah' | 'solat'
 */
export function usePrayerTimeNavigation() {
  const [currentView, setCurrentView] = useState('slide');
  const { PRAYER_TIME_CONFIG } = useData();
  const timerAzanRef = useRef(null);
  const timerIqamahRef = useRef(null);
  const timerSolatRef = useRef(null);

  useEffect(() => {
    const azanMin = PRAYER_TIME_CONFIG?.AZAN_DURATION_MIN ?? 0.5;
    const iqamahMin = PRAYER_TIME_CONFIG?.IQAMAH_DURATION_MIN ?? 2;
    const solatMin = PRAYER_TIME_CONFIG?.SOLAT_DURATION_MIN ?? 3;
    const azanMs = azanMin * 60 * 1000;
    const iqamahMs = iqamahMin * 60 * 1000;
    const solatMs = solatMin * 60 * 1000;

    const handler = () => {
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
    };

    window.addEventListener(TIME_EVENTS.PRAYER_TIME, handler);
    return () => {
      window.removeEventListener(TIME_EVENTS.PRAYER_TIME, handler);
      if (timerAzanRef.current) clearTimeout(timerAzanRef.current);
      if (timerIqamahRef.current) clearTimeout(timerIqamahRef.current);
      if (timerSolatRef.current) clearTimeout(timerSolatRef.current);
    };
  }, [PRAYER_TIME_CONFIG]);

  return currentView;
}
