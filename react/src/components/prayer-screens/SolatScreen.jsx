import { bgSolatStyle, jawiTitleStyle } from './styles';
// jawiSubtitleStyle tak digunakan buat masa ini — teks hadith "saf sufufan" dikomen di bawah.
// Import semula jawiSubtitleStyle dari './styles' jika diaktifkan semula.

/** Teks Jawi untuk "Sedang Solat" */
const JAWI_SEDANG_SOLAT = 'صلاة';

/** Hadith: Tegakkan saf solat */
const JAWI_SUBTITLE = 'سَوُّوا صُفُوفَكُمْ فَإِنَّ تَسْوِيَةَ الصُّفُوفِ مِنْ إِقَامَةِ الصَّلَاةِ';

/**
 * Screen SEDANG SOLAT — latar hitam, tunjuk teks Jawi dan subtitle hadith.
 * @param {string} countdown - Countdown dalam format 'MM:SS'
 */
// Fail ikon (mute-phone.png, silent.png) ada kawasan lutsinar (bukan putih pekat) di
// belakang lukisan hitam — pada latar hitam pekat bgSolatStyle, bahagian hitam ikon jadi
// tak nampak. Badge bulat putih pekat di belakang ikon supaya kekal jelas pada latar apa jua.
const muteIconBadgeStyle = {
  width: '70px',
  height: '70px',
  borderRadius: '50%',
  backgroundColor: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 16px',
};
const muteIconStyle = { maxWidth: '55px', maxHeight: '55px', height: 'auto' };

export default function SolatScreen({ countdown }) {
  return (
    <div style={bgSolatStyle}>
      <h1 style={jawiTitleStyle()}>{JAWI_SEDANG_SOLAT}</h1>
      {/* Teks hadith "saf sufufan" dibuang atas permintaan (2026-07-03) — semak semula
          pada masa hadapan sama ada perlu dipaparkan semula. */}
      {/* <p style={jawiSubtitleStyle()}>{JAWI_SUBTITLE}</p> */}
      <div style={{ position: 'absolute', bottom: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '104px' }}>
        <div style={muteIconBadgeStyle}>
          <img src="/img/mute-phone.png" alt="Senangkan telefon" style={muteIconStyle} />
        </div>
        <div style={muteIconBadgeStyle}>
          <img src="/img/silent.png" alt="Diam" style={muteIconStyle} />
        </div>
      </div>
    </div>
  );
}
