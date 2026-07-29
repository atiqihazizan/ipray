import { useState, useEffect } from 'react'
import SliderPage from './SliderPage'
import LoadingPage from './LoadingPage'
import PrayerSequencePage from './PrayerSequencePage'
import BeepManagementPage from './BeepManagementPage'

const DEBUG_SHOW_PRAYER_SEQUENCE_ONLY = false

import DateTimeOverlay from './DateTimeOverlay'
import DeathAnnouncementOverlay from './DeathAnnouncementOverlay'
import LiveStreamOverlay from './LiveStreamOverlay'
import { useData } from '../contexts/DataContext'
import { TIME_EVENTS } from '../utils/timeEvents'

const AppContent = () => {
  if (new URLSearchParams(window.location.search).has('beep')) {
    return <BeepManagementPage />
  }

  const {
    loading: dataLoading,
    socketConnected,
    socketReady,
    deathAnnouncementData,
    liveStreamData,
  } = useData()
  const [sliderReady, setSliderReady] = useState(false)
  const [currentView, setCurrentView] = useState('slide')
  const [currentPrayerName, setCurrentPrayerName] = useState(null)

  useEffect(() => {
    const onStart = (e) => {
      setCurrentPrayerName(e.detail?.prayerName ?? null)
      setCurrentView('prayer')
    }
    const onEnd = () => setCurrentView('slide')
    window.addEventListener(TIME_EVENTS.PRAYER_WARNING, onStart)
    window.addEventListener(TIME_EVENTS.SEQUENCE_END, onEnd)
    return () => {
      window.removeEventListener(TIME_EVENTS.PRAYER_WARNING, onStart)
      window.removeEventListener(TIME_EVENTS.SEQUENCE_END, onEnd)
    }
  }, [])

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
    return (
      <PrayerSequencePage
        prayerName="Subuh"
        overlayOverride={{ showDate: true, showSmallTime: true, showMarquee: true, showTimeSmallClock: false }}
      />
    )
  }

  if (currentView === 'prayer') {
    return (
      <PrayerSequencePage
        key={currentPrayerName}
        prayerName={currentPrayerName}
        overlayOverride={{ showDate: true, showSmallTime: true, showMarquee: true, showTimeSmallClock: false }}
      />
    )
  }

  const hasDeathAnnouncement = deathAnnouncementData?.active

  return (
    <>
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
