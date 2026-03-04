import { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';

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

/**
 * Satu halaman untuk azan → iqamah → solat. Hanya tukar kandungan skrin; semua timeout dari config.
 * Selepas timeout solat tamat, panggil onComplete() untuk kembali ke slide.
 */
export default function PrayerSequencePage({ onComplete }) {
  const { PRAYER_TIME_CONFIG } = useData();
  const [screen, setScreen] = useState('azan');
  const timerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const azanMin = PRAYER_TIME_CONFIG?.AZAN_DURATION_MIN ?? 0.5;
    const iqamahMin = PRAYER_TIME_CONFIG?.IQAMAH_DURATION_MIN ?? 2;
    const solatMin = PRAYER_TIME_CONFIG?.SOLAT_DURATION_MIN ?? 3;
    const azanMs = Math.max(0, azanMin * 60 * 1000);
    const iqamahMs = Math.max(0, iqamahMin * 60 * 1000);
    const solatMs = Math.max(0, solatMin * 60 * 1000);

    const runNext = () => {
      if (timerRef.current) clearTimeout(timerRef.current);

      if (screen === 'azan') {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setScreen('iqamah');
        }, azanMs);
      } else if (screen === 'iqamah') {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setScreen('solat');
        }, iqamahMs);
      } else if (screen === 'solat') {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          if (typeof onCompleteRef.current === 'function') onCompleteRef.current();
        }, solatMs);
      }
    };

    runNext();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [screen, PRAYER_TIME_CONFIG]);

  const content =
    screen === 'azan' ? (
      <h1 style={titleStyle}>TELAH MASUKNYA WAKTU SOLAT</h1>
    ) : screen === 'iqamah' ? (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={titleStyle}>IQAMAH</h1>
        <p style={subtitleStyle}>Diminta para hadirin bersiap untuk mendirikan solat.</p>
      </div>
    ) : (
      <h1 style={titleStyle}>SEDANG SOLAT</h1>
    );

  return <div style={fullScreenStyle}>{content}</div>;
}
