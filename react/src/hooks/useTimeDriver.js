import { useEffect, useRef } from 'react';
import { getCurrentIslamicTime } from '../utils/islamicTimeUtils';
import { useTakwimData } from './useTakwimData';
import { useData } from '../contexts/DataContext';
import {
  dispatchTimeUpdate,
  dispatchHijriDateChanged,
  dispatchPrayerWarning,
  dispatchSyurukTime,
  dispatchDateChanged,
  dispatchBlinkToggle,
  dispatchSequenceState,
  dispatchSequenceEnd,
  TIME_EVENTS
} from '../utils/timeEvents';
import { isPrayerSequenceActive, setPrayerSequenceActive } from '../utils/prayerSequenceState';
import { sliderGoTo, sliderPause, sliderResume } from '../utils/sliderControl';
import beepService from '../services/beepService';
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

// ─── TEST CONFIG ───────────────────────────────────────────────────────────────────────────
const TEST_SYURUK = false; // test waktu syuruk — trigger pada masa sekarang + 1 minit
// Gunakan window.iprayTest('run') untuk test prayer — lebih fleksibel daripada static boolean
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
  const testPrayerOverrideRef = useRef(null); // { name: 'asar', timeStr: 'HH:MM:SS' } — set via iprayTest('run')
  const lastHijriKeyRef = useRef('');
  const lastDateStrRef = useRef('');
  const lastSavedTimesRef = useRef('');
  const lastSavedTimeMinRef = useRef(-1);
  const prayerTriggeredRef = useRef({});
  const prayerWarningTriggeredRef = useRef({});
  const syurukTriggeredRef = useRef({});
  // Track tarikh terakhir supaya ref dibersihkan apabila hari bertukar
  const lastCleanDateRef = useRef('');
  const sequencePhaseRef = useRef(null);
  const sequenceCountdownRef = useRef(0);
  const sequenceStartTimeRef = useRef(0);
  const sequencePrayerNameRef = useRef('');
  const sequencePrayerTimeStrRef = useRef('');
  const scheduleReloadTimerRef = useRef(null);
  const masukWaktuBeepDoneRef = useRef(false);

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

    // Test syuruk: masa syuruk = now + max(60, warningSeconds+15)
    const _testTimeStr = (() => {
      const n = new Date();
      const offsetSec = Math.max(60, warningSeconds + 15);
      const t = new Date(n.getTime() + offsetSec * 1000);
      const h = t.getHours(), m = t.getMinutes(), s = t.getSeconds();
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    })();
    const testSyurukStr = TEST_SYURUK ? _testTimeStr : null;

    const scheduleReloadAfterSequence = () => {
      const tryReload = () => {
        const now = timeService?.now ? new Date(timeService.now()) : new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const prayerName = sequencePrayerNameRef.current;
        const prayerTimeStr = sequencePrayerTimeStrRef.current;

        const ptMinutes = prayerTimeStr
          ? (() => { const [h, m] = prayerTimeStr.split(':').map(Number); return h * 60 + m; })()
          : null;

        let nextPtMinutes = 24 * 60;
        try {
          const today = now.toISOString().slice(0, 10);
          const ACTIVE_PRAYERS_LIST = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];
          const stored = JSON.parse(localStorage.getItem(`${LS_PRAYER_TIMES_KEY}-${today}`) || 'null')
            ?? JSON.parse(localStorage.getItem(LS_PRAYER_TIMES_KEY) || 'null');
          const idx = ACTIVE_PRAYERS_LIST.indexOf(prayerName);
          const nextName = ACTIVE_PRAYERS_LIST[idx + 1] ?? null;
          if (nextName && stored?.[nextName]) {
            const [h, m] = stored[nextName].split(':').map(Number);
            nextPtMinutes = h * 60 + m;
          }
        } catch (_) {}

        if (ptMinutes !== null && currentMinutes > ptMinutes && currentMinutes < nextPtMinutes) {
          logKioskEvent('solat-done-reload', { prayer: prayerName });
          window.location.reload();
        } else {
          const minutesSincePrayer = ptMinutes !== null ? currentMinutes - ptMinutes : 999;
          if (minutesSincePrayer < 120) {
            scheduleReloadTimerRef.current = setTimeout(tryReload, 30_000);
          }
        }
      };

      tryReload();
    };

    const update = () => {
      try {
        const seqEnabled = prayerTimeConfigRef.current?.SEQUENCE_ENABLED !== false;
        const nextPrayerDelayMinutes = seqEnabled
          ? (prayerTimeConfigRef.current?.IQAMAH_DURATION_MIN ?? 10) + (prayerTimeConfigRef.current?.SOLAT_DURATION_MIN ?? 10)
          : 1;
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

          const clockColonEl = document.getElementById('ipray-clock-colon');
          if (clockColonEl) clockColonEl.style.opacity = blink ? '1' : '0';

          for (const [hId, mId] of [
            ['ipray-clock-h', 'ipray-clock-m']
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
            const testOverride = testPrayerOverrideRef.current;
            const timeStr = (testOverride?.name === name ? testOverride.timeStr : null) ?? prayerTimes?.[capitalName];
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
            if (wrapEl) wrapEl.style.opacity = is30SecBefore ? (blink ? '1' : '0') : '1';

            const colonEl = document.getElementById(`ipray-colon-${name}`);
            if (colonEl) colonEl.style.opacity = isInPrayerMinute ? (blink ? '1' : '0') : '1';

            // Beep + slider resume now handled by countdown engine (seqEnabled) or warning trigger timer (disabled)
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
              nextTimeEl.innerHTML = `${hPart}:${mPart}`;
            }
          }

          // --- Test override: update nextPrayer DOM terus bila override aktif ---
          const _testOvr = testPrayerOverrideRef.current;
          if (_testOvr) {
            const ACTIVE_LOWER = ['subuh', 'zohor', 'asar', 'maghrib', 'isyak'];
            const [_ph, _pm] = _testOvr.timeStr.split(':').map(Number);
            const _ovrSec = _ph * 3600 + _pm * 60;
            const _afterPrayerSec = currentTotalSec - _ovrSec;

            let _testNext;
            if (currentTotalSec < _ovrSec) {
              _testNext = _testOvr.name; // belum masuk waktu — tunjuk prayer ini
            } else if (_afterPrayerSec < 60) {
              _testNext = _testOvr.name; // isInPrayerMinute — masih tunjuk prayer ini
            } else {
              const _idx = ACTIVE_LOWER.indexOf(_testOvr.name);
              _testNext = _idx >= 0 && _idx < ACTIVE_LOWER.length - 1
                ? ACTIVE_LOWER[_idx + 1]
                : 'subuh';
            }

            // Update ipray-next-name
            const _nextNameEl = document.getElementById('ipray-next-name');
            if (_nextNameEl) _nextNameEl.textContent = _testNext.charAt(0).toUpperCase() + _testNext.slice(1).toLowerCase();

            // Update ipray-next-time — guna masa sebenar dari prayerTimes
            const _nextTimeEl = document.getElementById('ipray-next-time');
            if (_nextTimeEl && prayerTimes) {
              const _cap = _testNext.charAt(0).toUpperCase() + _testNext.slice(1);
              const _tStr = fmtPrayerTime12h(prayerTimes[_cap]);
              if (_tStr) {
                const [_h, _m] = _tStr.split(':');
                _nextTimeEl.innerHTML = `${_h}:${_m}`;
              }
            }

            // Update highlight warna dalam grid — DOM terus
            PRAYER_IDS.forEach(_name => {
              const _lbl = document.getElementById(`ipray-label-${_name}`);
              const _tim = document.getElementById(`ipray-time-${_name}`);
              const _isTestNext = _name === _testNext;
              if (_lbl) _lbl.style.color = _isTestNext ? nextColor : defaultColor;
              if (_tim) _tim.style.color = _isTestNext ? nextColor : '';
            });
          }

          const g = islamicTime.gregorian;
          if (g) {
            const gDay = g.dayFormatted || (g.day < 10 ? `0${g.day}` : `${g.day}`);
            const setG = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            setG('ipray-date-g-day', gDay);
            setG('ipray-date-g-dayname', g.dayName);
            setG('ipray-date-g-month', g.monthName);
            setG('ipray-date-g-year', g.year);
          }

          const h = islamicTime.hijri;
          if (h) {
            const hDay = h.day < 10 ? `0${h.day}` : `${h.day}`;
            const setH = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            setH('ipray-date-h-day', hDay);
            setH('ipray-date-h-month', h.monthName);
            setH('ipray-date-h-year', h.year);
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
            const testOverride = testPrayerOverrideRef.current;
            const isTestTarget = testOverride?.name === name.toLowerCase();
            const timeStr = (isTestTarget ? testOverride.timeStr : null) || prayerTimes[name];
            if (!timeStr) continue;
            const parts = timeStr.split(':').map(Number);
            const ph = parts[0] || 0, pm = parts[1] || 0, ps = parts[2] || 0;
            const prayerTotalSeconds = ph * 3600 + pm * 60 + ps;

            // Trigger HANYA bila kita masih SEBELUM waktu solat (elak beep serta-merta bila tick terlepas)
            const warnTrigger = prayerTotalSeconds - warningSecondsRef.current;
            const warnKey = isTestTarget ? `${todayStr}-test-warn` : `${name}-${todayStr}-warn`;
            if (currentTotalSeconds >= warnTrigger && currentTotalSeconds < prayerTotalSeconds) {
              if (!prayerWarningTriggeredRef.current[warnKey]) {
                prayerWarningTriggeredRef.current[warnKey] = true;
                sliderGoTo(0);
                sliderPause();
                if (seqEnabled) {
                  const displayName = (isTestTarget && resolvedNextPrayer) ? resolvedNextPrayer : name;
                  sequencePhaseRef.current = 'azan';
                  sequencePrayerNameRef.current = displayName;
                  sequencePrayerTimeStrRef.current = timeStr;
                  setPrayerSequenceActive(true);
                  dispatchPrayerWarning(displayName, timeStr);
                  logKioskEvent('prayer-warning', { prayer: displayName, time: timeStr });
                } else {
                  if (scheduleReloadTimerRef.current) clearTimeout(scheduleReloadTimerRef.current);
                  scheduleReloadTimerRef.current = setTimeout(sliderResume, 60_000);
                }
              }
              if (isTestTarget) break;
            }
          }

          // ─── SEQUENCE COUNTDOWN ENGINE — azan → iqamah → solat ───────────────
          if (seqEnabled && sequencePhaseRef.current) {
            const phase = sequencePhaseRef.current;
            const now = timeService?.now ? timeService.now() : Date.now();

            if (phase === 'azan') {
              const [ph, pm, ps] = sequencePrayerTimeStrRef.current.split(':').map(Number);
              const prayerTotalSec = ph * 3600 + pm * 60 + (ps || 0);
              const remaining = prayerTotalSec - currentTotalSeconds;

              if (remaining <= 0) {
                if (beepService.getIsPlaying()) beepService.stop();
                masukWaktuBeepDoneRef.current = false;
                sequencePhaseRef.current = 'masuk-waktu';

                let fallbackTimer = null;

                const transitionToIqamah = () => {
                  if (masukWaktuBeepDoneRef.current) return;
                  masukWaktuBeepDoneRef.current = true;
                  if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
                  sequencePhaseRef.current = 'iqamah';
                  sequenceStartTimeRef.current = timeService?.now ? timeService.now() : Date.now();
                  sequenceCountdownRef.current = Math.floor(
                    (prayerTimeConfigRef.current?.IQAMAH_DURATION_MIN ?? 10) * 60
                  );
                };

                fallbackTimer = setTimeout(transitionToIqamah, 30_000);
                beepService.beep(3, transitionToIqamah);
              } else {
                sequenceCountdownRef.current = remaining;
              }
              dispatchSequenceState({
                phase: sequencePhaseRef.current,
                countdown: sequenceCountdownRef.current,
                prayerName: sequencePrayerNameRef.current,
                prayerTimeStr: sequencePrayerTimeStrRef.current
              });
            } else if (phase === 'masuk-waktu') {
              dispatchSequenceState({
                phase: 'masuk-waktu',
                countdown: 0,
                prayerName: sequencePrayerNameRef.current,
                prayerTimeStr: sequencePrayerTimeStrRef.current
              });
            } else if (phase === 'iqamah') {
              const duration = Math.floor(
                (prayerTimeConfigRef.current?.IQAMAH_DURATION_MIN ?? 10) * 60
              );
              const elapsed = Math.floor((now - sequenceStartTimeRef.current) / 1000);
              const remaining = Math.max(0, duration - elapsed);
              sequenceCountdownRef.current = remaining;

              if (remaining <= 0) {
                sequencePhaseRef.current = 'solat';
                sequenceStartTimeRef.current = now;
                sequenceCountdownRef.current = Math.floor(
                  (prayerTimeConfigRef.current?.SOLAT_DURATION_MIN ?? 10) * 60
                );
              }
              dispatchSequenceState({
                phase: sequencePhaseRef.current,
                countdown: sequenceCountdownRef.current,
                prayerName: sequencePrayerNameRef.current,
                prayerTimeStr: sequencePrayerTimeStrRef.current
              });
            } else if (phase === 'solat') {
              const duration = Math.floor(
                (prayerTimeConfigRef.current?.SOLAT_DURATION_MIN ?? 10) * 60
              );
              const elapsed = Math.floor((now - sequenceStartTimeRef.current) / 1000);
              const remaining = Math.max(0, duration - elapsed);
              sequenceCountdownRef.current = remaining;

              dispatchSequenceState({
                phase: 'solat',
                countdown: remaining,
                prayerName: sequencePrayerNameRef.current,
                prayerTimeStr: sequencePrayerTimeStrRef.current
              });

              if (remaining <= 0) {
                sequencePhaseRef.current = null;
                setPrayerSequenceActive(false);
                sliderResume();
                dispatchSequenceEnd();
                scheduleReloadAfterSequence();
                logKioskEvent('sequence-done', { prayer: sequencePrayerNameRef.current });
              }
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

    // Debug helper — window.iprayTest(key) dari browser console
    window.iprayTest = (key) => {
      const PRAYER_IDS_DEBUG = ['subuh', 'syuruk', 'zohor', 'asar', 'maghrib', 'isyak'];
      const times = window.data_ipray?.snapshot?.prayer?.times;

      // --- DOM elements ---
      if (key === 'dom') {
        console.group('[iprayTest] DOM elements — prayer');
        PRAYER_IDS_DEBUG.forEach(name => {
          ['wrap','label','time','colon'].forEach(type => {
            const id = `ipray-${type}-${name}`;
            const el = document.getElementById(id);
            console.log(id, el ? '✓' : '✗ NULL', el?.style?.opacity ? `opacity:${el.style.opacity}` : '');
          });
        });
        console.groupEnd();
        console.group('[iprayTest] DOM elements — clock & date');
        ['ipray-clock-h','ipray-clock-m','ipray-clock-colon',
         'ipray-clock-sm-h','ipray-clock-sm-m','ipray-clock-sm-colon',
         'ipray-date-g-day','ipray-date-g-dayname','ipray-date-g-month','ipray-date-g-year',
         'ipray-date-h-day','ipray-date-h-month','ipray-date-h-year',
         'ipray-next-name','ipray-next-time'].forEach(id => {
          const el = document.getElementById(id);
          console.log(id, el ? `✓ "${el.textContent}"` : '✗ NULL');
        });
        console.groupEnd();
      }

      // --- Masa & prayer times ---
      if (key === 'time') {
        console.group('[iprayTest] window.data_ipray');
        console.log('time:', window.data_ipray?.time);
        console.log('next prayer:', window.data_ipray?.snapshot?.prayer?.next);
        console.log('prayer times:', times);
        console.groupEnd();
      }

      // --- Blink colon state ---
      if (key === 'blink') {
        console.group('[iprayTest] blink colon opacity');
        PRAYER_IDS_DEBUG.forEach(name => {
          const el = document.getElementById(`ipray-colon-${name}`);
          console.log(`ipray-colon-${name}`, el ? `opacity:${el.style.opacity}` : '✗ NULL');
        });
        console.log('ipray-clock-colon:', document.getElementById('ipray-clock-colon')?.style?.opacity ?? '✗ NULL');
        console.groupEnd();
      }

      // --- Prayer sequence state ---
      if (key === 'state') {
        const active = isPrayerSequenceActive();
        console.group('[iprayTest] prayer sequence state');
        console.log('isPrayerSequenceActive:', active);
        console.log('next prayer:', window.data_ipray?.snapshot?.prayer?.next);
        console.groupEnd();
      }

      // --- Disable prayer sequence (untuk test blink bebas) ---
      if (key === 'disable') {
        setPrayerSequenceActive(false);
        console.log('[iprayTest] prayer sequence DISABLED — blink & syuruk boleh trigger bebas');
      }

      if (key === 'enable') {
        setPrayerSequenceActive(true);
        console.log('[iprayTest] prayer sequence ENABLED semula');
      }

      // --- Test slider pause / play ---
      if (key === 'pause') {
        sliderGoTo(0);
        sliderPause();
        console.log('[iprayTest] slider → GoTo(0) + Pause');
      }

      if (key === 'play') {
        sliderResume();
        console.log('[iprayTest] slider → Resume (clear lock + Play)');
      }

      // --- Simulate blink warning terus pada DOM (tanpa trigger prayer sequence) ---
      if (key === 'warning') {
        const wrapEl = document.getElementById('ipray-wrap-zohor');
        if (!wrapEl) { console.warn('[iprayTest] ipray-wrap-zohor tidak wujud dalam DOM'); return; }
        console.log('[iprayTest] simulate blink warning Zohor — 10 saat (DOM direct, tanpa event)');
        wrapEl.style.transition = 'opacity 0.35s ease';
        const colonEl = document.getElementById('ipray-colon-zohor');
        if (colonEl) colonEl.style.transition = 'opacity 0.35s ease';
        let t = 0;
        const iv = setInterval(() => {
          t++;
          const b = t % 2 === 0;
          wrapEl.style.opacity = b ? '1' : '0';
          if (colonEl) colonEl.style.opacity = b ? '1' : '0';
          if (t >= 10) { clearInterval(iv); wrapEl.style.opacity = '1'; wrapEl.style.transition = ''; if (colonEl) { colonEl.style.opacity = '1'; colonEl.style.transition = ''; } console.log('[iprayTest] blink warning selesai'); }
        }, 1000);
      }

      // --- Trigger prayer sequence sebenar (akan papar prayer state) ---
      if (key === 'seq') {
        const zohorTime = times?.Zohor ?? '13:00';
        sequencePhaseRef.current = 'azan';
        sequencePrayerNameRef.current = 'Zohor';
        sequencePrayerTimeStrRef.current = zohorTime;
        setPrayerSequenceActive(true);
        console.log('[iprayTest] trigger sequence → Zohor (countdown engine running)');
        window.dispatchEvent(new CustomEvent('prayer-warning', {
          detail: { prayerName: 'Zohor', prayerTimeStr: zohorTime }
        }));
      }

      // --- Simulate masuk waktu Zohor (prayer-time event) ---
      if (key === 'masuk') {
        console.log('[iprayTest] dispatch prayer-time → Zohor');
        window.dispatchEvent(new CustomEvent('prayer-time', {
          detail: { prayerName: 'Zohor' }
        }));
      }

      // --- Simulate syuruk beep blink (auto-stop 10s) ---
      if (key === 'syuruk') {
        console.log('[iprayTest] SYURUK_BEEP_START — blink syuruk aktif (auto-stop 10s)');
        window.dispatchEvent(new CustomEvent('syuruk-beep-start'));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('syuruk-beep-stop'));
          console.log('[iprayTest] SYURUK_BEEP_STOP — blink syuruk tamat');
        }, 10000);
      }

      // --- Watch next prayer change — pantau override prayer ---
      if (key === 'watch') {
        const override = testPrayerOverrideRef.current;
        const watchName = override?.name || 'asar';
        console.log(`[iprayTest] watch '${watchName}' selama 150s... (jalankan 'run' dulu jika belum)`);
        let tick = 0;
        const iv = setInterval(() => {
          tick++;
          const next = window.data_ipray?.snapshot?.prayer?.next;
          const t = window.data_ipray?.time;
          const colonEl = document.getElementById(`ipray-colon-${watchName}`);
          const wrapEl = document.getElementById(`ipray-wrap-${watchName}`);
          console.log(`[${tick}s] next:${next} | ${t?.hours}:${String(t?.minutes).padStart(2,'0')}:${String(t?.seconds).padStart(2,'0')} | colon:${colonEl?.style?.opacity??'?'} wrap:${wrapEl?.style?.opacity??'?'}`);
          if (tick >= 150) { clearInterval(iv); console.log('[iprayTest] watch selesai'); }
        }, 1000);
      }

      // --- Hardcode waktu solat untuk test (gantikan TEST_PRAYER) ---
      if (key === 'run') {
        const next = window.data_ipray?.snapshot?.prayer?.next?.toLowerCase();
        if (!next || next === 'subuh') {
          console.warn('[iprayTest run] nextPrayer adalah Subuh atau tiada — skip (Subuh tidak disokong)');
          return;
        }
        // Prayer time = sekarang + 2 minit — warning terus blink, masuk waktu dalam ~2 minit
        const offsetSec = 120;
        const now = new Date();
        const t = new Date(now.getTime() + offsetSec * 1000);
        const h = String(t.getHours()).padStart(2,'0');
        const m = String(t.getMinutes()).padStart(2,'0');
        const s = String(t.getSeconds()).padStart(2,'0');
        const timeStr = `${h}:${m}:${s}`;
        // Clear warnKey lama supaya warning boleh fire semula
        const todayKey = new Date().toISOString().slice(0,10);
        prayerWarningTriggeredRef.current[`${todayKey}-test-warn`] = false;
        testPrayerOverrideRef.current = { name: next, timeStr };
        console.log(`%c[iprayTest run] ${next.toUpperCase()} hardcode → ${timeStr}`, 'color:#FFD700;font-weight:bold');
        console.log(`  warning blink: SEGERA (prayer time dalam ~2 minit)`);
        console.log(`  masuk waktu dalam: ~2 minit`);
        console.log(`  colon blink (isInPrayerMinute): 60s selepas masuk waktu`);
        console.log(`  nextPrayer tukar selepas: ~3 minit`);
        console.log(`  jalankan 'watch' untuk pantau`);
      }

      // --- Henti test, buang override ---
      if (key === 'stop') {
        testPrayerOverrideRef.current = null;
        console.log('[iprayTest stop] test prayer override cleared — kembali ke masa sebenar');
      }

      const ALL_KEYS = ['dom','time','blink','state','disable','enable','warning','seq','masuk','syuruk','run','stop','watch'];
      if (!ALL_KEYS.includes(key)) {
        console.log('[iprayTest] keys tersedia:');
        console.log('  run     — hardcode waktu nextPrayer = sekarang+offset (test warning→masuk→nextPrayer)');
        console.log('  stop    — buang test override, kembali ke masa sebenar');
        console.log('  watch   — pantau nextPrayer & colon opacity (150s)');
        console.log('  dom     — semak semua DOM element');
        console.log('  time    — semak window.data_ipray');
        console.log('  blink   — semak opacity colon semua waktu');
        console.log('  state   — semak prayer sequence state');
        console.log('  disable — disable prayer sequence state');
        console.log('  enable  — enable semula prayer sequence state');
        console.log('  warning — simulate blink warning Zohor (DOM direct, TANPA trigger UI)');
        console.log('  seq     — trigger prayer sequence UI (prayer-warning event)');
        console.log('  masuk   — dispatch prayer-time event');
        console.log('  syuruk  — simulate syuruk beep blink (auto-stop 10s)');
      }
    };
    console.log('%c[iPray] Debug ready → window.iprayTest(key)', 'color:#FFD700;font-weight:bold');
    console.log('%c  run | stop | watch | dom | time | blink | state | disable | enable | warning | seq | masuk | syuruk', 'color:#aaa');

    update();
    const id = setInterval(update, 1000);
    return () => {
      clearInterval(id);
      if (scheduleReloadTimerRef.current) {
        clearTimeout(scheduleReloadTimerRef.current);
        scheduleReloadTimerRef.current = null;
      }
      delete window.iprayTest;
    };
  // Sengaja exclude PRAYER_TIME_CONFIG dari deps — dibaca dari ref supaya interval tidak restart
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takwimParsed, timeService]);

  return {
    loading: takwimLoading,
    zone: takwimParsed?.zone || ''
  };
}
