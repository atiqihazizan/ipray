import { useEffect } from "react";
import SlidesLayout from "./SlidesLayout";
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


  return (
    <div
      id={config.container.id}
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        width: `${sliderConfig.container.width}px`,
        height: `${sliderConfig.container.height}px`,
        maxWidth: "100%",
        maxHeight: "100%",
      }}
    >
      <SlidesLayout slides={slides} config={config} />
    </div>
  );
};

export default SliderLayout;
