import Slide from './Slide';

const SlidesContainer = ({ slides, config }) => {
  return (
    <>
      {/* Old className: "absolute left-0 top-0 w-[980px] h-[380px] overflow-hidden cursor-move" */}
      <div 
        u="slides" 
        className="absolute left-0 top-0 w-full h-full overflow-hidden cursor-move"
      >
        {slides.map((slide) => (
          <Slide key={slide.id} slide={slide} />
        ))}
      </div>
    </>
  );
};

export default SlidesContainer;

