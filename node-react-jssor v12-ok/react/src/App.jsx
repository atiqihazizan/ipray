import { useEffect } from 'react'
import { DataProvider } from './contexts/DataContext'
import TimeDriver from './components/TimeDriver'
import MidnightReloadListener from './components/MidnightReloadListener'
import AppContent from './components/AppContent'
import audioService from './services/audioService.js'

function App() {
  useEffect(() => {
    audioService.init();
    audioService.enableAudio()
      .then(() => console.log('[Audio] Ready'))
      .catch(err => console.warn('[Audio] Warning:', err));
  }, []);
  
  return (
    <DataProvider>
      <MidnightReloadListener />
      <TimeDriver />
      <AppContent />
    </DataProvider>
  )
}

export default App
