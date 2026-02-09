const fullScreenStyle = {
  width: '100vw',
  height: '100vh',
  backgroundColor: '#000000',
  backgroundImage: 'url(/img/bg-page4.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  margin: 0,
  padding: 0,
  position: 'fixed',
  top: 0,
  left: 0,
  zIndex: 9999
};

const titleStyle = {
  color: '#FFFFFF',
  fontSize: '150px',
  fontFamily: "'Anton', sans-serif",
  fontWeight: 'normal',
  textAlign: 'center',
  margin: 0,
  padding: 0,
  lineHeight: '1.2'
};

const subtitleStyle = {
  color: '#FFFFFF',
  fontSize: '26px',
  fontFamily: "'Roboto', sans-serif",
  fontWeight: 'normal',
  textAlign: 'center',
  margin: '20px 0 0 0',
  padding: 0,
  lineHeight: '1.4',
  maxWidth: '90vw'
};

const PageIqamah = () => (
  <div style={fullScreenStyle}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1 style={titleStyle}>IQAMAH</h1>
      <p style={subtitleStyle}>Diminta para hadirin bersiap untuk mendirikan solat.</p>
    </div>
  </div>
);

export default PageIqamah;
