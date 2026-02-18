import { useState, useEffect } from 'react'
import SliderPage from './components/SliderPage'
import LoadingPage from './components/LoadingPage'
import PageAzan from './components/PageAzan'
import PageIqamah from './components/PageIqamah'
import PageSolat from './components/PageSolat'
import { DataProvider, useData } from './contexts/DataContext'
import { TimeSyncProvider } from './contexts/TimeSyncContext'
import { usePrayerTimeProcess } from './hooks/usePrayerTimeProcess.js'
import { usePrayerTimeNavigation } from './hooks/usePrayerTimeNavigation.js'
import audioService from './services/audioService.js'

const AppContent = () => {
  const { loading: dataLoading, error, socketConnected, socketReady } = useData()
  const [sliderReady, setSliderReady] = useState(false)
  const currentView = usePrayerTimeNavigation()

  usePrayerTimeProcess()

  // Jika sambungan gagal, show error dan skip semua operations
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

  // Tunggu socket connected baru proceed
  // return <LoadingPage />
  if (!socketConnected) {
    return <LoadingPage />
  }

  // Masuk waktu: page azan (AZAN_DURATION_MIN) → page iqamah (IQAMAH_DURATION_MIN) → page solat (SOLAT_DURATION_MIN) → kembali slide
  if (currentView === 'azan') return <PageAzan />
  if (currentView === 'iqamah') return <PageIqamah />
  if (currentView === 'solat') return <PageSolat />

  // Show loading screen sehingga data siap dan slider ready
  // SliderPage akan render di belakang LoadingPage untuk init process
  return (
    <>
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
  // Unlock audio untuk kiosk: Chromium dengan --autoplay-policy=no-user-gesture-required
  // kadangkala perlukan masa sebelum play() dibenarkan. Retry beberapa kali.
  useEffect(() => {
    audioService.init();

    const tryEnableAudio = async () => {
      if (audioService.getIsEnabled()) return true;
      try {
        await audioService.enableAudio();
        return true;
      } catch {
        return false;
      }
    };

    // Percubaan pertama selepas 500ms
    const t1 = setTimeout(() => { tryEnableAudio(); }, 500);

    // Retry setiap 2s (max 15 kali = 30s) supaya kiosk sempat unlock audio sebelum waktu solat
    let attempts = 0;
    const maxAttempts = 15;
    const retryInterval = setInterval(async () => {
      if (audioService.getIsEnabled() || attempts >= maxAttempts) {
        clearInterval(retryInterval);
        return;
      }
      attempts += 1;
      await tryEnableAudio();
    }, 2000);
    
    // Fallback: Beep pada interaksi pertama (untuk browser biasa tanpa autoplay policy)
    const handleFirstInteraction = async (event) => {
      try {
        if (!audioService.getIsEnabled()) {
          await audioService.enableAudio()
        }
        audioService.play({ playCount: 1, volume: 1 })
      } catch (err) {
        console.warn('[Audio] First interaction handler error:', err)
      }
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
      document.removeEventListener('pointerdown', handleFirstInteraction)
    }
    
    document.addEventListener('click', handleFirstInteraction, { once: true })
    document.addEventListener('touchstart', handleFirstInteraction, { once: true })
    document.addEventListener('keydown', handleFirstInteraction, { once: true })
    document.addEventListener('pointerdown', handleFirstInteraction, { once: true })
    
    return () => {
      clearTimeout(t1);
      clearInterval(retryInterval);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('pointerdown', handleFirstInteraction);
    };
  }, []);
  
  return (
    <DataProvider>
      <TimeSyncProvider>
        <AppContent />
      </TimeSyncProvider>
    </DataProvider>
  )
}

export default App
