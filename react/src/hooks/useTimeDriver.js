import { useState, useEffect, useRef } from 'react';
import { getCurrentIslamicTime } from '../utils/islamicTimeUtils';
import { useTakwimData } from './useTakwimData';
import { useData } from '../contexts/DataContext';
import {
  dispatchTimeUpdate,
  dispatchHijriDateChanged,
  dispatchPrayerWarning,
  dispatchSyurukTime,
  dispatchDateChanged
} from '../utils/timeEvents';
import { isPrayerSequenceActive } from '../utils/prayerSequenceState';
import { logKioskEvent } from '../services/clientLogger';

const ACTIVE_PRAYERS = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];
export const LS_PRAYER_TIMES_KEY = 'ipray-prayer-times';
export const LS_CURRENT_TIME_KEY = 'ipray-current-time';

/** Simpan prayer times dengan key bertarikh supaya tidak stale lintas hari */
function savePrayerTimesForToday(todayStr, timesObj) {
  try {
    if (typeof localStorage === 'undefined') return;
    // Simpan dengan key bertarikh (utama)
    localStorage.setItem(`${LS_PRAYER_TIMES_KEY}-${todayStr}`, JSON.stringify(timesObj));
    // Simpan juga key lama untuk backward compat dengan PrayerSequencePage
    localStorage.setItem(LS_PRAYER_TIMES_KEY, JSON.stringify(timesObj));
    // Buang key hari-hari lama (kekal hanya 2 hari)
    for (let i = 2; i <= 7; i++) {
      const past = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      localStorage.removeItem(`${LS_PRAYER_TIMES_KEY}-${past}`);
    }
  } catch (_) {}
}

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
  // Simpan config dalam ref supaya perubahan config tidak restart interval setiap kali
  const prayerTimeConfigRef = useRef(PRAYER_TIME_CONFIG);
  useEffect(() => { prayerTimeConfigRef.current = PRAYER_TIME_CONFIG; }, [PRAYER_TIME_CONFIG]);
  const warningSeconds = Math.round((PRAYER_TIME_CONFIG?.WARNING_START_MINUTES ?? 5) * 60);
  const warningSecondsRef = useRef(warningSeconds);
  useEffect(() => { warningSecondsRef.current = warningSeconds; }, [warningSeconds]);
  const snapshotSetRef = useRef(false);
  const lastHijriKeyRef = useRef('');
  const lastDateStrRef = useRef('');
  const lastSavedTimesRef = useRef('');
  const lastSavedTimeMinRef = useRef(-1);
  const prayerTriggeredRef = useRef({});
  const prayerWarningTriggeredRef = useRef({});
  const syurukTriggeredRef = useRef({});
  // Track tarikh terakhir supaya ref dibersihkan apabila hari bertukar
  const lastCleanDateRef = useRef('');

  useEffect(() => {
    if (!takwimParsed?.wdata) return;

    const update = () => {
      try {
        const nextPrayerDelayMinutes = (prayerTimeConfigRef.current?.IQAMAH_DURATION_MIN ?? 10) + (prayerTimeConfigRef.current?.SOLAT_DURATION_MIN ?? 10);
        const islamicTime = getCurrentIslamicTime({
          hdata: takwimParsed.hdata,
          wdata: takwimParsed.wdata,
          timeService,
          nextPrayerDelayMinutes
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

        // todayStr mesti dideklarasikan AWAL supaya semua kod di bawah boleh gunakannya
        const todayStr = gregorian ? `${gregorian.year}-${String(gregorian.month).padStart(2, '0')}-${String(gregorian.day).padStart(2, '0')}` : '';

        if (prayer?.times) {
          const timesKey = JSON.stringify(prayer.times);
          if (timesKey !== lastSavedTimesRef.current) {
            lastSavedTimesRef.current = timesKey;
            savePrayerTimesForToday(todayStr, prayer.times);
          }
        }

        // Bersihkan triggered refs apabila hari bertukar — elak warning Subuh skip hari baru
        if (todayStr && lastCleanDateRef.current && lastCleanDateRef.current !== todayStr) {
          prayerTriggeredRef.current = {};
          prayerWarningTriggeredRef.current = {};
          syurukTriggeredRef.current = {};
          try { localStorage.removeItem(`ipray-syuruk-triggered-${lastCleanDateRef.current}`); } catch (_) {}
        }
        if (todayStr) lastCleanDateRef.current = todayStr;

        const totalMin = t.hours * 60 + t.minutes;
        if (totalMin !== lastSavedTimeMinRef.current) {
          lastSavedTimeMinRef.current = totalMin;
          try { localStorage.setItem(LS_CURRENT_TIME_KEY, JSON.stringify(t)); } catch (_) {}
        }

        const currentTotalSeconds = t.hours * 3600 + t.minutes * 60 + t.seconds;

        const hijriKey = `${hijri?.day}-${hijri?.month}-${hijri?.year}`;
        if (hijriKey && lastHijriKeyRef.current && lastHijriKeyRef.current !== hijriKey) {
          dispatchHijriDateChanged(hijri);
        }
        lastHijriKeyRef.current = hijriKey;

        if (todayStr && lastDateStrRef.current && lastDateStrRef.current !== todayStr) {
          dispatchDateChanged(todayStr);
        }
        lastDateStrRef.current = todayStr;

        const prayerTimes = prayer?.times;
        if (prayerTimes) {
          for (const name of ACTIVE_PRAYERS) {
            const timeStr = prayerTimes[name];
            if (!timeStr) continue;
            const parts = timeStr.split(':').map(Number);
            const ph = parts[0] || 0, pm = parts[1] || 0, ps = parts[2] || 0;
            const prayerTotalSeconds = ph * 3600 + pm * 60 + ps;

            // Trigger HANYA bila kita masih SEBELUM waktu solat (elak beep serta-merta bila tick terlepas)
            const warnTrigger = prayerTotalSeconds - warningSecondsRef.current;
            const warnKey = `${name}-${todayStr}-warn`;
            // Sengaja TIDAK padam warnKey selepas waktu solat berlalu — key sudah bertarikh unik
            // (dibersihkan betul bila hari bertukar di atas), dan pemadaman awal ini boleh buka
            // lubang replay: jika jam sistem melompat ke belakang (contoh OS betulkan RTC) dan
            // jatuh semula dalam tingkap amaran, seluruh urutan azan-beep-iqamah-solat akan
            // tercetus SEKALI LAGI pada hari yang sama.
            if (currentTotalSeconds >= warnTrigger && currentTotalSeconds < prayerTotalSeconds) {
              if (!prayerWarningTriggeredRef.current[warnKey]) {
                prayerWarningTriggeredRef.current[warnKey] = true;
                dispatchPrayerWarning(name, timeStr);
                logKioskEvent('prayer-warning', { prayer: name, time: timeStr });
              }
            }
          }

          const syurukStr = prayerTimes.Syuruk;
          if (syurukStr) {
            const [sh, sm] = syurukStr.split(':').map(Number);
            const currentMinutes = t.hours * 60 + t.minutes;
            const syurukMinutes = sh * 60 + sm;
            const syurukKey = `Syuruk-${todayStr}`;
            const lsSyurukKey = `ipray-syuruk-triggered-${todayStr}`;
            // Tingkap 60 minit (bukan 1 minit) — jika Syuruk jatuh semasa urutan azan/iqamah/solat
            // Subuh sedang aktif (PrayerTimeController di-unmount, tiada yang dengar), tangguh
            // dispatch sehingga urutan itu selesai supaya bip Syuruk tidak hilang terus untuk hari itu.
            //
            // PENTING: guard "sudah trigger" disimpan dalam localStorage (bukan sekadar ref dalam
            // memori) — reload/restart (deploy, PM2 restart, admin action) boleh berlaku BILA-BILA
            // dalam tingkap 60 minit ni, dan reload wipe ref dalam memori. Tanpa guard berterusan,
            // bip Syuruk yang dah main sebelum reload akan main SEMULA lepas reload (disahkan
            // berlaku sebenar).
            if (currentMinutes >= syurukMinutes && currentMinutes < syurukMinutes + 60) {
              let alreadyTriggeredPersisted = false;
              try { alreadyTriggeredPersisted = localStorage.getItem(lsSyurukKey) === '1'; } catch (_) {}
              if (!syurukTriggeredRef.current[syurukKey] && !alreadyTriggeredPersisted && !isPrayerSequenceActive()) {
                syurukTriggeredRef.current[syurukKey] = true;
                try { localStorage.setItem(lsSyurukKey, '1'); } catch (_) {}
                dispatchSyurukTime();
                logKioskEvent('syuruk-time', { time: syurukStr });
              }
            } else if (currentMinutes >= syurukMinutes + 60) {
              delete syurukTriggeredRef.current[syurukKey];
            }
          }
        }
      } catch (err) {
        console.error('[useTimeDriver]', err);
        logKioskEvent('time-driver-error', { message: err?.message });
      }
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  // Sengaja exclude PRAYER_TIME_CONFIG dari deps — dibaca dari ref supaya interval tidak restart
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takwimParsed, timeService]);

  return {
    time,
    loading: takwimLoading,
    snapshot,
    zone: takwimParsed?.zone || ''
  };
}
