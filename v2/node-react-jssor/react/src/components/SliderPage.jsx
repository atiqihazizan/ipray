import { useEffect, useState, useCallback, useRef } from 'react';
import '../styles/jssor.css';
import { sliderConfig } from '../config/sliderConfig';
import SliderLayout from './SliderLayout';
import { useJssorSlider } from '../hooks/useJssorSlider';
import { useSlides } from '../hooks/useSlides';
import { useTakwimData } from '../hooks/useTakwimData';
import { useData } from '../contexts/DataContext';

const SliderPage = ({ onReady }) => {
  const { slideData, loading: slidesLoading } = useSlides();
  const { takwimArray, loading: takwimLoading } = useTakwimData();
  const { isReloading } = useData();
  const sliderState = { shouldHold: false, shouldGoToHome: false, resumeAtMs: null };
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const wasPlayingRef = useRef(true);
  const resumeTimerRef = useRef(null);

  const handleTransitionStart = useCallback((toIndex, fromIndex) => {
    setIsTransitioning(true);
  }, []);

  const handleTransitionEnd = useCallback((toIndex, fromIndex) => {
    setIsTransitioning(false);
    setCurrentSlideIndex(toIndex);
  }, []);

  const { sliderContainerRef, loading: sliderLoading, sliderRef } = useJssorSlider(slideData, {
    onTransitionStart: handleTransitionStart,
    onTransitionEnd: handleTransitionEnd,
    dataReady: !slidesLoading // Init slider hanya bila data slide siap; elak init dua kali (reload slide0)
  });

  useEffect(() => {
    if (sliderLoading || !sliderRef?.current) return;
    const s = sliderRef.current;
    if (!s || typeof s.$CurrentIndex !== 'function') return;
    try {
      const idx = s.$CurrentIndex();
      if (idx >= 0) setCurrentSlideIndex(idx);
      if (typeof s.$On === 'function') {
        s.$On(203, (slideIndex) => {
          setCurrentSlideIndex(slideIndex);
          setIsTransitioning(false);
        });
      }
    } catch (error) {
      // Ignore
    }
  }, [sliderLoading, sliderRef]);

  useEffect(() => {
    if (!sliderLoading && !slidesLoading && !takwimLoading && takwimArray && slideData && onReady) {
      const timer = setTimeout(() => onReady(), 100);
      return () => clearTimeout(timer);
    }
  }, [sliderLoading, slidesLoading, takwimLoading, takwimArray, slideData, onReady]);

  useEffect(() => {
    if (!sliderRef?.current) return;
    const slider = sliderRef.current;
    if (typeof slider.$CurrentIndex !== 'function' || typeof slider.$GoTo !== 'function' || typeof slider.$Pause !== 'function' || typeof slider.$Play !== 'function') return;

    const { shouldHold, shouldGoToHome, resumeAtMs } = sliderState;

    if (shouldHold && shouldGoToHome) {
      try {
        if (slider.$CurrentIndex() !== 0 && typeof slider.$GoTo === 'function') slider.$GoTo(0);
        if (typeof slider.$Pause === 'function') slider.$Pause();
      } catch (e) {
        // Ignore
      }
      if (resumeAtMs != null && resumeAtMs > 0 && resumeTimerRef.current === null) {
        resumeTimerRef.current = setTimeout(() => {
          resumeTimerRef.current = null;
          if (sliderRef.current && typeof sliderRef.current.$Play === 'function') {
            try {
              sliderRef.current.$Play();
            } catch (e) {}
          }
        }, resumeAtMs);
      }
    } else {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
      if (!sliderRef.current) return;
      try {
        if (typeof sliderRef.current.$Play === 'function') sliderRef.current.$Play();
      } catch (e) {}
    }
  }, [sliderState, sliderRef]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!sliderRef?.current) return;
    const slider = sliderRef.current;
    if (typeof slider.$IsDragging !== 'function' || typeof slider.$Pause !== 'function' || typeof slider.$Play !== 'function') return;
    try {
      if (isReloading) {
        wasPlayingRef.current = !slider.$IsDragging();
        slider.$Pause();
      } else if (wasPlayingRef.current && !sliderState.shouldHold) {
        setTimeout(() => {
          if (sliderRef.current && typeof sliderRef.current.$Play === 'function') {
            try {
              sliderRef.current.$Play();
            } catch (e) {}
          }
        }, 50);
      }
    } catch (error) {}
  }, [isReloading, sliderRef, sliderState.shouldHold]);

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

export default SliderPage;
