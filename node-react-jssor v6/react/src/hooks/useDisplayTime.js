import { useState, useEffect, useMemo } from 'react';
import { useIslamicTime } from './useIslamicTime';
import { useData } from '../contexts/DataContext';

/**
 * Hook untuk DisplayTime component.
 * Masa dan format dari useIslamicTime. Tempoh amaran sebelum waktu (kelip) dari config WARNING_START_SECONDS.
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
  const warningSeconds = PRAYER_TIME_CONFIG?.WARNING_START_SECONDS ?? 30;

  const prayerState = useMemo(() => {
    if (!prayerName || !islamicTime?.time || !islamicTime?.prayer?.times) {
      return { is30SecondsBeforePrayer: false, isPrayerTime: false, isInPrayerMinute: false };
    }
    const timeStr = islamicTime.prayer.times[prayerName];
    if (!timeStr) return { is30SecondsBeforePrayer: false, isPrayerTime: false, isInPrayerMinute: false };
    const [ph, pm] = timeStr.split(':').map(Number);
    const prayerTotalSeconds = ph * 3600 + pm * 60;
    const { hours, minutes, seconds } = islamicTime.time;
    const currentTotalSeconds = hours * 3600 + minutes * 60 + seconds;
    const is30SecondsBeforePrayer = currentTotalSeconds >= prayerTotalSeconds - warningSeconds && currentTotalSeconds < prayerTotalSeconds;
    const isInPrayerMinute = currentTotalSeconds >= prayerTotalSeconds && currentTotalSeconds < prayerTotalSeconds + 60;
    const isPrayerTime = currentTotalSeconds === prayerTotalSeconds;
    return { is30SecondsBeforePrayer, isPrayerTime, isInPrayerMinute };
  }, [prayerName, warningSeconds, islamicTime?.time?.hours, islamicTime?.time?.minutes, islamicTime?.time?.seconds, islamicTime?.prayer?.times]);

  const isPrayerTime = prayerState.isPrayerTime;
  const isInPrayerMinute = prayerState.isInPrayerMinute;
  const is30SecondsBeforePrayer = prayerState.is30SecondsBeforePrayer;

  const shouldBlink = !showSeconds && isCurrentTime;

  // Kelipan titik (colon) driven oleh update masa dari event time-update (satu interval dalam useTimeDriver)
  useEffect(() => {
    if (!shouldBlink && !isPrayerTime && !is30SecondsBeforePrayer) {
      setBlink(true);
      return;
    }
    if (islamicTime?.time != null) setBlink((prev) => !prev);
  }, [islamicTime?.time?.seconds, shouldBlink, isPrayerTime, is30SecondsBeforePrayer]);

  const isPrayerTimeMode = prayerName != null;
  const isNextPrayerMode = nextPrayerTime != null;

  const getPrayerTimeValue = () => {
    if (!islamicTime || !prayerName) return null;
    const prayerTimes = islamicTime.prayer?.times;
    const prayerMap = {
      Imsak: prayerTimes?.Imsak,
      Subuh: prayerTimes?.Subuh,
      Syuruk: prayerTimes?.Syuruk,
      Zohor: prayerTimes?.Zohor,
      Asar: prayerTimes?.Asar,
      Maghrib: prayerTimes?.Maghrib,
      Isyak: prayerTimes?.Isyak
    };
    return prayerMap[prayerName] || null;
  };

  const formattedTime = useMemo(() => {
    if (loading || !islamicTime) return '00:00';

    if (nextPrayerTime) {
      if (format === '12h') {
        const [hours, minutes] = nextPrayerTime.split(':').map(Number);
        const hours12 = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
        const formatted = `${hours12}:${minutes.toString().padStart(2, '0')}`;
        return showAmPm ? `${formatted} ${hours >= 12 ? 'PM' : 'AM'}` : formatted;
      }
      return nextPrayerTime;
    }

    if (!isCurrentTime && prayerName) {
      const prayerTimeStr = getPrayerTimeValue();
      if (!prayerTimeStr) return '0:00';
      if (format === '12h') {
        const [hours, minutes] = prayerTimeStr.split(':').map(Number);
        const hours12 = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
        const formatted = `${hours12}:${minutes.toString().padStart(2, '0')}`;
        return showAmPm ? `${formatted} ${hours >= 12 ? 'PM' : 'AM'}` : formatted;
      }
      return prayerTimeStr;
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
    islamicTime?.prayer?.times
  ]);

  const prayerTimeValue = useMemo(() => {
    return !isCurrentTime && prayerName ? getPrayerTimeValue() : null;
  }, [isCurrentTime, prayerName, islamicTime?.prayer?.times]);

  const isDefaultTime = useMemo(() => {
    return (
      (isPrayerTimeMode && (!prayerName || !formattedTime || formattedTime === '' || (prayerName && prayerTimeValue === null))) ||
      (isNextPrayerMode && (!nextPrayerTime || !formattedTime || formattedTime === ''))
    );
  }, [isPrayerTimeMode, isNextPrayerMode, prayerName, nextPrayerTime, formattedTime, prayerTimeValue]);

  const displayTime = useMemo(() => {
    if (loading) return '00:00';
    if (isDefaultTime) return '0:00';
    return formattedTime;
  }, [loading, isDefaultTime, formattedTime]);

  const effectiveIsPrayerTime = isDefaultTime ? false : isPrayerTime;
  const effectiveIsInPrayerMinute = isDefaultTime ? false : isInPrayerMinute;
  const effectiveIs30SecondsBeforePrayer = isDefaultTime ? false : is30SecondsBeforePrayer;
  const effectiveShouldBlink = isDefaultTime ? false : (shouldBlink || isPrayerTime || is30SecondsBeforePrayer);

  const isNextPrayer =
    isPrayerTimeMode &&
    nextPrayerName &&
    prayerName?.toLowerCase() === nextPrayerName.toLowerCase();

  return {
    time: formattedTime,
    currentTime: islamicTime?.time || null,
    prayerTime: prayerTimeValue,
    blink: shouldBlink || isPrayerTime || is30SecondsBeforePrayer ? blink : true,
    shouldBlink: shouldBlink || isPrayerTime || is30SecondsBeforePrayer,
    isPrayerTime,
    isInPrayerMinute,
    is30SecondsBeforePrayer,
    loading,
    displayTime,
    effectiveIsPrayerTime,
    effectiveIsInPrayerMinute,
    effectiveIs30SecondsBeforePrayer,
    effectiveShouldBlink,
    isNextPrayer
  };
};

export default useDisplayTime;
