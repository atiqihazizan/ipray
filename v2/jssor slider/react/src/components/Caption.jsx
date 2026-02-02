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

  if (caption.type === "image") {
    return (
      <img
        {...attrs}
        src={caption.src}
        alt={caption.alt}
        className={className}
        style={styleObj}
      />
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

