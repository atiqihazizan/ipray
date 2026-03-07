export const bgStyle = {
  width: '100vw',
  height: '100vh',
  backgroundImage: 'url(/img/bg-page4.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'fixed',
  top: 0,
  left: 0,
  zIndex: 9999,
};

export const bgSolatStyle = {
  ...bgStyle,
  backgroundImage: 'none',
  backgroundColor: '#000000',
};

export const titleStyle = {
  color: '#FFFFFF',
  fontSize: '120px',
  fontFamily: "'Anton', sans-serif",
  fontWeight: 'normal',
  textAlign: 'center',
  margin: 0,
  lineHeight: 1.2,
};

export const countdownStyle = {
  color: '#FFFFFF',
  fontSize: '80px',
  fontFamily: "'Roboto Mono', monospace",
  fontWeight: 'bold',
  textAlign: 'center',
  margin: '20px 0 0 0',
  letterSpacing: '4px',
};

export const subtitleStyle = {
  color: '#FFFFFF',
  fontSize: '26px',
  fontFamily: "'Roboto', sans-serif",
  textAlign: 'center',
  margin: '16px 0 0 0',
  maxWidth: '90vw',
};
