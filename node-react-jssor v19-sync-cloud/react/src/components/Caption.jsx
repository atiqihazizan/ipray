import DisplayTime from './DisplayTime';
import { DEFAULT_PENCERAMAH_IMAGE, getCenteredImageStyle } from '../utils/kuliahHelpers';

const Caption = ({ caption }) => {
  const getStyle = () => {
    const baseStyle = {
      position: 'absolute',
      ...caption.style
    };
    
    if (caption.style.fontSize) {
      baseStyle.fontSize = `${caption.style.fontSize}px`;
    }
    if (caption.style.lineHeight) {
      baseStyle.lineHeight = `${caption.style.lineHeight}px`;
    }
    if (caption.style.color) {
      baseStyle.color = caption.style.color;
    }
    if (caption.textAlign) {
      baseStyle.textAlign = caption.textAlign;
    }
    if (caption.style.backgroundPosition) {
      baseStyle.backgroundPosition = caption.style.backgroundPosition;
    }
    
    return baseStyle;
  };

  const getAttributes = () => {
    const attrs = { u: "caption" };
    if (caption.transition) attrs.t = caption.transition;
    if (caption.transition2) attrs.t2 = caption.transition2;
    if (caption.delay) attrs.d = caption.delay.toString();
    if (caption.duration) attrs.du = caption.duration.toString();
    return attrs;
  };

  const getClassName = () => {
    let className = caption.className || "";
    if (caption.isIcon) {
      className += " bricon";
    }
    return className.trim();
  };

  const styleObj = getStyle();
  const className = getClassName();
  const attrs = getAttributes();

  if (caption.type === "masa") {
    return (
      <DisplayTime 
        size={caption.size || 72}
        format={caption.format || '24h'}
        showSeconds={caption.showSeconds !== undefined ? caption.showSeconds : true}
        showAmPm={caption.showAmPm !== undefined ? caption.showAmPm : true}
        isCurrentTime={caption.isCurrentTime !== undefined ? caption.isCurrentTime : true}
        color={caption.color || caption.style?.color || '#FFD700'}
        transition={caption.transition}
        transition2={caption.transition2}
        delay={caption.delay}
        duration={caption.duration}
        style={styleObj}
        className={className}
        textAlign={caption.textAlign}
        label={caption.label}
        labelSize={caption.labelSize}
        labelColor={caption.labelColor}
      />
    );
  }

  if (caption.type === "link") {
    return (
      <a
        {...attrs}
        className={className}
        style={styleObj}
        href={caption.href}
        target={caption.target || "_blank"}
        rel={caption.rel || "noopener noreferrer"}
        dangerouslySetInnerHTML={{ __html: caption.content }}
      />
    );
  }

  if (caption.type === "image" || caption.type === "img") {
    let imageSrc = caption.content || caption.src || DEFAULT_PENCERAMAH_IMAGE;
    
    // Tambah cache-busting untuk images yang bukan default (untuk force reload selepas upload)
    if (imageSrc && imageSrc !== DEFAULT_PENCERAMAH_IMAGE && !imageSrc.includes('Random_user.svg')) {
      // Tambah timestamp query parameter untuk cache-bust jika belum ada
      if (!imageSrc.includes('?t=')) {
        const separator = imageSrc.includes('?') ? '&' : '?';
        imageSrc = `${imageSrc}${separator}t=${Date.now()}`;
      }
    }
    
    const handleImageError = (e) => {
      // Jika image error, guna default person vector
      if (e.target.src !== DEFAULT_PENCERAMAH_IMAGE) {
        e.target.src = DEFAULT_PENCERAMAH_IMAGE;
      }
    };
    
    // Center image jika default image menggunakan utility function
    const imageStyle = getCenteredImageStyle(caption.content || caption.src || DEFAULT_PENCERAMAH_IMAGE, styleObj);
    
    return (
      <img
        {...attrs}
        src={imageSrc}
        alt={caption.alt || "Image"}
        className={className}
        style={imageStyle}
        onError={handleImageError}
      />
    );
  }

  // Jika ada children (nested captions), render sebagai parent dengan children
  if (caption.children && Array.isArray(caption.children)) {
    return (
      <div
        {...attrs}
        className={className}
        style={styleObj}
      >
        {caption.children.map((child, index) => (
          <Caption key={index} caption={child} />
        ))}
      </div>
    );
  }

  return (
    <div
      {...attrs}
      className={className}
      style={styleObj}
      dangerouslySetInnerHTML={{ __html: caption.content }}
    />
  );
};

export default Caption;

