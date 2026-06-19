import Caption from './Caption';
import { resolveServerImageUrl } from '../services/apiBase';

const Slide = ({ slide }) => {
  if (!slide) return null;

  const hasImage = slide.image && slide.image.src;
  const imageSrc = hasImage ? resolveServerImageUrl(slide.image.src) : null;

  const handleImageError = (e) => {
    if (!e.target.src.includes('noimage.png')) {
      e.target.src = '/img/noimage.png';
    }
  };

  return (
    <div
      {...(slide.duration ? { 'data-idle': slide.duration } : {})}
      style={!hasImage ? { backgroundColor: '#000000' } : undefined}
    >
      {hasImage && (
        <img
          u="image"
          src={imageSrc}
          alt={slide.image.alt || 'Slide'}
          onError={handleImageError}
        />
      )}
      {slide.captions && slide.captions.map((caption, index) => (
        <Caption key={index} caption={caption} />
      ))}
    </div>
  );
};

export default Slide;

