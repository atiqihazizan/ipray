import Caption from './Caption';

const Slide = ({ slide }) => {
  // Safety check untuk ensure slide and image exist
  if (!slide || !slide.image || !slide.image.src) {
    return null;
  }

  // Guna src as-is supaya browser boleh cache; elak Date.now() pada setiap render (sebab load imej terlalu kerap)
  const imageSrc = slide.image.src;

  // Handler jika image gagal load (404, network error, etc)
  const handleImageError = (e) => {
    // Jangan set noimage jika sudah noimage (avoid infinite loop)
    if (!e.target.src.includes('noimage.png')) {
      e.target.src = '/img/noimage.png';
    }
  };
  
  return (
    <div {...(slide.duration ? { 'data-idle': slide.duration } : {})}>
      <img 
        u="image" 
        src={imageSrc} 
        alt={slide.image.alt || 'Slide'} 
        onError={handleImageError}
      />
      {slide.captions && slide.captions.map((caption, index) => (
        <Caption key={index} caption={caption} />
      ))}
    </div>
  );
};

export default Slide;

