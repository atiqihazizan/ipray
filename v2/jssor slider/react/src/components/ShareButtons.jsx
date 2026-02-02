const ShareButtons = ({ config }) => {
  return (
    <div 
      u="any" 
      className="absolute z-10"
      style={{ top: `${config.position.top}px`, right: `${config.position.right}px`, width: '280px', height: '40px' }}
    >
      {config.buttons.map((button, index) => (
        <a
          key={index}
          className={`share-icon share-${button.type}`}
          target="_blank"
          rel="noopener noreferrer"
          href={button.url}
          title={button.title}
        ></a>
      ))}
    </div>
  );
};

export default ShareButtons;

