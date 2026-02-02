import Caption from './Caption';

const Slide = ({ slide }) => {
  return (
    <div>
      <img u="image" src={slide.image.src} alt={slide.image.alt} />
      {slide.captions.map((caption, index) => (
        <Caption key={index} caption={caption} />
      ))}
    </div>
  );
};

export default Slide;

