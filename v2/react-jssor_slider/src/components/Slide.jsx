import Caption from './Caption';

const Slide = ({ slide }) => {
  // Tambah cache-busting untuk slide background images (untuk force reload selepas upload)
  let imageSrc = slide.image.src;
  if (imageSrc && !imageSrc.includes('Random_user.svg') && !imageSrc.includes('?t=')) {
    const separator = imageSrc.includes('?') ? '&' : '?';
    imageSrc = `${imageSrc}${separator}t=${Date.now()}`;
  }
  
  return (
    <div {...(slide.duration ? { 'data-idle': slide.duration } : {})}>
      <img u="image" src={imageSrc} alt={slide.image.alt} />
      {slide.captions.map((caption, index) => (
        <Caption key={index} caption={caption} />
      ))}
    </div>
  );
};

export default Slide;

