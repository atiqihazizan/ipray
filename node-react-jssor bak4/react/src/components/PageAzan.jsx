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

const PageAzan = () => (
  <div style={fullScreenStyle}>
    <h1 style={titleStyle}>TELAH MASUKNYA WAKTU SOLAT</h1>
  </div>
);

export default PageAzan;
