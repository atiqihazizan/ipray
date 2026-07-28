import { useState, useEffect, useRef, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import audioService from '../services/audioService';
import { LS_PRAYER_TIMES_KEY } from '../hooks/useTimeDriver';
import { TIME_EVENTS } from '../utils/timeEvents';
import { setPrayerSequenceActive } from '../utils/prayerSequenceState';
import { logKioskEvent } from '../services/clientLogger';
import AzanScreen from './prayer-screens/AzanScreen';
import IqamahScreen from './prayer-screens/IqamahScreen';
import SolatScreen from './prayer-screens/SolatScreen';
import DateTimeOverlay from './DateTimeOverlay';
import { bgSolatStyle } from './prayer-screens/styles';

const PRAYERS = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];
// Fallback timeout jika durasi audio tidak dapat dikesan (contoh: autoplay suspend) — guna nilai
// generus supaya tidak potong beep.wav (~13s) sebelum habis; bila durasi diketahui, guna durasi sebenar + buffer.
const BEEP_FALLBACK_TIMEOUT_MS = 20_000;
const BEEP_FALLBACK_BUFFER_MS = 2_000;
// Jaring keselamatan mutlak jika promise play() sendiri tidak pernah resolve/reject
// (jarang, tapi dilaporkan berlaku pada sesetengah browser Chromium terbenam) — tanpa ini,
// urutan boleh tersangkut di skrin Azan selama-lamanya kerana fallback biasa hanya bermula
// SELEPAS play() selesai.
const BEEP_HARD_CEILING_MS = 30_000;

function formatCountdown(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Tunggu beep habis melalui audioService.subscribe('stop').
 * Fallback: jika 'stop' tidak diterima dalam BEEP_FALLBACK_TIMEOUT_MS, teruskan juga.
 * Returns cleanup function untuk unsubscribe jika komponen unmount.
 */
function playBeepThenDo(onDone, prayerName) {
  if (audioService.getIsPlaying()) audioService.stop();

  let unsubscribe = null;
  let done = false;
  let fallbackTimer = null;

  logKioskEvent('beep-start', { prayer: prayerName });

  const finish = () => {
    if (done) return;
    done = true;
    if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
    if (hardCeilingTimer) { clearTimeout(hardCeilingTimer); hardCeilingTimer = null; }
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    logKioskEvent('beep-done', { prayer: prayerName });
    onDone();
  };

  unsubscribe = audioService.subscribe((event) => {
    if (event === 'stop') finish();
  });

  // Bermula SERTA-MERTA (bukan selepas play() selesai) — jaring keselamatan mutlak.
  let hardCeilingTimer = setTimeout(finish, BEEP_HARD_CEILING_MS);

  audioService.play({ sound: 'beep', volume: 1, playCount: 1 })
    .then(() => {
      if (done) return;
      if (hardCeilingTimer) { clearTimeout(hardCeilingTimer); hardCeilingTimer = null; }
      // Fallback hanya sebagai jaringan keselamatan jika event 'stop' tidak fired langsung.
      // Guna durasi sebenar audio + buffer supaya skrin tidak bertukar sebelum beep habis main.
      const durationMs = audioService.getDurationMs();
      const timeoutMs = durationMs ? durationMs + BEEP_FALLBACK_BUFFER_MS : BEEP_FALLBACK_TIMEOUT_MS;
      fallbackTimer = setTimeout(finish, timeoutMs);
    })
    .catch(finish);

  return () => {
    done = true;
    if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
    if (hardCeilingTimer) { clearTimeout(hardCeilingTimer); hardCeilingTimer = null; }
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  };
}

/** Debug: ?debugScreen=iqamah atau ?debugScreen=solat untuk lompat terus ke screen itu */
function getDebugStartScreen() {
  const s = new URLSearchParams(window.location.search).get('debugScreen');
  return (s === 'iqamah' || s === 'solat') ? s : null;
}

/**
 * Urutan waktu solat: azan countdown → (countdown=0: play beep, tunggu beep habis) → iqamah → solat → reload.
 * Sentiasa mulakan dari screen azan tanpa mengira warningSeconds.
 */
export default function PrayerSequencePage({ prayerName, prayerTimeStr, onComplete, overlayOverride = null }) {
  const { PRAYER_TIME_CONFIG, timeService } = useData();
  const debugStart = getDebugStartScreen();

  const [screen, setScreen] = useState(debugStart || 'azan');
  const [countdown, setCountdown] = useState(0);
  // const timerRef = useRef(null);
  const beepCleanupRef = useRef(null);
  const safeReloadTimerRef = useRef(null);

  // Simpan config dalam ref supaya countdown tidak restart bila config berubah semasa berjalan
  const prayerTimeConfigRef = useRef(PRAYER_TIME_CONFIG);
  useEffect(() => {
    prayerTimeConfigRef.current = PRAYER_TIME_CONFIG;
  }, [PRAYER_TIME_CONFIG]);

  // const clearTimer = useCallback(() => {
  //   if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  // }, []);

  const clearBeep = useCallback(() => {
    if (beepCleanupRef.current) { beepCleanupRef.current(); beepCleanupRef.current = null; }
  }, []);

  const clearSafeReloadTimer = useCallback(() => {
    if (safeReloadTimerRef.current) { clearTimeout(safeReloadTimerRef.current); safeReloadTimerRef.current = null; }
  }, []);

  // Cleanup semua timer apabila komponen unmount
  useEffect(() => {
    return () => {
      // clearTimer();
      clearBeep();
      clearSafeReloadTimer();
    };
  }, [clearBeep, clearSafeReloadTimer]);

  // Tandakan urutan solat sedang aktif — proses lain (contoh: reload data:updated)
  // akan tangguh sehingga urutan ini selesai (unmount)
  useEffect(() => {
    setPrayerSequenceActive(true);
    logKioskEvent('sequence-start', { prayer: prayerName, time: prayerTimeStr });
    return () => {
      setPrayerSequenceActive(false);
      logKioskEvent('sequence-end', { prayer: prayerName });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sentiasa mulakan dari screen azan apabila prayerTimeStr tersedia (kecuali debug via ?debugScreen=)
  useEffect(() => {
    if (!prayerTimeStr || getDebugStartScreen()) return;
    setScreen('azan');
  }, [prayerTimeStr]);

  // Screen AZAN: countdown masa sebenar sehingga waktu solat
  // Apabila countdown = 0: play beep, tunggu beep habis, BARU tukar ke iqamah
  useEffect(() => {
    if (screen !== 'azan') return;
    clearTimer();
    clearBeep();

    const handler = () => {
      if (!prayerTimeStr) return;
      const t = window.data_ipray?.time;
      if (!t) return;
      const parts = prayerTimeStr.split(':').map(Number);
      const ph = parts[0] || 0, pm = parts[1] || 0, ps = parts[2] || 0;
      const ptTotalSeconds = ph * 3600 + pm * 60 + ps;
      const currentTotalSeconds = t.hours * 3600 + t.minutes * 60 + t.seconds;
      const remaining = ptTotalSeconds - currentTotalSeconds;

      if (remaining <= 0) {
        window.removeEventListener(TIME_EVENTS.TIME_UPDATE, handler);
        setCountdown(0);
        beepCleanupRef.current = playBeepThenDo(() => setScreen('iqamah'), prayerName);
        return;
      }
      setCountdown(remaining);
    };

    handler();
    window.addEventListener(TIME_EVENTS.TIME_UPDATE, handler);
    return () => {
      window.removeEventListener(TIME_EVENTS.TIME_UPDATE, handler);
      clearBeep();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, prayerTimeStr]); // Sengaja exclude PRAYER_TIME_CONFIG — guna ref supaya countdown tidak restart

  // Screen IQAMAH: countdown dari config (baca dari ref, bukan state — elak restart bila config berubah)
  useEffect(() => {
    if (screen !== 'iqamah') return;
    clearTimer();

    const duration = Math.max(1, Math.floor((prayerTimeConfigRef.current?.IQAMAH_DURATION_MIN ?? 10) * 60));
    const startTime = timeService?.now ? timeService.now() : Date.now();
    setCountdown(duration);

    const handler = () => {
      const now = timeService?.now ? timeService.now() : Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = duration - elapsed;
      setCountdown(Math.max(0, remaining));
      if (remaining <= 0) {
        window.removeEventListener(TIME_EVENTS.TIME_UPDATE, handler);
        logKioskEvent('iqamah-done', { prayer: prayerName });
        setScreen('solat');
      }
    };

    window.addEventListener(TIME_EVENTS.TIME_UPDATE, handler);
    return () => window.removeEventListener(TIME_EVENTS.TIME_UPDATE, handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]); // Sengaja exclude PRAYER_TIME_CONFIG — guna ref

  // Screen SOLAT: countdown dari config, kemudian safe reload
  useEffect(() => {
    if (screen !== 'solat') return;
    clearTimer();
    clearSafeReloadTimer();

    const duration = Math.max(1, Math.floor((prayerTimeConfigRef.current?.SOLAT_DURATION_MIN ?? 10) * 60));
    const startTime = timeService?.now ? timeService.now() : Date.now();
    setCountdown(duration);

    const handler = () => {
      const now = timeService?.now ? timeService.now() : Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = duration - elapsed;
      setCountdown(Math.max(0, remaining));
      if (remaining <= 0) {
        window.removeEventListener(TIME_EVENTS.TIME_UPDATE, handler);
        scheduleReload();
      }
    };

    window.addEventListener(TIME_EVENTS.TIME_UPDATE, handler);
    return () => {
      window.removeEventListener(TIME_EVENTS.TIME_UPDATE, handler);
      clearSafeReloadTimer();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]); // Sengaja exclude PRAYER_TIME_CONFIG — guna ref

  /**
   * Reload selamat dengan timer yang boleh dibatalkan.
   * Hanya reload jika masa semasa sudah lepas waktu solat semasa
   * tetapi belum mencapai waktu solat seterusnya.
   * Tidak rekursif tanpa batas — guna ref untuk track dan cancel.
   */
  const scheduleReload = useCallback(() => {
    clearSafeReloadTimer();

    const tryReload = () => {
      const now = new Date(timeService?.now ? timeService.now() : Date.now());
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const ptMinutes = prayerTimeStr
        ? (() => { const [h, m] = prayerTimeStr.split(':').map(Number); return h * 60 + m; })()
        : null;

      // Dapatkan waktu solat berikutnya dari localStorage
      // Guna key bertarikh supaya tidak stale lintas hari
      let nextPtMinutes = 24 * 60;
      try {
        const today = now.toISOString().slice(0, 10);
        const stored = JSON.parse(localStorage.getItem(`${LS_PRAYER_TIMES_KEY}-${today}`) || 'null')
          ?? JSON.parse(localStorage.getItem(LS_PRAYER_TIMES_KEY) || 'null');
        const idx = PRAYERS.indexOf(prayerName);
        const nextName = PRAYERS[idx + 1] ?? null;
        if (nextName && stored?.[nextName]) {
          const [h, m] = stored[nextName].split(':').map(Number);
          nextPtMinutes = h * 60 + m;
        }
      } catch (_) {}

      // Reload jika sudah lepas waktu solat dan belum sampai solat seterusnya
      if (ptMinutes !== null && currentMinutes > ptMinutes && currentMinutes < nextPtMinutes) {
        logKioskEvent('solat-done-reload', { prayer: prayerName });
        window.location.reload();
      } else {
        // Cuba semula dalam 30s — tapi hanya jika masih dalam window yang munasabah
        // Elak retry bila masa jauh dari solat (contoh: Isyak selesai, masa 11 PM)
        const minutesSincePrayer = ptMinutes !== null ? currentMinutes - ptMinutes : 999;
        if (minutesSincePrayer < 120) { // hanya retry dalam 2 jam selepas waktu solat
          safeReloadTimerRef.current = setTimeout(tryReload, 30_000);
        } else {
          // Sudah terlalu lama — panggil onComplete untuk kembali ke slideshow
          if (typeof onComplete === 'function') onComplete();
        }
      }
    };

    tryReload();
  }, [prayerName, prayerTimeStr, onComplete, clearSafeReloadTimer, timeService]);

  if (!screen) return <div style={bgSolatStyle} />;

  let content;
  if (screen === 'azan') content = <AzanScreen prayerName={prayerName} countdown={formatCountdown(countdown)} />;
  else if (screen === 'iqamah') content = <IqamahScreen countdown={formatCountdown(countdown)} />;
  else content = <SolatScreen countdown={formatCountdown(countdown)} />;

  return (
    <>
      {content}
      {overlayOverride && <DateTimeOverlay overlayOverride={overlayOverride} />}
    </>
  );
}
