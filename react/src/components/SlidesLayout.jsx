import Slide from './Slide';

const SlidesLayout = ({ slides, config }) => {
  return (
    <>
      <div 
        u="slides" 
        className="absolute left-0 top-0 w-full h-full overflow-hidden cursor-move"
      >
        {slides.map((slide,index) => (
          <Slide key={index} slide={slide}/>
        ))}
      </div>
    </>
  );
};

export default SlidesLayout;

