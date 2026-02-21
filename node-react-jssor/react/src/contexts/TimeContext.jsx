import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getCurrentIslamicTime } from '../utils/islamicTimeUtils';
import { useTakwimData } from '../hooks/useTakwimData';
import { useTimeSync } from './TimeSyncContext';
import {
  dispatchHijriDateChanged,
  dispatchPrayerWarning,
  dispatchPrayerTime,
  dispatchDateChanged
} from '../utils/timeEvents';

const ACTIVE_PRAYERS = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];
const WARNING_SECONDS_BEFORE = 30;

export const TimeContext = createContext(null);
export const SnapshotContext = createContext(null);

export const useTime = () => {
  const ctx = useContext(TimeContext);
  if (!ctx) throw new Error('useTime must be used within TimeProvider');
  return ctx;
};

export const useTimeSnapshot = () => {
  const ctx = useContext(SnapshotContext);
  if (!ctx) throw new Error('useTimeSnapshot must be used within TimeProvider');
  return ctx;
};

/**
 * Satu interval untuk masa sahaja. Dispatch event untuk tarikh Hijri, warning 30s, waktu solat, dan date-changed (midnight).
 * Context hanya pegang time (jam) supaya hanya paparan jam re-render setiap saat.
 */
export function TimeProvider({ children }) {
  const { takwimParsed, loading: takwimLoading } = useTakwimData();
  const { timeService } = useTimeSync();
  const [time, setTime] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const snapshotSetRef = useRef(false);
  const lastHijriKeyRef = useRef('');
  const lastDateStrRef = useRef('');
  const prayerTriggeredRef = useRef({});
  const prayerWarningTriggeredRef = useRef({});

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

        if (!snapshotSetRef.current) {
          snapshotSetRef.current = true;
          setSnapshot({
            gregorian: islamicTime.gregorian,
            hijri: islamicTime.hijri,
            prayer: islamicTime.prayer
          });
        }

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

            if (currentTotalSeconds === prayerTotalSeconds - WARNING_SECONDS_BEFORE) {
              const warnKey = `${name}-${todayStr}-warn`;
              if (!prayerWarningTriggeredRef.current[warnKey]) {
                prayerWarningTriggeredRef.current[warnKey] = true;
                dispatchPrayerWarning(name);
              }
            } else if (currentTotalSeconds > prayerTotalSeconds - WARNING_SECONDS_BEFORE + 60) {
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
        }
      } catch (err) {
        console.error('[TimeProvider]', err);
      }
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [takwimParsed, timeService]);

  const timeValue = {
    time,
    loading: takwimLoading,
    zone: takwimParsed?.zone || ''
  };
  const snapshotValue = { snapshot };

  return (
    <TimeContext.Provider value={timeValue}>
      <SnapshotContext.Provider value={snapshotValue}>
        {children}
      </SnapshotContext.Provider>
    </TimeContext.Provider>
  );
}
