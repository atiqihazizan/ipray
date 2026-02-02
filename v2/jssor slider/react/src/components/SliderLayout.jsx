import LoadingScreen from './LoadingScreen';
import SlidesContainer from './SlidesContainer';
import Navigator from './Navigator';
import ShareButtons from './ShareButtons';
import QRCode from './QRCode';

const SliderLayout = ({ config, slides, containerRef }) => {
  return (
    <>
      <div 
        id={config.container.id} 
        ref={containerRef} 
        className="relative w-full max-w-[980px] h-[551px] overflow-hidden"
        // className="relative w-full overflow-hidden mx-auto"
        // style={{
        //   maxWidth: config.container.maxWidth ? `${config.container.maxWidth}px` : '100%',
        //   height: `${config.container.height}px`
        // }}
      >
      {config.loading.enabled && <LoadingScreen config={config.loading} />}
      <SlidesContainer slides={slides} config={config} />
      {/* {config.navigator.bullet.enabled && <Navigator type="bullet" config={config.navigator.bullet} />} */}
      {/* {config.navigator.arrow.enabled && <Navigator type="arrow" config={config.navigator.arrow} />} */}
      {config.shareButtons.enabled && <ShareButtons config={config.shareButtons} />}
      {/* {config.qrCode.enabled && <QRCode config={config.qrCode} />} */}
      </div>
    </>
  );
};

export default SliderLayout;

