import React, { useEffect } from 'react'
import { usePrayerTimes } from '../hooks/usePrayerTimes'

export const PrayerTimes = ({ 
  prayerData, 
  config = { timeFormat: true, imsakDisplay: false },
  showPrayerTimes = false, 
  showTime = false 
}) => {
  const {
    currentTime,
    prayerTimes,
    nextPrayer,
    timeToNext,
    isPrayerTime,
    isBlinking,
    preAzanBlink,
    masukWaktu,
    currentPrayerIndex,
    showImsak,
    showDot, // Ambil showDot dari hook
    toggleHourFormat,
    toggleImsak
  } = usePrayerTimes(prayerData, config)

  // Global function untuk tukar format jam
  useEffect(() => {
    window.toggleHourFormat = toggleHourFormat
    return () => delete window.toggleHourFormat
  }, [toggleHourFormat])

  // Global function untuk toggle imsak
  useEffect(() => {
    window.toggleImsak = toggleImsak
    return () => delete window.toggleImsak
  }, [toggleImsak])

  if (!showPrayerTimes && !showTime) return null

  return (
    <div id="footbar">
      {/* Prayer Times */}
      {showPrayerTimes && (
        <div className="prayer-times">
          <div id="masabar" className="masabar animated fadeInLeft">
            {prayerTimes.map((prayer, index) => (
              <div 
                key={prayer.name}
                className={`waktu ${nextPrayer === index ? 'next' : ''} ${isBlinking && nextPrayer === index ? 'blinking' : ''}`}
              >
                <div className="label">{prayer.name}</div>
                <div className="tmasa">{prayer.time}</div>
              </div>
            ))}
          </div>
          <div id="waktu1" className="waktu1 animated fadeInRight">
            <span className="hours-tens">{Math.floor(currentTime.displayHours / 10)}</span>
            <span className="hours-ones">{currentTime.displayHours % 10}</span>
            <span className="dotdot">:</span>
            <span className="minutes-tens">{Math.floor(currentTime.minutes / 10)}</span>
            <span className="minutes-ones">{currentTime.minutes % 10}</span>
          </div>
        </div>
      )}

      {/* Time Display */}
      {showTime && (
        <div id="timebar" className="timebar">
          <div id="timebar1" className="timebar1 animated fadeInLeft">
            <div id="nama0" className="nama0">{prayerTimes[nextPrayer]?.name || ''}</div>
            <div id="masa0" className="masa0">{prayerTimes[nextPrayer]?.time || ''}</div>
          </div>
          <div id="timebar2" className="timebar2 animated fadeInRight">
            <div id="time2" className="time2">
              <span className="hours-tens">{Math.floor(currentTime.displayHours / 10)}</span>
              <span className="hours-ones">{currentTime.displayHours % 10}</span>
              <span className="dotdot">:</span>
              <span className="minutes-tens">{Math.floor(currentTime.minutes / 10)}</span>
              <span className="minutes-ones">{currentTime.minutes % 10}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
