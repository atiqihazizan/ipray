import { bgStyle, titleStyle, countdownStyle, subtitleStyle } from './styles';

/**
 * Screen IQAMAH — tunjuk countdown iqamah sebelum solat bermula.
 * @param {string} countdown - Countdown dalam format 'MM:SS'
 */
export default function IqamahScreen({ countdown }) {
  return (
    <div style={bgStyle}>
      <h1 style={titleStyle}>IQAMAH</h1>
      <p style={subtitleStyle}>Diminta para hadirin bersiap untuk mendirikan solat.</p>
      <p style={countdownStyle}>{countdown}</p>
    </div>
  );
}
