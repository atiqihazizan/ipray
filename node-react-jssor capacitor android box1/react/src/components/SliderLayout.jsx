import { useEffect } from "react";
import SlidesLayout from "./SlidesLayout";
import audioService from "../services/audioService";
import { sliderConfig } from "../config/sliderConfig";
import { dispatchSlideChanged } from "../utils/timeEvents";

const SliderLayout = ({
  config,
  slides,
  containerRef,
  currentSlideIndex = 0,
  isTransitioning = false,
}) => {
  useEffect(() => {
    dispatchSlideChanged(slides[currentSlideIndex]?.datetime ?? null);
  }, [currentSlideIndex, slides]);

  useEffect(() => {
    let hasUnlocked = false;

    const unlock = async () => {
      if (hasUnlocked) return;
      hasUnlocked = true;
      try {
        await audioService.enableAudio();
      } catch (err) {
        hasUnlocked = false;
      }
    };

    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
    window.addEventListener("keydown", unlock);

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return (
    <div
      id={config.container.id}
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        width: "100%",
        height: "100%",
        maxWidth: "100%",
        maxHeight: "100%",
      }}
    >
      <SlidesLayout slides={slides} config={config} />
    </div>
  );
};

export default SliderLayout;
