import { useEffect, useRef } from 'react';
import { getCurrentIslamicTime } from '../utils/islamicTimeUtils';
import { useTakwimData } from './useTakwimData';
import { useData } from '../contexts/DataContext';
import {
  dispatchTimeUpdate,
  dispatchHijriDateChanged,
  dispatchPrayerWarning,
  dispatchPrayerTime,
  dispatchSyurukTime,
  dispatchDateChanged,
  dispatchBlinkToggle,
  TIME_EVENTS
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
  const { timeService, PRAYER_TIME_CONFIG, COLOR_CONFIG } = useData();
  // No React state — data goes to window.data_ipray
  // Simpan config dalam ref supaya perubahan config tidak restart interval setiap kali
  const prayerTimeConfigRef = useRef(PRAYER_TIME_CONFIG);
  useEffect(() => { prayerTimeConfigRef.current = PRAYER_TIME_CONFIG; }, [PRAYER_TIME_CONFIG]);
  const warningSeconds = Math.round((PRAYER_TIME_CONFIG?.WARNING_START_MINUTES ?? 5) * 60);
  const warningSecondsRef = useRef(warningSeconds);
  useEffect(() => { warningSecondsRef.current = warningSeconds; }, [warningSeconds]);
  const colorConfigRef = useRef(COLOR_CONFIG);
  useEffect(() => { colorConfigRef.current = COLOR_CONFIG; }, [COLOR_CONFIG]);
  const isSyurukBeepBlinkingRef = useRef(false);
  const blinkToggleRef = useRef(true);
  const lastHijriKeyRef = useRef('');
  const lastDateStrRef = useRef('');
  const lastSavedTimesRef = useRef('');
  const lastSavedTimeMinRef = useRef(-1);
  const prayerTriggeredRef = useRef({});
  const prayerWarningTriggeredRef = useRef({});
  const syurukTriggeredRef = useRef({});
  // Track tarikh terakhir supaya ref dibersihkan apabila hari bertukar
  const lastCleanDateRef = useRef('');

  const PRAYER_IDS = ['subuh', 'syuruk', 'zohor', 'asar', 'maghrib', 'isyak'];

  function fmt12h(t) {
    if (!t) return '';
    const h = t.hours % 12 || 12;
    const m = String(t.minutes).padStart(2, '0');
    return `${h}:${m}`;
  }

  function fmtPrayerTime12h(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')}`;
  }

  useEffect(() => {
    const onStart = () => { isSyurukBeepBlinkingRef.current = true; };
    const onStop = () => { isSyurukBeepBlinkingRef.current = false; };
    window.addEventListener(TIME_EVENTS.SYURUK_BEEP_START, onStart);
    window.addEventListener(TIME_EVENTS.SYURUK_BEEP_STOP, onStop);
    return () => {
      window.removeEventListener(TIME_EVENTS.SYURUK_BEEP_START, onStart);
      window.removeEventListener(TIME_EVENTS.SYURUK_BEEP_STOP, onStop);
    };
  }, []);

  useEffect(() => {
    if (!takwimParsed?.wdata) return;

    // Test: masa solat = now + max(60, warningSeconds+15) supaya cukup runway bila warningSeconds > 60
    const _testTimeStr = (() => {
      const n = new Date();
      const offsetSec = Math.max(60, warningSeconds + 15);
      const t = new Date(n.getTime() + offsetSec * 1000);
      const h = t.getHours(), m = t.getMinutes(), s = t.getSeconds();
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    })();
    const testPrayerStr = TEST_PRAYER ? _testTimeStr : null;
    const testSyurukStr = TEST_SYURUK ? _testTimeStr : null;

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

        const snapshotData = {
          gregorian: islamicTime.gregorian,
          hijri: islamicTime.hijri,
          prayer: islamicTime.prayer
        };

        window.data_ipray = {
          time: islamicTime.time,
          snapshot: snapshotData
        };

        dispatchTimeUpdate({ time: islamicTime.time, snapshot: snapshotData });

        // --- DOM UPDATE VIA ID ---
        try {
          const colorConfig = colorConfigRef.current;
          const nextPrayer = islamicTime.prayer?.next?.toLowerCase();
          const prayerTimes = islamicTime.prayer?.times;
          const nextColor = colorConfig?.NEXT_PRAYER ?? '#FFD700';
          const defaultColor = colorConfig?.DEFAULT ?? '#FFFF00';

          // const clockEl = document.getElementById('ipray-clock');
          // if (clockEl) clockEl.textContent = fmt12h(islamicTime.time);
          //
          // const clockSmEl = document.getElementById('ipray-clock-sm');
          // if (clockSmEl) clockSmEl.textContent = fmt12h(islamicTime.time);

          blinkToggleRef.current = !blinkToggleRef.current;
          const blink = blinkToggleRef.current;
          dispatchBlinkToggle(blink);

          const h12 = islamicTime.time.hours % 12 || 12;
          const m2 = String(islamicTime.time.minutes).padStart(2, '0');

          for (const colonId of ['ipray-clock-colon', 'ipray-clock-sm-colon']) {
            const colonEl = document.getElementById(colonId);
            if (colonEl) {
              colonEl.style.opacity = blink ? '1' : '0';
              colonEl.style.transition = 'none';
            }
          }

          for (const [hId, mId] of [
            ['ipray-clock-h', 'ipray-clock-m'],
            ['ipray-clock-sm-h', 'ipray-clock-sm-m']
          ]) {
            const hEl = document.getElementById(hId);
            const mEl = document.getElementById(mId);
            if (hEl) hEl.textContent = h12;
            if (mEl) mEl.textContent = m2;
          }

          const warningSecs = warningSecondsRef.current;
          const t = islamicTime.time;
          const currentTotalSec = t.hours * 3600 + t.minutes * 60 + t.seconds;
          const warningColor = colorConfig?.WARNING_PRAYER ?? '#FF6600';

          for (const name of PRAYER_IDS) {
            const capitalName = name.charAt(0).toUpperCase() + name.slice(1);
            const timeStr = prayerTimes?.[capitalName];
            const isSyuruk = name === 'syuruk';

            let isPrayerExactTime = false;
            let isInPrayerMinute = false;
            let is30SecBefore = false;

            if (timeStr) {
              const [ph, pm] = timeStr.split(':').map(Number);
              const prayerTotalSec = ph * 3600 + pm * 60;
              isPrayerExactTime = currentTotalSec === prayerTotalSec;
              isInPrayerMinute = currentTotalSec >= prayerTotalSec && currentTotalSec < prayerTotalSec + 60;
              is30SecBefore = !isSyuruk && currentTotalSec >= prayerTotalSec - warningSecs && currentTotalSec < prayerTotalSec;
            }

            const isSyurukBeeping = isSyuruk && isSyurukBeepBlinkingRef.current;
            const isNext = nextPrayer === name;

            let labelColor, timeColor;
            if (isSyurukBeeping || (!isSyuruk && (isInPrayerMinute || is30SecBefore))) {
              labelColor = warningColor;
              timeColor = warningColor;
            } else if (isNext) {
              labelColor = nextColor;
              timeColor = nextColor;
            } else {
              labelColor = defaultColor;
              timeColor = '';
            }

            const labelEl = document.getElementById(`ipray-label-${name}`);
            const timeEl = document.getElementById(`ipray-time-${name}`);
            if (labelEl) labelEl.style.color = labelColor;
            if (timeEl) timeEl.style.color = timeColor;

            const wrapEl = document.getElementById(`ipray-wrap-${name}`);
            if (wrapEl) {
              const shouldBlink = isPrayerExactTime || is30SecBefore || isSyurukBeeping;
              if (shouldBlink) {
                wrapEl.style.opacity = blink ? '1' : '0';
                wrapEl.style.transition = 'opacity 0.35s ease';
              } else {
                wrapEl.style.opacity = '1';
                wrapEl.style.transition = '';
              }
            }

            const colonEl = document.getElementById(`ipray-colon-${name}`);
            if (colonEl) {
              if (isInPrayerMinute) {
                colonEl.style.opacity = blink ? '1' : '0';
                colonEl.style.transition = 'opacity 0.35s ease';
              } else {
                colonEl.style.opacity = '1';
                colonEl.style.transition = '';
              }
            }
          }

          const nextNameEl = document.getElementById('ipray-next-name');
          if (nextNameEl && islamicTime.prayer?.next) {
            const n = islamicTime.prayer.next;
            nextNameEl.textContent = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
          }

          const nextTimeEl = document.getElementById('ipray-next-time');
          if (nextTimeEl && nextPrayer && prayerTimes) {
            const capitalNext = nextPrayer.charAt(0).toUpperCase() + nextPrayer.slice(1);
            const tStr = fmtPrayerTime12h(prayerTimes[capitalNext]);
            if (tStr) {
              const [hPart, mPart] = tStr.split(':');
              nextTimeEl.innerHTML = `${hPart}<span class="ipray-blink-colon">:</span>${mPart}`;
            }
          }
        } catch (domErr) {
        }

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
          window.dispatchEvent(new CustomEvent(TIME_EVENTS.MINUTE_CHANGED));
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
          // Bila TEST_PRAYER: semua 5 guna masa sama — gunakan prayer.next untuk nama betul (elak sentiasa Isyak)
          const nextPrayerDisplay = prayer?.next
            ? (prayer.next.charAt(0).toUpperCase() + prayer.next.slice(1).toLowerCase())
            : null;
          const resolvedNextPrayer = nextPrayerDisplay && ACTIVE_PRAYERS.includes(nextPrayerDisplay) ? nextPrayerDisplay : null;

          for (const name of ACTIVE_PRAYERS) {
            const timeStr = testPrayerStr || prayerTimes[name];
            if (!timeStr) continue;
            const parts = timeStr.split(':').map(Number);
            const ph = parts[0] || 0, pm = parts[1] || 0, ps = parts[2] || 0;
            const prayerTotalSeconds = ph * 3600 + pm * 60 + ps;

            // Trigger HANYA bila kita masih SEBELUM waktu solat (elak beep serta-merta bila tick terlepas)
            const warnTrigger = prayerTotalSeconds - warningSecondsRef.current;
            const warnKey = testPrayerStr ? `${todayStr}-test-warn` : `${name}-${todayStr}-warn`;
            // Sengaja TIDAK padam warnKey selepas waktu solat berlalu — key sudah bertarikh unik
            // (dibersihkan betul bila hari bertukar di atas), dan pemadaman awal ini boleh buka
            // lubang replay: jika jam sistem melompat ke belakang (contoh OS betulkan RTC) dan
            // jatuh semula dalam tingkap amaran, seluruh urutan azan-beep-iqamah-solat akan
            // tercetus SEKALI LAGI pada hari yang sama.
            if (currentTotalSeconds >= warnTrigger && currentTotalSeconds < prayerTotalSeconds) {
              if (!prayerWarningTriggeredRef.current[warnKey]) {
                prayerWarningTriggeredRef.current[warnKey] = true;
                const displayName = (testPrayerStr && resolvedNextPrayer) ? resolvedNextPrayer : name;
                dispatchPrayerWarning(displayName, timeStr);
                logKioskEvent('prayer-warning', { prayer: displayName, time: timeStr });
              }
              if (testPrayerStr) break; // Test mode: satu dispatch sahaja
            }
          }

          const syurukStr = testSyurukStr || prayerTimes.Syuruk;
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
    loading: takwimLoading,
    zone: takwimParsed?.zone || ''
  };
}
