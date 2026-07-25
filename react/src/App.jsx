import { useEffect, useState } from 'react'
import { DataProvider } from './contexts/DataContext'
import TimeDriver from './components/TimeDriver'
import AppContent from './components/AppContent'
import audioService from './services/audioService.js'

// MidnightReloadListener dibuang — tidak diperlukan lagi kerana:
// 1. Setiap prayer sequence (azan→iqamah→solat) berakhir dengan window.location.reload()
// 2. PM2 cron_restart pada 12:05 AM menyebabkan React reconnect dan loadAllData() automatik

function App() {
  const [audioError, setAudioError] = useState(false);

  useEffect(() => {
    audioService.init();
    audioService.enableAudio()
      .then(() => console.log('[Audio] Ready'))
      .catch(err => console.warn('[Audio] Warning:', err));

    const handleAudioFailed = () => setAudioError(true);
    window.addEventListener('audio:failed', handleAudioFailed);
    return () => window.removeEventListener('audio:failed', handleAudioFailed);
  }, []);

  return (
    <DataProvider>
      <TimeDriver />
      {audioError && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          background: '#c0392b', color: '#fff',
          padding: '10px 16px', zIndex: 9999,
          fontFamily: 'sans-serif', fontSize: '16px',
          textAlign: 'center'
        }}>
          ⚠ Audio gagal — fail beep.wav tidak dapat dimuat. Hubungi pentadbir.
        </div>
      )}
      <AppContent />
    </DataProvider>
  )
}

export default App
