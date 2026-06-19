import { bgSolatStyle, jawiTitleStyle, jawiSubtitleStyle } from './styles';

/** Teks Jawi untuk "Sedang Solat" */
const JAWI_SEDANG_SOLAT = 'صلاة';

/** Hadith: Tegakkan saf solat */
const JAWI_SUBTITLE = 'سَوُّوا صُفُوفَكُمْ فَإِنَّ تَسْوِيَةَ الصُّفُوفِ مِنْ إِقَامَةِ الصَّلَاةِ';

/**
 * Screen SEDANG SOLAT — latar hitam, tunjuk teks Jawi dan subtitle hadith.
 * @param {string} countdown - Countdown dalam format 'MM:SS'
 */
const muteIconStyle = { maxWidth: '120px', height: 'auto', margin: '0 16px' };

export default function SolatScreen({ countdown }) {
  return (
    <div style={bgSolatStyle}>
      <h1 style={jawiTitleStyle()}>{JAWI_SEDANG_SOLAT}</h1>
      <p style={jawiSubtitleStyle()}>{JAWI_SUBTITLE}</p>
      <div style={{ position: 'absolute', bottom: '150px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '154px', gap: '104px' }}>
        <img src="/img/mute-phone.png" alt="Senangkan telefon" style={muteIconStyle} />
        <img src="/img/silent.png" alt="Diam" style={muteIconStyle} />
      </div>
    </div>
  );
}
