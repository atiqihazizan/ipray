import { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import audioService from '../services/audioService';
import { LS_PRAYER_TIMES_KEY } from '../hooks/useTimeDriver';
import AzanScreen from './prayer-screens/AzanScreen';
import IqamahScreen from './prayer-screens/IqamahScreen';
import SolatScreen from './prayer-screens/SolatScreen';
import DateTimeOverlay from './DateTimeOverlay';
import { bgSolatStyle } from './prayer-screens/styles';

const PRAYERS = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];

function formatCountdown(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Tunggu beep habis melalui audioService.subscribe('stop').
 * Apabila event 'stop' diterima → panggil onDone().
 * Jika play gagal (.catch) → terus onDone().
 * Returns cleanup function untuk unsubscribe jika komponen unmount.
 */
function playBeepThenDo(onDone) {
  if (audioService.getIsPlaying()) audioService.stop();

  let unsubscribe = null;
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    onDone();
  };

  unsubscribe = audioService.subscribe((event) => {
    if (event === 'stop') finish();
  });

  audioService.play({ sound: 'beep', volume: 1, playCount: 1 }).catch(finish);

  return () => {
    done = true;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  };
}

/**
 * Reload selamat: hanya reload jika masa semasa sudah lepas waktu solat semasa
 * tetapi belum mencapai waktu solat seterusnya.
 */
function safeReload(prayerName, prayerTimeStr) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const ptMinutes = prayerTimeStr
    ? (() => { const [h, m] = prayerTimeStr.split(':').map(Number); return h * 60 + m; })()
    : null;

  let nextPtMinutes = 24 * 60;
  try {
    const stored = JSON.parse(localStorage.getItem(LS_PRAYER_TIMES_KEY) || 'null');
    const idx = PRAYERS.indexOf(prayerName);
    const nextName = PRAYERS[idx + 1] ?? null;
    if (nextName && stored?.[nextName]) {
      const [h, m] = stored[nextName].split(':').map(Number);
      nextPtMinutes = h * 60 + m;
    }
  } catch (_) {}

  if (ptMinutes !== null && currentMinutes > ptMinutes && currentMinutes < nextPtMinutes) {
    window.location.reload();
  } else {
    setTimeout(() => safeReload(prayerName, prayerTimeStr), 30 * 1000);
  }
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

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const clearBeep = () => {
    if (beepCleanupRef.current) { beepCleanupRef.current(); beepCleanupRef.current = null; }
  };

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

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { clearTimer(); clearBeep(); };
  }, [screen, prayerTimeStr, PRAYER_TIME_CONFIG]);

  // Screen IQAMAH: countdown dari config
  useEffect(() => {
    if (screen !== 'iqamah') return;
    clearTimer();

    let remaining = Math.max(1, Math.floor((PRAYER_TIME_CONFIG?.IQAMAH_DURATION_MIN ?? 10) * 60));
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
  }, [screen, PRAYER_TIME_CONFIG]);

  // Screen SOLAT: countdown dari config, kemudian safe reload
  useEffect(() => {
    if (screen !== 'solat') return;
    clearTimer();

    let remaining = Math.max(1, Math.floor((PRAYER_TIME_CONFIG?.SOLAT_DURATION_MIN ?? 10) * 60));
    setCountdown(remaining);

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearTimer();
        safeReload(prayerName, prayerTimeStr);
      }
    }, 1000);
    return clearTimer;
  }, [screen, PRAYER_TIME_CONFIG, prayerName, prayerTimeStr]);

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
