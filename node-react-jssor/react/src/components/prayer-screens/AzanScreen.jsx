import { bgStyle, titleStyle, countdownStyle } from './styles';

/**
 * Screen AZAN — tunjuk nama waktu solat dan countdown sehingga waktu tiba.
 * @param {string} prayerName - Nama waktu solat (e.g. 'Zohor')
 * @param {string} countdown - Countdown dalam format 'MM:SS'
 */
export default function AzanScreen({ prayerName, countdown }) {
  return (
    <div style={bgStyle}>
      <h1 style={titleStyle}>WAKTU SOLAT</h1>
      <p style={{ ...titleStyle, fontSize: '90px' }}>{prayerName?.toUpperCase()}</p>
      <p style={countdownStyle}>{countdown}</p>
    </div>
  );
}
