import { useState } from 'react'
import SliderPage from './SliderPage'
import LoadingPage from './LoadingPage'
import PrayerSequencePage from './PrayerSequencePage'

// Set true untuk debug: papar PrayerSequencePage sahaja
const DEBUG_SHOW_PRAYER_SEQUENCE_ONLY = false

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

  if (DEBUG_SHOW_PRAYER_SEQUENCE_ONLY) {
    const now = new Date()
    const in2Min = new Date(now.getTime() + 2 * 60 * 1000)
    const debugTimeStr = `${String(in2Min.getHours()).padStart(2, '0')}:${String(in2Min.getMinutes()).padStart(2, '0')}:00`
    return (
      <PrayerSequencePage
        prayerName="Subuh"
        prayerTimeStr={debugTimeStr}
        onComplete={() => {}}
        overlayOverride={{ showDate: true, showSmallTime: true, showMarquee: true, showTimeSmallClock: false }}
      />
    )
  }

  if (currentView === 'prayer') {
    return (
      <PrayerSequencePage
        key={`${currentPrayerName}-${currentPrayerTimeStr}`}
        prayerName={currentPrayerName}
        prayerTimeStr={currentPrayerTimeStr}
        onComplete={() => setCurrentView('slide')}
        overlayOverride={{ showDate: true, showSmallTime: true, showMarquee: true, showTimeSmallClock: false }}
      />
    )
  }

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
        liveStreamData?.active
          ? (liveStreamData.overlayConfig ?? { showDate: true, showSmallTime: true, showMarquee: true })
          : hasDeathAnnouncement
            ? (deathAnnouncementData?.overlayConfig ?? { showDate: true, showSmallTime: true, showMarquee: true })
            : null
      } />
    </>
  )
}

export default AppContent
