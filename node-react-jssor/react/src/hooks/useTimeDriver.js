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
export const LS_PRAYER_TIMES_KEY = 'ipray-prayer-times';
export const LS_CURRENT_TIME_KEY = 'ipray-current-time';

// ─── TEST CONFIG — tukar ke true untuk test. Pastikan false semula sebelum production. ───
const TEST_PRAYER = false; // test waktu solat (semua 5 waktu) — trigger pada masa sekarang + 1 minit
const TEST_SYURUK = false; // test waktu syuruk — trigger pada masa sekarang + 1 minit
// ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * Hook untuk driver masa — satu interval sahaja, fokus pada time.
 * Setiap tick: update time, dispatch time-update (flag/data pada window event), dan dispatch event lain (hijri, prayer, midnight).
 * Panggil hook ini di SATU tempat sahaja (e.g. komponen TimeDriver) supaya hanya satu interval wujud.
 * @returns {Object} { time, loading, snapshot, zone }
 */
export function useTimeDriver() {
  const { takwimParsed, loading: takwimLoading } = useTakwimData();
  const { timeService, PRAYER_TIME_CONFIG } = useData();
  const [time, setTime] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const warningSeconds = PRAYER_TIME_CONFIG?.WARNING_START_SECONDS ?? 15;
  const snapshotSetRef = useRef(false);
  const lastHijriKeyRef = useRef('');
  const lastDateStrRef = useRef('');
  const lastSavedTimesRef = useRef('');
  const lastSavedTimeMinRef = useRef(-1);
  const prayerTriggeredRef = useRef({});
  const prayerWarningTriggeredRef = useRef({});
  const syurukTriggeredRef = useRef({});

  useEffect(() => {
    if (!takwimParsed?.wdata) return;

    const _testTimeStr = (() => { const n = new Date(); return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()+1).padStart(2,'0')}`; })();
    const testPrayerStr = TEST_PRAYER ? _testTimeStr : null;
    const testSyurukStr = TEST_SYURUK ? _testTimeStr : null;

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

        if (prayer?.times) {
          const timesKey = JSON.stringify(prayer.times);
          if (timesKey !== lastSavedTimesRef.current) {
            lastSavedTimesRef.current = timesKey;
            try { localStorage.setItem(LS_PRAYER_TIMES_KEY, timesKey); } catch (_) {}
          }
        }

        const totalMin = t.hours * 60 + t.minutes;
        if (totalMin !== lastSavedTimeMinRef.current) {
          lastSavedTimeMinRef.current = totalMin;
          try { localStorage.setItem(LS_CURRENT_TIME_KEY, JSON.stringify(t)); } catch (_) {}
        }

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
            const timeStr = testPrayerStr || prayerTimes[name];
            if (!timeStr) continue;
            const [ph, pm] = timeStr.split(':').map(Number);
            const prayerTotalSeconds = ph * 3600 + pm * 60;

            const warnTrigger = prayerTotalSeconds - warningSeconds;
            const warnKey = `${name}-${todayStr}-warn`;
            if (currentTotalSeconds >= warnTrigger && currentTotalSeconds < warnTrigger + 60) {
              if (!prayerWarningTriggeredRef.current[warnKey]) {
                prayerWarningTriggeredRef.current[warnKey] = true;
                dispatchPrayerWarning(name, timeStr);
              }
            } else if (currentTotalSeconds > warnTrigger + 60) {
              delete prayerWarningTriggeredRef.current[warnKey];
            }
          }

          const syurukStr = testSyurukStr || prayerTimes.Syuruk;
          if (syurukStr) {
            const [sh, sm] = syurukStr.split(':').map(Number);
            const currentMinutes = t.hours * 60 + t.minutes;
            const syurukMinutes = sh * 60 + sm;
            if (currentMinutes === syurukMinutes) {
              const syurukKey = `Syuruk-${new Date().toDateString()}`;
              if (!syurukTriggeredRef.current[syurukKey]) {
                syurukTriggeredRef.current[syurukKey] = true;
                dispatchSyurukTime();
              }
            } else if (currentMinutes > syurukMinutes + 1) {
              delete syurukTriggeredRef.current[`Syuruk-${new Date().toDateString()}`];
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
