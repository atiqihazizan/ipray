const LoadingScreen = () => {
  return (
    <div 
      u="loading" 
      className="fixed top-0 left-0 w-full h-full z-50 flex items-center justify-center"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <div className="relative">
        {/* Spinner */}
        <div 
          className="rounded-full animate-spin"
          style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #3b82f6',
            borderRight: '4px solid #3b82f6'
          }}
        ></div>
      </div>
    </div>
  );
};

export default LoadingScreen;

