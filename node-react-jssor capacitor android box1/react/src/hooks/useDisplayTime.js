import { useState, useEffect, useMemo } from 'react';
import { useIslamicTime } from './useIslamicTime';
import { useData } from '../contexts/DataContext';
import { getPrayerIndex, getPrayerTimeByIndex, isSyurukIndex } from '../utils/prayerIndexUtils';
import { LS_PRAYER_TIMES_KEY, LS_CURRENT_TIME_KEY } from './useTimeDriver';

function getCachedPrayerTimes() {
  try {
    const raw = localStorage.getItem(LS_PRAYER_TIMES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

function getCachedCurrentTime() {
  try {
    const raw = localStorage.getItem(LS_CURRENT_TIME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

/**
 * Hook untuk DisplayTime component.
 * Masa dan format dari useIslamicTime. Tempoh amaran sebelum waktu (kelip) dari config WARNING_START_MINUTES.
 */
export const useDisplayTime = ({
  format = '24h',
  showSeconds = true,
  showAmPm = true,
  isCurrentTime = true,
  prayerName = null,
  nextPrayerTime = null,
  nextPrayerName = null
}) => {
  const { islamicTime, loading } = useIslamicTime();
  const { PRAYER_TIME_CONFIG } = useData();
  const [blink, setBlink] = useState(true);
  const warningSeconds = Math.round((PRAYER_TIME_CONFIG?.WARNING_START_MINUTES ?? 5) * 60);
  const beepCount = PRAYER_TIME_CONFIG?.BEEP_COUNT ?? 10;

  const liveTimes = islamicTime?.prayer?.times;
  const effectiveTimes = liveTimes ?? getCachedPrayerTimes();

  const prayerState = useMemo(() => {
    if (!prayerName || !islamicTime?.time || !effectiveTimes) {
      return { is30SecondsBeforePrayer: false, isPrayerTime: false, isInPrayerMinute: false, isSyurukInFirst10Sec: false };
    }
    const times = effectiveTimes;
    const prayerIdx = getPrayerIndex(prayerName);
    if (prayerIdx == null) return { is30SecondsBeforePrayer: false, isPrayerTime: false, isInPrayerMinute: false, isSyurukInFirst10Sec: false };
    const timeStr = getPrayerTimeByIndex(times, prayerIdx);
    if (!timeStr) return { is30SecondsBeforePrayer: false, isPrayerTime: false, isInPrayerMinute: false, isSyurukInFirst10Sec: false };
    const [ph, pm] = timeStr.split(':').map(Number);
    const prayerTotalSeconds = ph * 3600 + pm * 60;
    const { hours, minutes, seconds } = islamicTime.time;
    const currentTotalSeconds = hours * 3600 + minutes * 60 + seconds;
    const is30SecondsBeforePrayer = currentTotalSeconds >= prayerTotalSeconds - warningSeconds && currentTotalSeconds < prayerTotalSeconds;
    const isInPrayerMinute = currentTotalSeconds >= prayerTotalSeconds && currentTotalSeconds < prayerTotalSeconds + 60;
    const isPrayerTime = currentTotalSeconds === prayerTotalSeconds;
    const isSyurukInFirst10Sec = isSyurukIndex(prayerIdx) && currentTotalSeconds >= prayerTotalSeconds && currentTotalSeconds < prayerTotalSeconds + beepCount + 4;
    return { is30SecondsBeforePrayer, isPrayerTime, isInPrayerMinute, isSyurukInFirst10Sec };
  }, [prayerName, warningSeconds, beepCount, islamicTime?.time?.hours, islamicTime?.time?.minutes, islamicTime?.time?.seconds, effectiveTimes]);

  const isPrayerTime = prayerState.isPrayerTime;
  const isInPrayerMinute = prayerState.isInPrayerMinute;
  const is30SecondsBeforePrayer = prayerState.is30SecondsBeforePrayer;
  const isSyurukInFirst10Sec = prayerState.isSyurukInFirst10Sec;

  const shouldBlink = !showSeconds && isCurrentTime;
  const isSyuruk = isSyurukIndex(getPrayerIndex(prayerName));
  const use30sBeforeForBlink = !isSyuruk && is30SecondsBeforePrayer;
  const useSyuruk10SecBlink = isSyurukInFirst10Sec;

  // Kelipan: driven oleh event time-update. Syuruk: blink pada waktu dan 10 saat pertama selepas masuk waktu; lain: 30s sebelum + masuk waktu.
  useEffect(() => {
    if (!shouldBlink && !isPrayerTime && !use30sBeforeForBlink && !useSyuruk10SecBlink) {
      setBlink(true);
      return;
    }
    if (islamicTime?.time != null) setBlink((prev) => !prev);
  }, [islamicTime?.time?.seconds, shouldBlink, isPrayerTime, use30sBeforeForBlink, useSyuruk10SecBlink]);

  const isPrayerTimeMode = prayerName != null;
  const isNextPrayerMode = nextPrayerTime != null;

  const getPrayerTimeValue = () => {
    if (!prayerName) return null;
    const prayerTimes = effectiveTimes;
    if (!prayerTimes) return null;
    const idx = getPrayerIndex(prayerName);
    return idx != null ? getPrayerTimeByIndex(prayerTimes, idx) : null;
  };

  const formattedTime = useMemo(() => {
    if (!isCurrentTime && prayerName && effectiveTimes) {
      const prayerTimeStr = getPrayerTimeValue();
      if (prayerTimeStr) {
        if (format === '12h') {
          const [hours, minutes] = prayerTimeStr.split(':').map(Number);
          const hours12 = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
          const formatted = `${hours12}:${minutes.toString().padStart(2, '0')}`;
          return showAmPm ? `${formatted} ${hours >= 12 ? 'PM' : 'AM'}` : formatted;
        }
        return prayerTimeStr;
      }
    }

    if (loading || !islamicTime) {
      if (nextPrayerTime) {
        if (format === '12h') {
          const [hours, minutes] = nextPrayerTime.split(':').map(Number);
          const hours12 = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
          const formatted = `${hours12}:${minutes.toString().padStart(2, '0')}`;
          return showAmPm ? `${formatted} ${hours >= 12 ? 'PM' : 'AM'}` : formatted;
        }
        return nextPrayerTime;
      }
      if (isCurrentTime) {
        const cached = getCachedCurrentTime();
        if (cached) {
          let h = cached.hours;
          let ampm = '';
          if (format === '12h') {
            h = h === 0 ? 12 : (h > 12 ? h - 12 : h);
            if (showAmPm) ampm = ` ${cached.hours >= 12 ? 'PM' : 'AM'}`;
          }
          const m = String(cached.minutes).padStart(2, '0');
          const s = String(cached.seconds ?? 0).padStart(2, '0');
          if (showSeconds) return `${h}:${m}:${s}${ampm}`;
          return `${h}:${m}${ampm}`;
        }
      }
      return '00:00';
    }

    if (nextPrayerTime) {
      if (format === '12h') {
        const [hours, minutes] = nextPrayerTime.split(':').map(Number);
        const hours12 = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
        const formatted = `${hours12}:${minutes.toString().padStart(2, '0')}`;
        return showAmPm ? `${formatted} ${hours >= 12 ? 'PM' : 'AM'}` : formatted;
      }
      return nextPrayerTime;
    }

    const { hours, minutes, seconds } = islamicTime.time;
    let hoursDisplay = hours;
    let ampmStr = '';
    if (format === '12h') {
      hoursDisplay = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
      if (showAmPm) ampmStr = ` ${hours >= 12 ? 'PM' : 'AM'}`;
    }
    const hoursStr = hoursDisplay.toString();
    const minutesStr = minutes.toString().padStart(2, '0');
    const secondsStr = seconds.toString().padStart(2, '0');
    if (showSeconds) return `${hoursStr}:${minutesStr}:${secondsStr}${ampmStr}`;
    return `${hoursStr}:${minutesStr}${ampmStr}`;
  }, [
    loading,
    islamicTime?.time?.hours,
    islamicTime?.time?.minutes,
    islamicTime?.time?.seconds,
    format,
    showSeconds,
    showAmPm,
    isCurrentTime,
    prayerName,
    nextPrayerTime,
    effectiveTimes
  ]);

  const prayerTimeValue = useMemo(() => {
    return !isCurrentTime && prayerName ? getPrayerTimeValue() : null;
  }, [isCurrentTime, prayerName, effectiveTimes]);

  const isDefaultTime = useMemo(() => {
    if (isNextPrayerMode) return !nextPrayerTime || !formattedTime || formattedTime === '';
    if (isPrayerTimeMode) return !prayerName || !formattedTime || formattedTime === '' || (prayerName && prayerTimeValue === null);
    return false;
  }, [isPrayerTimeMode, isNextPrayerMode, prayerName, nextPrayerTime, formattedTime, prayerTimeValue]);

  const displayTime = useMemo(() => {
    if (loading && !effectiveTimes && isCurrentTime) return '00:00';
    if (isDefaultTime) return '0:00';
    return formattedTime;
  }, [loading, isDefaultTime, formattedTime, effectiveTimes, isCurrentTime]);

  const effectiveIsPrayerTime = isDefaultTime ? false : isPrayerTime;
  const effectiveIsInPrayerMinute = isDefaultTime ? false : isInPrayerMinute;
  const effectiveIs30SecondsBeforePrayer = isDefaultTime ? false : (isSyuruk ? false : is30SecondsBeforePrayer);
  const effectiveIsSyurukInFirst10Sec = isDefaultTime ? false : isSyurukInFirst10Sec;
  const effectiveShouldBlink = isDefaultTime ? false : (shouldBlink || isPrayerTime || use30sBeforeForBlink || useSyuruk10SecBlink);

  const isNextPrayer =
    isPrayerTimeMode &&
    nextPrayerName &&
    prayerName?.toLowerCase() === nextPrayerName.toLowerCase();

  return {
    time: formattedTime,
    currentTime: islamicTime?.time || null,
    prayerTime: prayerTimeValue,
    blink: (shouldBlink || isPrayerTime || use30sBeforeForBlink || useSyuruk10SecBlink) ? blink : true,
    shouldBlink: shouldBlink || isPrayerTime || use30sBeforeForBlink || useSyuruk10SecBlink,
    isPrayerTime,
    isInPrayerMinute,
    is30SecondsBeforePrayer,
    loading,
    displayTime,
    effectiveIsPrayerTime,
    effectiveIsInPrayerMinute,
    effectiveIs30SecondsBeforePrayer,
    effectiveShouldBlink,
    isNextPrayer,
    effectiveIsSyurukInFirst10Sec
  };
};

export default useDisplayTime;
