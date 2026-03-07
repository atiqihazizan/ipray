import { bgSolatStyle, titleStyle, countdownStyle } from './styles';

/**
 * Screen SEDANG SOLAT — latar hitam, tunjuk countdown solat.
 * @param {string} countdown - Countdown dalam format 'MM:SS'
 */
export default function SolatScreen({ countdown }) {
  return (
    <div style={bgSolatStyle}>
      <h1 style={titleStyle}>SEDANG SOLAT</h1>
      <p style={countdownStyle}>{countdown}</p>
    </div>
  );
}
