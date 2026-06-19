import { useEffect } from 'react'
import { DataProvider } from './contexts/DataContext'
import MidnightReloadListener from './components/MidnightReloadListener'
import TimeDriver from './components/TimeDriver'
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
    <div
      className="ipray-app-fill"
      style={{ width: '100%', height: '100%', minHeight: '100%', position: 'relative' }}
    >
      <DataProvider>
        <TimeDriver /> {/* Driver masa — interval, dispatch time-update, prayer-warning, dll  untuk elak rendeing keseluruhan app*/}
        <MidnightReloadListener />
        <AppContent />
      </DataProvider>
    </div>
  )
}

export default App
