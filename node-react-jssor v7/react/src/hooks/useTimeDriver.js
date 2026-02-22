import { useState, useEffect, useRef } from 'react';
import { getCurrentIslamicTime } from '../utils/islamicTimeUtils';
import { useTakwimData } from './useTakwimData';
import { useData } from '../contexts/DataContext';
import {
  dispatchTimeUpdate,
  dispatchHijriDateChanged,
  dispatchPrayerWarning,
  dispatchPrayerTime,
  dispatchSyurukTime,
  dispatchDateChanged
} from '../utils/timeEvents';

const ACTIVE_PRAYERS = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];

/**
 * Hook untuk driver masa — satu interval sahaja, fokus pada time.
 * Setiap tick: update time, dispatch time-update (flag/data pada window event), dan dispatch event lain (hijri, prayer, midnight).
 * Panggil hook ini di SATU tempat sahaja (e.g. komponen TimeDriver) supaya hanya satu interval wujud.
 * @returns {Object} { time, loading, snapshot, zone }
 */
export function useTimeDriver() {
  const { takwimParsed, loading: takwimLoading } = useTakwimData();
  const { timeService, PRAYER_TIME_CONFIG } = useData();
  const warningSeconds = PRAYER_TIME_CONFIG?.WARNING_START_SECONDS ?? 30;
  const [time, setTime] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const snapshotSetRef = useRef(false);
  const lastHijriKeyRef = useRef('');
  const lastDateStrRef = useRef('');
  const prayerTriggeredRef = useRef({});
  const prayerWarningTriggeredRef = useRef({});
  const syurukTriggeredRef = useRef({});

  useEffect(() => {
    if (!takwimParsed?.wdata) return;

    const update = () => {
      try {
        const islamicTime = getCurrentIslamicTime({
          hdata: takwimParsed.hdata,
          wdata: takwimParsed.wdata,
          timeService
        });
        if (!islamicTime) return;

        setTime(islamicTime.time);

        const snapshotData = {
          gregorian: islamicTime.gregorian,
          hijri: islamicTime.hijri,
          prayer: islamicTime.prayer
        };
        if (!snapshotSetRef.current) {
          snapshotSetRef.current = true;
          setSnapshot(snapshotData);
        }

        dispatchTimeUpdate({ time: islamicTime.time, snapshot: snapshotData });

        const { time: t, hijri, gregorian, prayer } = islamicTime;
        const currentSeconds = t.seconds;
        const currentTotalSeconds = t.hours * 3600 + t.minutes * 60 + t.seconds;

        const hijriKey = `${hijri?.day}-${hijri?.month}-${hijri?.year}`;
        if (hijriKey && lastHijriKeyRef.current && lastHijriKeyRef.current !== hijriKey) {
          dispatchHijriDateChanged(hijri);
        }
        lastHijriKeyRef.current = hijriKey;

        const todayStr = gregorian ? `${gregorian.year}-${String(gregorian.month).padStart(2, '0')}-${String(gregorian.day).padStart(2, '0')}` : '';
        if (todayStr && lastDateStrRef.current && lastDateStrRef.current !== todayStr) {
          dispatchDateChanged(todayStr);
        }
        lastDateStrRef.current = todayStr;

        const prayerTimes = prayer?.times;
        if (prayerTimes) {
          for (const name of ACTIVE_PRAYERS) {
            const timeStr = prayerTimes[name];
            if (!timeStr) continue;
            const [ph, pm] = timeStr.split(':').map(Number);
            const prayerTotalSeconds = ph * 3600 + pm * 60;

            if (currentTotalSeconds === prayerTotalSeconds - warningSeconds) {
              const warnKey = `${name}-${todayStr}-warn`;
              if (!prayerWarningTriggeredRef.current[warnKey]) {
                prayerWarningTriggeredRef.current[warnKey] = true;
                dispatchPrayerWarning(name);
              }
            } else if (currentTotalSeconds > prayerTotalSeconds - warningSeconds + 60) {
              delete prayerWarningTriggeredRef.current[`${name}-${todayStr}-warn`];
            }

            if (currentSeconds === 0 && t.hours === ph && t.minutes === pm) {
              const todayKey = `${name}-${new Date().toDateString()}`;
              if (!prayerTriggeredRef.current[todayKey]) {
                prayerTriggeredRef.current[todayKey] = true;
                dispatchPrayerTime(name);
              }
            } else {
              const currentMinutes = t.hours * 60 + t.minutes;
              const ptMinutes = ph * 60 + pm;
              if (currentMinutes > ptMinutes + 1) {
                delete prayerTriggeredRef.current[`${name}-${new Date().toDateString()}`];
              }
            }
          }

          const syurukStr = prayerTimes.Syuruk;
          if (syurukStr) {
            const [sh, sm] = syurukStr.split(':').map(Number);
            if (currentSeconds === 0 && t.hours === sh && t.minutes === sm) {
              const syurukKey = `Syuruk-${new Date().toDateString()}`;
              if (!syurukTriggeredRef.current[syurukKey]) {
                syurukTriggeredRef.current[syurukKey] = true;
                dispatchSyurukTime();
              }
            } else {
              const currentMinutes = t.hours * 60 + t.minutes;
              const syurukMinutes = sh * 60 + sm;
              if (currentMinutes > syurukMinutes + 1) delete syurukTriggeredRef.current[`Syuruk-${new Date().toDateString()}`];
            }
          }
        }
      } catch (err) {
        console.error('[useTimeDriver]', err);
      }
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [takwimParsed, timeService, warningSeconds]);

  return {
    time,
    loading: takwimLoading,
    snapshot,
    zone: takwimParsed?.zone || ''
  };
}
