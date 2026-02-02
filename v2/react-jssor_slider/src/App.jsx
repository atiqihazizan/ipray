import { useState } from 'react'
import JssorSlider from './components/JssorSlider'
import LoadingScreen from './components/LoadingScreen'
import { DataProvider, useData } from './contexts/DataContext'

const AppContent = () => {
  const { loading: dataLoading, error, socketConnected, socketReady } = useData()
  const [sliderReady, setSliderReady] = useState(false)

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
    return <LoadingScreen />
  }

  // Show loading screen sehingga data siap dan slider ready
  // JssorSlider akan render di belakang LoadingScreen untuk init process
  return (
    <>
      {(dataLoading || !sliderReady) && <LoadingScreen />}
      <div className="min-h-screen bg-black" style={{ visibility: (dataLoading || !sliderReady) ? 'hidden' : 'visible' }}>
        <JssorSlider onReady={() => setSliderReady(true)} />
      </div>
    </>
  )
}

function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  )
}

export default App
