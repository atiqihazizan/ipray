const Navigator = ({ type, config }) => {
  if (type === "bullet") {
    return (
      <div u="navigator" className="jssorb03 absolute bottom-4 right-[6px]">
        <div u="prototype">
          <div u="numbertemplate"></div>
        </div>
      </div>
    );
  }

  if (type === "arrow") {
    return (
      <>
        <span 
          u="arrowleft" 
          className="jssora20l absolute"
          style={{ top: `${config.position.top}px`, left: `${config.position.left}px` }}
        ></span>
        <span 
          u="arrowright" 
          className="jssora20r absolute"
          style={{ top: `${config.position.top}px`, right: `${config.position.right}px` }}
        ></span>
      </>
    );
  }

  return null;
};

export default Navigator;

