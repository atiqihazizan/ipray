import { useEffect } from 'react';
import SlidesLayout from './SlidesLayout';
import DateTimeOverlay from './DateTimeOverlay';
import audioService from '../services/audioService';
import { sliderConfig } from '../config/sliderConfig';

// datetime: array dalam template slide, e.g. ['date','solat','time']. Nilai: date=tarikh, solat=waktu solat, time=masa semasa. Jika kunci ada dalam datetime → overlay show.
const SliderLayout = ({ config, slides, containerRef, currentSlideIndex = 0, isTransitioning = false }) => {
  const dt = slides[currentSlideIndex]?.datetime;
  const showOverlay = (key) => {
    // Hide semua overlay semasa transition
    if (isTransitioning) return false;
    if (dt == null) return true; // tiada datetime = show (backward compat)
    return Array.isArray(dt) && dt.includes(key);
  };

  // Unlock audio (autoplay policy): mesti ada interaksi user dahulu.
  // Ini akan cuba enable audio sekali sahaja bila user klik/sentuh/tekan kekunci.
  useEffect(() => {
    let hasUnlocked = false;

    const unlock = async () => {
      if (hasUnlocked) return;
      hasUnlocked = true;
      try {
        await audioService.enableAudio();
      } catch (err) {
        // NotAllowedError masih boleh berlaku jika browser block; biarkan user cuba lagi dengan interaksi seterusnya.
        hasUnlocked = false;
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock);

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return (
    <>
      {/* Container slider: MESTI ada width/height dalam pixel untuk Jssor initialization */}
      {/* Jssor akan auto-scale berdasarkan parent width (100vw) melalui $ScaleWidth() */}
      <div 
        id={config.container.id} 
        ref={containerRef} 
        className="relative overflow-hidden" 
        style={{ 
          width: `${sliderConfig.container.width}px`, 
          height: `${sliderConfig.container.height}px`,
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      >
        <SlidesLayout slides={slides} config={config} />
        <DateTimeOverlay showOverlay={showOverlay} />
      </div>
    </>
  );
};

export default SliderLayout;

