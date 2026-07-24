import { useEffect } from 'react';
import audioService from '../services/audioService';
import { TIME_EVENTS, dispatchSyurukBeepStart, dispatchSyurukBeepStop } from '../utils/timeEvents';

const ACTIVE_PRAYERS = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];

/**
 * Listen prayer-warning event: navigate ke PrayerSequencePage.
 * Listen syuruk-time: main beep.wav sekali + kelipan ikut durasi audio.
 */
export default function PrayerTimeController({ setCurrentView, setPrayerName, setPrayerTimeStr }) {
  useEffect(() => {
    if (typeof setCurrentView !== 'function') return;

    let syurukAudioUnsub = null;

    const clearSyurukAudioUnsub = () => {
      if (syurukAudioUnsub) {
        syurukAudioUnsub();
        syurukAudioUnsub = null;
      }
    };

    const stopSyurukBeepBlink = () => {
      dispatchSyurukBeepStop();
      clearSyurukAudioUnsub();
    };

    const prayerWarningHandler = (e) => {
      const prayerName = e.detail?.prayerName;
      if (!prayerName || !ACTIVE_PRAYERS.includes(prayerName)) return;

      if (typeof setPrayerName === 'function') setPrayerName(prayerName);
      if (typeof setPrayerTimeStr === 'function') setPrayerTimeStr(e.detail?.prayerTimeStr ?? null);
      setCurrentView('prayer');
    };

    const syurukHandler = () => {
      if (audioService.getIsPlaying()) audioService.stop();
      clearSyurukAudioUnsub();

      dispatchSyurukBeepStart();

      syurukAudioUnsub = audioService.subscribe((event) => {
        if (event === 'stop') stopSyurukBeepBlink();
      });

      audioService.play({ sound: 'beep', volume: 1, playCount: 1 }).catch(() => stopSyurukBeepBlink());
    };

    window.addEventListener(TIME_EVENTS.PRAYER_WARNING, prayerWarningHandler);
    window.addEventListener(TIME_EVENTS.SYURUK_TIME, syurukHandler);
    return () => {
      window.removeEventListener(TIME_EVENTS.PRAYER_WARNING, prayerWarningHandler);
      window.removeEventListener(TIME_EVENTS.SYURUK_TIME, syurukHandler);
      stopSyurukBeepBlink();
    };
  }, [setCurrentView, setPrayerName, setPrayerTimeStr]);

  return null;
}
