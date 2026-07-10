import { bgStyle, titleStyle, countdownStyle, subtitleStyle } from './styles';
import { useBlink } from './useBlink';
import { MOSQUE_NAME, MOSQUE_LOCATION } from '../../config/mosqueInfo';

/**
 * Screen AZAN — tunjuk nama masjid, "AZAN [prayerName]" dan countdown blink.
 * @param {string} prayerName - Nama waktu solat (e.g. 'Zohor')
 * @param {string} countdown - Countdown dalam format 'MM:SS'
 */
export default function AzanScreen({ prayerName, countdown }) {
  const blink = useBlink();

  return (
    <div style={bgStyle}>
      {/* <h1 style={{ ...titleStyle, fontSize: '130px', letterSpacing: '3px', marginBottom: '60px' }}>
        {MOSQUE_NAME}
      </h1> */}
      <h1 style={{ ...titleStyle, fontSize: '150px', lineHeight: 1.1 }}>
        AZAN {prayerName?.toUpperCase()}
      </h1>
      {/* <p style={{ ...countdownStyle, opacity: blink ? 0 : 1, transition: 'opacity 0.35s ease' }}> */}
      <p style={{ ...countdownStyle, opacity: 1, transition: 'opacity 0.35s ease' }}>
        {countdown}
      </p>
    </div>
  );
}
