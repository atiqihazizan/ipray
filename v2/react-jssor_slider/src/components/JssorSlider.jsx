import { useEffect, useState, useCallback, useRef } from 'react';
import '../styles/jssor.css';
import { sliderConfig } from '../config/sliderConfig';
import SliderLayout from './SliderLayout';
import { useJssorSlider } from '../hooks/useJssorSlider';
import { useSlides } from '../hooks/useSlides';
import { useTakwimData } from '../hooks/useTakwimData';
import { useData } from '../contexts/DataContext';
import { getCurrentIslamicTime } from '../utils/islamicTimeUtils';

const JssorSlider = ({ onReady }) => {
  const { slideData, loading: slidesLoading } = useSlides();
  const { takwimArray, takwimParsed, loading: takwimLoading } = useTakwimData(); // Process takwim di component level
  const { PRAYER_TIME_CONFIG, isReloading } = useData(); // Get prayer time config & reload status
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const lastPrayerCheckRef = useRef(null);
  const holdTimerRef = useRef(null);
  const wasPlayingRef = useRef(true); // Track slider playing state

  // Callback untuk transition events
  const handleTransitionStart = useCallback((toIndex, fromIndex) => {
    setIsTransitioning(true);
  }, []);

  const handleTransitionEnd = useCallback((toIndex, fromIndex) => {
    setIsTransitioning(false);
    setCurrentSlideIndex(toIndex);
  }, []);

  const { sliderContainerRef, loading: sliderLoading, sliderRef } = useJssorSlider(slideData, {
    onTransitionStart: handleTransitionStart,
    onTransitionEnd: handleTransitionEnd
  });

  useEffect(() => {
    if (sliderLoading || !sliderRef?.current) return;
    
    // Check if slider instance is valid before using
    const s = sliderRef.current;
    if (!s || typeof s.$CurrentIndex !== 'function') return;
    
    try {
      const idx = s.$CurrentIndex();
      if (idx >= 0) setCurrentSlideIndex(idx);
      // Listener untuk EVT_PARK (203) sebagai backup
      if (typeof s.$On === 'function') {
        s.$On(203, (slideIndex) => {
          setCurrentSlideIndex(slideIndex);
          setIsTransitioning(false);
        });
      }
    } catch (error) {
      // Ignore access errors
    }
  }, [sliderLoading, sliderRef]);

  // Notify parent apabila slider dan slides siap init
  useEffect(() => {
    if (!sliderLoading && !slidesLoading && !takwimLoading && takwimArray && slideData && onReady) {
      // Tunggu sedikit untuk memastikan slider benar-benar siap render
      const timer = setTimeout(() => {
        onReady();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [sliderLoading, slidesLoading, takwimLoading, takwimArray, slideData, onReady]);

  // Pause slider during data reload untuk elak $TriggerEvent errors
  useEffect(() => {
    if (!sliderRef?.current) return;
    
    const slider = sliderRef.current;
    
    // Validate slider instance
    if (typeof slider.$IsDragging !== 'function' || 
        typeof slider.$Pause !== 'function' || 
        typeof slider.$Play !== 'function') {
      return;
    }
    
    try {
      if (isReloading) {
        // Pause slider bila reload start
        wasPlayingRef.current = !slider.$IsDragging(); // Save playing state
        slider.$Pause();
      } else if (wasPlayingRef.current) {
        // Resume slider bila reload complete (jika previously playing)
        // Small delay untuk ensure DOM ready
        setTimeout(() => {
          if (sliderRef.current && typeof sliderRef.current.$Play === 'function') {
            try {
              sliderRef.current.$Play();
            } catch (error) {
              // Ignore errors - slider might be in transition
            }
          }
        }, 50);
      }
    } catch (error) {
      // Ignore errors during reload - slider might be in transition
    }
  }, [isReloading, sliderRef]);

  // Cleanup hold timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
  }, []);

  // Auto-jump ke home slide pada WARNING (30 saat sebelum waktu solat)
  // Kekal di slide 0 sehingga masuk waktu solat + HOLD_DURATION
  // Menggunakan setInterval secara langsung tanpa useIslamicTime untuk elak re-render component
  useEffect(() => {
    if (!takwimParsed || !sliderRef?.current) return;
    
    const checkPrayerTime = () => {
      try {
        // Get current time menggunakan utility function (tanpa trigger re-render)
        const islamicTime = getCurrentIslamicTime({
          hdata: takwimParsed.hdata,
          wdata: takwimParsed.wdata
        });
        
        if (!islamicTime?.prayer?.times) return;
        
        const currentTime = islamicTime.time;
        const prayerTimes = islamicTime.prayer.times;
        
        // Array waktu solat (kecuali Imsak dan Syuruk - tidak trigger audio)
        const activePrayers = [
          { name: 'Subuh', time: prayerTimes.Subuh },
          { name: 'Zohor', time: prayerTimes.Zohor },
          { name: 'Asar', time: prayerTimes.Asar },
          { name: 'Maghrib', time: prayerTimes.Maghrib },
          { name: 'Isyak', time: prayerTimes.Isyak }
        ];
        
        const now = new Date();
        now.setHours(currentTime.hours, currentTime.minutes, currentTime.seconds, 0);
        
        // Check untuk setiap waktu solat
        for (const prayer of activePrayers) {
          if (!prayer.time) continue;
          
          const [prayerHours, prayerMinutes] = prayer.time.split(':').map(Number);
          const prayerDate = new Date();
          prayerDate.setHours(prayerHours, prayerMinutes, 0, 0);

          const diffMs = prayerDate.getTime() - now.getTime();
          const diffSeconds = Math.floor(diffMs / 1000);
          const warningSecs = PRAYER_TIME_CONFIG.WARNING_START_SECONDS;
          const holdMs = PRAYER_TIME_CONFIG.HOLD_DURATION;
          const holdSecs = Math.floor(holdMs / 1000);

          // Check jika masa sekarang dalam lingkungan warning hingga tamat hold
          // Fasa aktif: dari WARNING_START_SECONDS sebelum waktu solat hingga HOLD_DURATION selepas waktu solat
          if (diffSeconds <= warningSecs && diffSeconds >= -holdSecs) {
            const triggerKey = `${prayer.name}-${prayer.time}-${prayerDate.toDateString()}`;
            
            // Elak trigger berulang untuk waktu solat yang sama
            if (lastPrayerCheckRef.current !== triggerKey) {
              // Check if slider instance is valid before using
              if (!sliderRef.current || 
                  typeof sliderRef.current.$CurrentIndex !== 'function' ||
                  typeof sliderRef.current.$GoTo !== 'function') {
                return;
              }
              
              try {
                // Jump ke home jika current slide bukan home (index 0)
                const currentIdx = sliderRef.current.$CurrentIndex();
                
                if (currentIdx !== 0 && typeof sliderRef.current.$GoTo === 'function') {
                  sliderRef.current.$GoTo(0);
                }
                
                // Pause slider untuk hold di home
                if (typeof sliderRef.current.$Pause === 'function') {
                  sliderRef.current.$Pause();
                }
              } catch (error) {
                // Ignore prayer time control errors
                return;
              }

              lastPrayerCheckRef.current = triggerKey;
              
              // Clear timer lama jika ada
              if (holdTimerRef.current) {
                clearTimeout(holdTimerRef.current);
              }
              
              // Kira baki hold dari sekarang hingga tamat (waktu solat + HOLD_DURATION)
              const remainingHoldTime = Math.max(diffMs + holdMs, 0);
              
              // Resume slider selepas baki hold time
              holdTimerRef.current = setTimeout(() => {
                if (sliderRef.current && 
                    typeof sliderRef.current.$Play === 'function') {
                  try {
                    sliderRef.current.$Play();
                  } catch (error) {
                    // Ignore resume errors
                  }
                }
                holdTimerRef.current = null;
              }, remainingHoldTime);
            }
            break; // Hanya process satu waktu solat
          }
        }
      } catch (error) {
        // Ignore errors - component tidak perlu re-render
      }
    };
    
    // Check immediately
    checkPrayerTime();
    
    // Setup interval untuk check setiap saat (tanpa trigger re-render component)
    const intervalId = setInterval(checkPrayerTime, 1000);
    
    return () => {
      clearInterval(intervalId);
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
  }, [takwimParsed, sliderRef, PRAYER_TIME_CONFIG.HOLD_DURATION, PRAYER_TIME_CONFIG.WARNING_START_SECONDS]);

  return (
    <SliderLayout
      config={sliderConfig}
      slides={slideData}
      containerRef={sliderContainerRef}
      currentSlideIndex={currentSlideIndex}
      isTransitioning={isTransitioning}
    />
  );
};

export default JssorSlider;
