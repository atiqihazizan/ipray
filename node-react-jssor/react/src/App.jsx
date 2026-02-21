import { useEffect, useState } from 'react'
import SliderPage from './components/SliderPage'
import LoadingPage from './components/LoadingPage'
import PageAzan from './components/PageAzan'
import PageIqamah from './components/PageIqamah'
import PageSolat from './components/PageSolat'
import { DataProvider, useData } from './contexts/DataContext'
import { TimeSyncProvider } from './contexts/TimeSyncContext'
import { TimeProvider } from './contexts/TimeContext'
import MidnightReloadListener from './components/MidnightReloadListener'
import PrayerTimeController from './components/PrayerTimeController'
import audioService from './services/audioService.js'

const AppContent = () => {
  const { loading: dataLoading, socketConnected, socketReady, midnightReloadMessage } = useData()
  const [sliderReady, setSliderReady] = useState(false)
  const [currentView, setCurrentView] = useState('slide')

  if (socketReady && !socketConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h1 className="text-white text-2xl font-bold mb-4">Sambungan Gagal</h1>
          <p className="text-gray-400 mb-2">Tidak dapat menyambung ke sistem. Sila cuba semula.</p>
        </div>
      </div>
    )
  }

  if (!socketConnected) return <LoadingPage />
  if (currentView === 'azan') return <PageAzan />
  if (currentView === 'iqamah') return <PageIqamah />
  if (currentView === 'solat') return <PageSolat />

  return (
    <>
      <PrayerTimeController setCurrentView={setCurrentView} />
      {midnightReloadMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <p className="text-white text-2xl font-bold">{midnightReloadMessage}</p>
        </div>
      )}
      {(dataLoading || !sliderReady) && <LoadingPage />}
      <div 
        className="bg-black flex items-center justify-center" 
        style={{ 
          width: '100vw', 
          height: '100vh', 
          visibility: (dataLoading || !sliderReady) ? 'hidden' : 'visible',
          overflow: 'hidden'
        }}
      >
        <SliderPage onReady={() => setSliderReady(true)} />
      </div>
    </>
  )
}

function App() {
  useEffect(() => {
    // Simple init untuk Chromium dengan autoplay flag
    audioService.init();
    console.log('[Audio] Initialized for Chromium Kiosk');
    
    // Optional: Test audio capability sekali
    audioService.enableAudio()
      .then(() => console.log('[Audio] Ready'))
      .catch(err => console.warn('[Audio] Warning:', err));
  }, []);
  
  return (
    <DataProvider>
      <TimeSyncProvider>
        <MidnightReloadListener />
        <TimeProvider>
          <AppContent />
        </TimeProvider>
      </TimeSyncProvider>
    </DataProvider>
  )
}

export default App