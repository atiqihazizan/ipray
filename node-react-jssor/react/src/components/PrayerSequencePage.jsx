import { useState, useEffect, useRef, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import audioService from '../services/audioService';
import { LS_PRAYER_TIMES_KEY } from '../hooks/useTimeDriver';
import AzanScreen from './prayer-screens/AzanScreen';
import IqamahScreen from './prayer-screens/IqamahScreen';
import SolatScreen from './prayer-screens/SolatScreen';
import DateTimeOverlay from './DateTimeOverlay';
import { bgSolatStyle } from './prayer-screens/styles';

const PRAYERS = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];
// Fallback timeout jika audio 'stop' event tidak diterima (contoh: autoplay suspend)
const BEEP_FALLBACK_TIMEOUT_MS = 10_000;

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
function playBeepThenDo(onDone) {
  if (audioService.getIsPlaying()) audioService.stop();

  let unsubscribe = null;
  let done = false;
  let fallbackTimer = null;

  const finish = () => {
    if (done) return;
    done = true;
    if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    onDone();
  };

  unsubscribe = audioService.subscribe((event) => {
    if (event === 'stop') finish();
  });

  // Fallback: jika audio tidak selesai atau 'stop' tidak fired, teruskan selepas timeout
  fallbackTimer = setTimeout(finish, BEEP_FALLBACK_TIMEOUT_MS);

  audioService.play({ sound: 'beep', volume: 1, playCount: 1 }).catch(finish);

  return () => {
    done = true;
    if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
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
  const { PRAYER_TIME_CONFIG } = useData();
  const debugStart = getDebugStartScreen();

  const [screen, setScreen] = useState(debugStart || 'azan');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);
  const beepCleanupRef = useRef(null);
  const safeReloadTimerRef = useRef(null);

  // Simpan config dalam ref supaya countdown tidak restart bila config berubah semasa berjalan
  const prayerTimeConfigRef = useRef(PRAYER_TIME_CONFIG);
  useEffect(() => {
    prayerTimeConfigRef.current = PRAYER_TIME_CONFIG;
  }, [PRAYER_TIME_CONFIG]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const clearBeep = useCallback(() => {
    if (beepCleanupRef.current) { beepCleanupRef.current(); beepCleanupRef.current = null; }
  }, []);

  const clearSafeReloadTimer = useCallback(() => {
    if (safeReloadTimerRef.current) { clearTimeout(safeReloadTimerRef.current); safeReloadTimerRef.current = null; }
  }, []);

  // Cleanup semua timer apabila komponen unmount
  useEffect(() => {
    return () => {
      clearTimer();
      clearBeep();
      clearSafeReloadTimer();
    };
  }, [clearTimer, clearBeep, clearSafeReloadTimer]);

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

    const tick = () => {
      if (!prayerTimeStr) return;
      const parts = prayerTimeStr.split(':').map(Number);
      const ph = parts[0] || 0, pm = parts[1] || 0, ps = parts[2] || 0;
      const ptTotalSeconds = ph * 3600 + pm * 60 + ps;
      const now = new Date();
      const currentTotalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const remaining = ptTotalSeconds - currentTotalSeconds;

      if (remaining <= 0) {
        clearTimer();
        setCountdown(0);
        beepCleanupRef.current = playBeepThenDo(() => setScreen('iqamah'));
        return;
      }
      setCountdown(remaining);
    };

    timerRef.current = setInterval(tick, 1000);
    tick();
    return () => { clearTimer(); clearBeep(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, prayerTimeStr]); // Sengaja exclude PRAYER_TIME_CONFIG — guna ref supaya countdown tidak restart

  // Screen IQAMAH: countdown dari config (baca dari ref, bukan state — elak restart bila config berubah)
  useEffect(() => {
    if (screen !== 'iqamah') return;
    clearTimer();

    let remaining = Math.max(1, Math.floor((prayerTimeConfigRef.current?.IQAMAH_DURATION_MIN ?? 10) * 60));
    setCountdown(remaining);

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearTimer();
        setScreen('solat');
      }
    }, 1000);
    return clearTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]); // Sengaja exclude PRAYER_TIME_CONFIG — guna ref

  // Screen SOLAT: countdown dari config, kemudian safe reload
  useEffect(() => {
    if (screen !== 'solat') return;
    clearTimer();
    clearSafeReloadTimer();

    let remaining = Math.max(1, Math.floor((prayerTimeConfigRef.current?.SOLAT_DURATION_MIN ?? 10) * 60));
    setCountdown(remaining);

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearTimer();
        scheduleReload();
      }
    }, 1000);
    return () => { clearTimer(); clearSafeReloadTimer(); };
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
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const ptMinutes = prayerTimeStr
        ? (() => { const [h, m] = prayerTimeStr.split(':').map(Number); return h * 60 + m; })()
        : null;

      // Dapatkan waktu solat berikutnya dari localStorage
      // Guna key bertarikh supaya tidak stale lintas hari
      let nextPtMinutes = 24 * 60;
      try {
        const today = new Date().toISOString().slice(0, 10);
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
  }, [prayerName, prayerTimeStr, onComplete, clearSafeReloadTimer]);

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
