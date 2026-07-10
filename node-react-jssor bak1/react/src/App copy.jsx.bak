import { useState, useEffect } from 'react'
import SliderPage from './components/SliderPage'
import LoadingPage from './components/LoadingPage'
import PageAzan from './components/PageAzan'
import PageIqamah from './components/PageIqamah'
import PageSolat from './components/PageSolat'
import { DataProvider, useData } from './contexts/DataContext'
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
  // Beep sekali bila app launch untuk pastikan audio ready
  // Dalam kiosk mode dengan --autoplay-policy=no-user-gesture-required, audio boleh play tanpa user interaction
  useEffect(() => {
    const playLaunchBeep = async () => {
      try {
        audioService.init()
        // Dalam kiosk mode, cuba enable dan play terus
        if (!audioService.getIsEnabled()) {
          await audioService.enableAudio().catch(() => {
            // Jika gagal (bukan kiosk mode), akan enable pada interaksi pertama
          })
        }
        // Main beep sekali
        await audioService.play({ playCount: 1, volume: 1 }).catch(() => {
          // Jika gagal, akan main pada interaksi pertama
        })
      } catch (err) {
        // Abaikan jika gagal
      }
    }
    
    // Cubakan play beep selepas app mount (untuk kiosk mode dengan autoplay policy)
    const timer = setTimeout(playLaunchBeep, 500)
    
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
      clearTimeout(timer)
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
      document.removeEventListener('pointerdown', handleFirstInteraction)
    }
  }, [])
  
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  )
}

export default App
