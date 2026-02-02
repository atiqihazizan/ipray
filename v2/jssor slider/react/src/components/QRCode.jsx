const QRCode = ({ config }) => {
  return (
    <img 
      u="any" 
      className="qr_code absolute opacity-50"
      src={config.src}
      alt="QR Code"
      style={{
        bottom: `${config.position.bottom}px`,
        right: `${config.position.right}px`,
        width: `${config.size.width}px`,
        height: `${config.size.height}px`
      }}
    />
  );
};

export default QRCode;

