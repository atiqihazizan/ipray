import { useState, useEffect, useRef, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import audioService from '../services/audioService';
import { LS_PRAYER_TIMES_KEY } from '../hooks/useTimeDriver';
import { TIME_EVENTS } from '../utils/timeEvents';
import { setPrayerSequenceActive } from '../utils/prayerSequenceState';
import { logKioskEvent } from '../services/clientLogger';
import { PegawaiTable, PEGAWAI_LIST } from './prayer-screens/OfficerRow';
import DateTimeOverlay from './DateTimeOverlay';
import {
  bgSolatStyle, gridScreenStyle, leftColumnPegawaiStyle,
  rightColumnCenterStyle, pegawaiTitleStyle, pegawaiSmallStyle,
  countdownStyleIqamah, countdownBoxStyle, countdownBoxTextStyle,
  jawiTitleStyleAzan, jawiTitleStyleIqamah, jawiTitleStyle
} from './prayer-screens/styles';

const PRAYERS = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];
const BEEP_FALLBACK_TIMEOUT_MS = 20_000;
const BEEP_FALLBACK_BUFFER_MS = 2_000;
const BEEP_HARD_CEILING_MS = 30_000;

const JAWI_PRAYER_NAME = {
  subuh: 'صبح',
  zohor: 'الظهر',
  asar: 'العصر',
  maghrib: 'المغرب',
  isyak: 'العشاء',
};

function getAzanJawiText(prayerName) {
  const key = prayerName?.trim()?.toLowerCase();
  const nameJawi = key && JAWI_PRAYER_NAME[key] ? JAWI_PRAYER_NAME[key] : (prayerName || '');
  return `أذان`;
}

const JAWI_IQAMAH = 'اقامة';
const JAWI_SEDANG_SOLAT = 'صلاة';

const muteIconBadgeStyle = {
  width: '70px', height: '70px', borderRadius: '50%',
  backgroundColor: '#FFFFFF', display: 'flex',
  alignItems: 'center', justifyContent: 'center', margin: '0 16px',
};
const muteIconStyle = { maxWidth: '55px', maxHeight: '55px', height: 'auto' };

function formatCountdown(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

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

  let hardCeilingTimer = setTimeout(finish, BEEP_HARD_CEILING_MS);

  audioService.play({ sound: 'beep', volume: 1, playCount: 1 })
    .then(() => {
      if (done) return;
      if (hardCeilingTimer) { clearTimeout(hardCeilingTimer); hardCeilingTimer = null; }
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

function getDebugStartScreen() {
  const s = new URLSearchParams(window.location.search).get('debugScreen');
  return (s === 'iqamah' || s === 'solat') ? s : null;
}

export default function PrayerSequencePage({ prayerName, prayerTimeStr, onComplete, overlayOverride = null }) {
  const { PRAYER_TIME_CONFIG, timeService, petugasData } = useData();
  const debugStart = getDebugStartScreen();

  const [screen, setScreen] = useState(debugStart || 'azan');
  const [countdown, setCountdown] = useState(0);
  const beepCleanupRef = useRef(null);
  const safeReloadTimerRef = useRef(null);

  const prayerTimeConfigRef = useRef(PRAYER_TIME_CONFIG);
  useEffect(() => {
    prayerTimeConfigRef.current = PRAYER_TIME_CONFIG;
  }, [PRAYER_TIME_CONFIG]);

  const clearBeep = useCallback(() => {
    if (beepCleanupRef.current) { beepCleanupRef.current(); beepCleanupRef.current = null; }
  }, []);

  const clearSafeReloadTimer = useCallback(() => {
    if (safeReloadTimerRef.current) { clearTimeout(safeReloadTimerRef.current); safeReloadTimerRef.current = null; }
  }, []);

  useEffect(() => {
    return () => {
      clearBeep();
      clearSafeReloadTimer();
    };
  }, [clearBeep, clearSafeReloadTimer]);

  useEffect(() => {
    setPrayerSequenceActive(true);
    logKioskEvent('sequence-start', { prayer: prayerName, time: prayerTimeStr });
    return () => {
      setPrayerSequenceActive(false);
      logKioskEvent('sequence-end', { prayer: prayerName });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!prayerTimeStr || getDebugStartScreen()) return;
    setScreen('azan');
  }, [prayerTimeStr]);

  // Screen AZAN: countdown masa sebenar sehingga waktu solat
  useEffect(() => {
    if (screen !== 'azan') return;
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
        beepCleanupRef.current = playBeepThenDo(() => setScreen('masuk-waktu'), prayerName);
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
  }, [screen, prayerTimeStr]);

  // Screen MASUK-WAKTU: papar teks selama 10 saat, auto ke iqamah
  useEffect(() => {
    if (screen !== 'masuk-waktu') return;
    const timer = setTimeout(() => setScreen('iqamah'), 10_000);
    return () => clearTimeout(timer);
  }, [screen]);

  // Screen IQAMAH: countdown dari config
  useEffect(() => {
    if (screen !== 'iqamah') return;

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
  }, [screen]);

  // Screen SOLAT: countdown dari config, kemudian safe reload
  useEffect(() => {
    if (screen !== 'solat') return;
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
  }, [screen]);

  const scheduleReload = useCallback(() => {
    clearSafeReloadTimer();

    const tryReload = () => {
      const now = new Date(timeService?.now ? timeService.now() : Date.now());
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const ptMinutes = prayerTimeStr
        ? (() => { const [h, m] = prayerTimeStr.split(':').map(Number); return h * 60 + m; })()
        : null;

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

      if (ptMinutes !== null && currentMinutes > ptMinutes && currentMinutes < nextPtMinutes) {
        logKioskEvent('solat-done-reload', { prayer: prayerName });
        window.location.reload();
      } else {
        const minutesSincePrayer = ptMinutes !== null ? currentMinutes - ptMinutes : 999;
        if (minutesSincePrayer < 120) {
          safeReloadTimerRef.current = setTimeout(tryReload, 30_000);
        } else {
          if (typeof onComplete === 'function') onComplete();
        }
      }
    };

    tryReload();
  }, [prayerName, prayerTimeStr, onComplete, clearSafeReloadTimer, timeService]);

  const pegawaiList = (petugasData && petugasData.length > 0)
    ? petugasData.map((p) => ({ label: p.label, name: p.name, imageSrc: p.imageSrc }))
    : PEGAWAI_LIST;

  const cd = formatCountdown(countdown);

  // --- AZAN / IQAMAH layout (grid 2 lajur) ---
  if (screen === 'azan' || screen === 'iqamah') {
    const jawiTitle = screen === 'azan' ? jawiTitleStyleAzan() : jawiTitleStyleIqamah();
    const jawiText = screen === 'azan' ? getAzanJawiText(prayerName) : JAWI_IQAMAH;
    return (
      <>
        <div style={gridScreenStyle}>
          <div style={leftColumnPegawaiStyle}>
            <h2 style={pegawaiTitleStyle()}>PEGAWAI BERTUGAS</h2>
            <small style={pegawaiSmallStyle}>(Tertakluk kepada perubahan)</small>
            <br />
            <PegawaiTable list={pegawaiList} />
          </div>
          <div style={rightColumnCenterStyle}>
            <h1 style={jawiTitle}>{jawiText}</h1>
            <div style={countdownBoxStyle}>
              <p style={{ ...countdownStyleIqamah, ...countdownBoxTextStyle }}>{cd}</p>
            </div>
          </div>
        </div>
        {overlayOverride && <DateTimeOverlay overlayOverride={overlayOverride} />}
      </>
    );
  }

  // --- MASUK-WAKTU layout ---
  if (screen === 'masuk-waktu') {
    return (
      <>
        <div style={bgSolatStyle}>
          <h1 style={{ color: '#FFFFFF', fontSize: '80px', textAlign: 'center', margin: 0, fontFamily: "'ArchivoBlack', sans-serif" }}>
            Sekarang telah masuk waktu {prayerName}
          </h1>
        </div>
        {overlayOverride && <DateTimeOverlay overlayOverride={overlayOverride} />}
      </>
    );
  }

  // --- SOLAT layout ---
  return (
    <>
      <div style={bgSolatStyle}>
        <h1 style={jawiTitleStyle()}>{JAWI_SEDANG_SOLAT}</h1>
        <div style={{ position: 'absolute', bottom: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '104px' }}>
          <div style={muteIconBadgeStyle}>
            <img src="/img/mute-phone.png" alt="Senangkan telefon" style={muteIconStyle} />
          </div>
          <div style={muteIconBadgeStyle}>
            <img src="/img/silent.png" alt="Diam" style={muteIconStyle} />
          </div>
        </div>
      </div>
      {overlayOverride && <DateTimeOverlay overlayOverride={overlayOverride} />}
    </>
  );
}
