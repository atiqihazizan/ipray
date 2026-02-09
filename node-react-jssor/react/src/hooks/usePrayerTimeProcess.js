import { useEffect, useRef } from 'react';
import { getCurrentIslamicTime } from '../utils/islamicTimeUtils';
import { useTakwimData } from './useTakwimData';
import { useData } from '../contexts/DataContext';
import audioService from '../services/audioService';

const ACTIVE_PRAYERS = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];

/**
 * Hook untuk trigger beep apabila masuk waktu solat.
 * Guna dalam komponen yang berada dalam DataProvider (untuk takwim + config).
 *
 * Proses:
 * - Check setiap saat jika masa semasa sama dengan waktu solat dan saat = 00
 * - Trigger beep mengikut BEEP_COUNT dari config
 * - Beep hanya trigger sekali pada saat 00, tidak berulang selepas saat > 00
 */
export function usePrayerTimeProcess() {
  const { takwimParsed } = useTakwimData();
  const { PRAYER_TIME_CONFIG } = useData();

  // Track solat yang sudah trigger beep untuk elak berulang
  const prayerBeepTriggeredRef = useRef({});

  useEffect(() => {
    if (!takwimParsed?.wdata || !PRAYER_TIME_CONFIG) return;

    const check = () => {
      try {
        const islamicTime = getCurrentIslamicTime({
          hdata: takwimParsed.hdata,
          wdata: takwimParsed.wdata
        });
        if (!islamicTime?.prayer?.times) return;

        const { time: currentTime, prayer: { times: prayerTimes } } = islamicTime;
        const currentSeconds = currentTime.seconds;

        // Hanya check pada saat 00
        if (currentSeconds !== 0) {
          return;
        }

        // Check setiap solat
        for (const name of ACTIVE_PRAYERS) {
          const timeStr = prayerTimes[name];
          if (!timeStr) continue;

          const [prayerHours, prayerMinutes] = timeStr.split(':').map(Number);
          
          // Check jika masa semasa sama dengan waktu solat (jam dan minit)
          const isPrayerTime = currentTime.hours === prayerHours && currentTime.minutes === prayerMinutes;
          
          if (isPrayerTime) {
            // Buat key unik untuk solat ini pada hari ini
            const todayKey = `${name}-${new Date().toDateString()}`;
            
            // Check jika sudah trigger beep untuk solat ini hari ini
            if (!prayerBeepTriggeredRef.current[todayKey]) {
              // Trigger beep
              const beepCount = PRAYER_TIME_CONFIG?.BEEP_COUNT ?? 5;
              if (beepCount > 0) {
                if (audioService.getIsPlaying()) audioService.stop();
                audioService.play({ volume: 1, playCount: beepCount }).catch(() => {});
              }
              
              // Mark sebagai sudah trigger
              prayerBeepTriggeredRef.current[todayKey] = true;
            }
          } else {
            // Jika bukan waktu solat lagi, reset flag untuk solat ini
            // (supaya boleh trigger lagi esok atau bila masuk waktu lain)
            const todayKey = `${name}-${new Date().toDateString()}`;
            // Reset hanya jika sudah lepas waktu solat (current time > prayer time)
            const currentTimeMinutes = currentTime.hours * 60 + currentTime.minutes;
            const prayerTimeMinutes = prayerHours * 60 + prayerMinutes;
            
            // Jika sudah lepas waktu solat (lebih dari 1 minit), reset flag
            if (currentTimeMinutes > prayerTimeMinutes + 1) {
              delete prayerBeepTriggeredRef.current[todayKey];
            }
          }
        }
      } catch (e) {
        // ignore
      }
    };

    check();
    const intervalId = setInterval(check, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [takwimParsed, PRAYER_TIME_CONFIG]);
}
