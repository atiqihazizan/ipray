import { useState } from 'react'
import SliderPage from './SliderPage'
import LoadingPage from './LoadingPage'
import PrayerSequencePage from './PrayerSequencePage'
import DateTimeOverlay from './DateTimeOverlay'
import DeathAnnouncementOverlay from './DeathAnnouncementOverlay'
import LiveStreamOverlay from './LiveStreamOverlay'
import PrayerTimeController from './PrayerTimeController'
import { useData } from '../contexts/DataContext'

const AppContent = () => {
  const {
    loading: dataLoading,
    socketConnected,
    socketReady,
    midnightReloadMessage,
    deathAnnouncementData,
    liveStreamData,
  } = useData()
  const [sliderReady, setSliderReady] = useState(false)
  const [currentView, setCurrentView] = useState('slide')
  const [currentPrayerName, setCurrentPrayerName] = useState(null)
  const [currentPrayerTimeStr, setCurrentPrayerTimeStr] = useState(null)

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
  if (currentView === 'prayer') return <PrayerSequencePage prayerName={currentPrayerName} prayerTimeStr={currentPrayerTimeStr} onComplete={() => setCurrentView('slide')} />

  const hasDeathAnnouncement = deathAnnouncementData?.active

  return (
    <>
      <PrayerTimeController setCurrentView={setCurrentView} setPrayerName={setCurrentPrayerName} setPrayerTimeStr={setCurrentPrayerTimeStr} />
      {midnightReloadMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <p className="text-white text-2xl font-bold">{midnightReloadMessage}</p>
        </div>
      )}
      {(dataLoading || (!sliderReady && !hasDeathAnnouncement)) && <LoadingPage />}
      <div 
        className="relative bg-black flex items-center justify-center" 
        style={{ 
          width: '100vw', 
          height: '100vh', 
          visibility: (dataLoading || (!sliderReady && !hasDeathAnnouncement)) ? 'hidden' : 'visible',
          overflow: 'hidden'
        }}
      >
        {hasDeathAnnouncement ? (
          <DeathAnnouncementOverlay data={deathAnnouncementData} />
        ) : (
          <SliderPage onReady={() => setSliderReady(true)} />
        )}
      </div>

      {liveStreamData?.active && (
        <LiveStreamOverlay data={liveStreamData} />
      )}

      <DateTimeOverlay overlayOverride={
        liveStreamData?.active ? liveStreamData.overlayConfig
        : hasDeathAnnouncement ? deathAnnouncementData.overlayConfig
        : null
      } />
    </>
  )
}

export default AppContent
