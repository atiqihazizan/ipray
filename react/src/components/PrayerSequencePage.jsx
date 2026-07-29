import { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { TIME_EVENTS } from '../utils/timeEvents';
import { PegawaiTable, PEGAWAI_LIST } from './prayer-screens/OfficerRow';
import DateTimeOverlay from './DateTimeOverlay';
import {
  bgSolatStyle, gridScreenStyle, leftColumnPegawaiStyle,
  rightColumnCenterStyle, pegawaiTitleStyle, pegawaiSmallStyle,
  countdownStyleIqamah, countdownBoxStyle, countdownBoxTextStyle,
  jawiTitleStyleAzan, jawiTitleStyleIqamah, jawiTitleStyle,
} from './prayer-screens/styles';

const JAWI_AZAN = 'أذان';
// const JAWI_MASUK_WAKTU = 'تله مسوق وقتو';
const JAWI_MASUK_WAKTU = 'أذان';
const JAWI_IQAMAH = 'إقامة';
const JAWI_SEDANG_SOLAT = 'صلاة';

const muteIconBadgeStyle = {
  width: '70px', height: '70px', borderRadius: '50%',
  backgroundColor: '#FFFFFF', display: 'flex',
  alignItems: 'center', justifyContent: 'center', margin: '0 16px',
};
const muteIconStyle = { maxWidth: '55px', maxHeight: '55px', height: 'auto' };

function formatCountdown(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function getDebugStartScreen() {
  const s = new URLSearchParams(window.location.search).get('debugScreen');
  return (s === 'masuk-waktu' || s === 'iqamah' || s === 'solat') ? s : null;
}

export default function PrayerSequencePage({ prayerName, overlayOverride = null }) {
  const { petugasData } = useData();
  const debugStart = getDebugStartScreen();

  const [screen, setScreen] = useState(debugStart || 'azan');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (debugStart) return;
    const handler = (e) => {
      const { phase, countdown } = e.detail ?? {};
      if (phase) setScreen(phase);
      if (typeof countdown === 'number') setCountdown(countdown);
    };
    window.addEventListener(TIME_EVENTS.SEQUENCE_STATE, handler);
    return () => window.removeEventListener(TIME_EVENTS.SEQUENCE_STATE, handler);
  }, [debugStart]);

  const pegawaiList = (petugasData && petugasData.length > 0)
    ? petugasData.map((p) => ({ label: p.label, name: p.name, imageSrc: p.imageSrc }))
    : PEGAWAI_LIST;

  const cd = formatCountdown(countdown);

  if (screen === 'masuk-waktu') {
    return (
      <>
        {/* <div style={bgSolatStyle}>
          <h1 style={{
            color: '#FFFFFF',
            fontSize: '80px',
            textAlign: 'center',
            margin: 0,
            fontFamily: "'ArchivoBlack', sans-serif"
          }}>
            {JAWI_SEDANG_AZAN} {prayerName.toUpperCase()}
          </h1>
        </div> */}
        
        <div style={bgSolatStyle}>
          <h1 style={{
            ...jawiTitleStyle(),
            marginTop: '13vh',
          }}>{JAWI_MASUK_WAKTU}</h1>
          <h1 style={{
            color: '#FFFFFF',
            fontSize: '120px',
            fontweight: 'bold',
            textAlign: 'center',
            margin: 0,
            fontFamily: "'ArchivoBlack', sans-serif"
          }}>
            Telah Masuk Waktu
          </h1>
        </div>
        {overlayOverride && <DateTimeOverlay overlayOverride={overlayOverride} />}
      </>
    );
  }

  if (screen === 'azan' || screen === 'iqamah') {
    const jawiTitle = screen === 'azan' ? jawiTitleStyleAzan() : jawiTitleStyleIqamah();
    const jawiText = screen === 'azan' ? JAWI_AZAN : JAWI_IQAMAH;
    return (
      <>
        <div style={gridScreenStyle}>
          <div style={leftColumnPegawaiStyle}>
            <h2 style={pegawaiTitleStyle()}>PEGAWAI BERTUGAS</h2>
            <small style={pegawaiSmallStyle}>(Tertakluk kepada perubahan)</small>
            <br />
            <PegawaiTable list={pegawaiList} />
          </div>
          <div style={rightColumnCenterStyle}>
            <h1 style={jawiTitle}>{jawiText}</h1>
            <div style={countdownBoxStyle}>
              <p style={{ ...countdownStyleIqamah, ...countdownBoxTextStyle }}>{cd}</p>
            </div>
          </div>
        </div>
        {overlayOverride && <DateTimeOverlay overlayOverride={overlayOverride} />}
      </>
    );
  }

  return (
    <>
      <div style={bgSolatStyle}>
        <h1 style={jawiTitleStyle()}>{JAWI_SEDANG_SOLAT}</h1>
        <div style={{ position: 'absolute', bottom: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '104px' }}>
          <div style={muteIconBadgeStyle}>
            <img src="/img/mute-phone.png" alt="Senangkan telefon" style={muteIconStyle} />
          </div>
          <div style={muteIconBadgeStyle}>
            <img src="/img/silent.png" alt="Diam" style={muteIconStyle} />
          </div>
        </div>
      </div>
      {overlayOverride && <DateTimeOverlay overlayOverride={overlayOverride} />}
    </>
  );
}
