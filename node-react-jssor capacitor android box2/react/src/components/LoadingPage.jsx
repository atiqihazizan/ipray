import { slidesTemplate } from '../config/sliderConfig';
import { HOME_SLIDE_BACKGROUND } from '../config/mosqueInfo';
import { resolveServerImageUrl } from '../services/apiBase';

const LoadingPage = () => {
  const bgSrc = resolveServerImageUrl(
    slidesTemplate.home?.image?.src || HOME_SLIDE_BACKGROUND
  );
  const containerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    backgroundImage: `url(${bgSrc})`,
    backgroundSize: '100% 100%',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  };
  return (
    <div u="loading" style={containerStyle}>
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

export default LoadingPage;

