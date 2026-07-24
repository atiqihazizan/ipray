import { useEffect } from 'react'
import { DataProvider } from './contexts/DataContext'
import TimeDriver from './components/TimeDriver'
import AppContent from './components/AppContent'
import audioService from './services/audioService.js'

// MidnightReloadListener dibuang — tidak diperlukan lagi kerana:
// 1. Setiap prayer sequence (azan→iqamah→solat) berakhir dengan window.location.reload()
// 2. PM2 cron_restart pada 12:05 AM menyebabkan React reconnect dan loadAllData() automatik

function App() {
  useEffect(() => {
    audioService.init();
    audioService.enableAudio()
      .then(() => console.log('[Audio] Ready'))
      .catch(err => console.warn('[Audio] Warning:', err));
  }, []);

  return (
    <DataProvider>
      <TimeDriver />
      <AppContent />
    </DataProvider>
  )
}

export default App
