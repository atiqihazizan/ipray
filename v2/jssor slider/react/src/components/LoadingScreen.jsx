const LoadingScreen = ({ config }) => {
  return (
    <div u="loading" className="absolute top-0 left-0 w-full h-full">
      <div className="absolute top-0 left-0 w-full h-full bg-black opacity-70"></div>
      <div 
        className="absolute top-0 left-0 w-full h-full bg-no-repeat bg-center"
        style={{ backgroundImage: `url(${config.image})` }}
      ></div>
    </div>
  );
};

export default LoadingScreen;

