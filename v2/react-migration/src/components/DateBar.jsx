import React from 'react'
import { usePrayerTimes } from '../hooks/usePrayerTimes'

export const DateBar = ({ prayerData }) => {
  const {
    currentDate,
    hijriDate
  } = usePrayerTimes(prayerData)

  return (
    <div className="dtbar">
      <div id="datebar" className="datebar">
        {/* Left side - Current Date */}
        <div id="topl" className="datebar-top animated fadeInLeft">
          <div className="text-pink-large">{currentDate.day.toString().padStart(2, '0')}</div>
          <div className="date-row">
            <div className="text-white">{currentDate.dayName}</div>
            <div className="text-cyan">{currentDate.monthYear}</div>
          </div>
        </div>

        {/* Right side - Hijri Date */}
        <div id="topr" className="datebar-top animated fadeInRight">
          <div className="date-row">
            <div className="text-white">{hijriDate.monthName}</div>
            <div className="text-cyan">{hijriDate.year}H</div>
          </div>
          <div className="text-pink-large">{hijriDate.day.toString().padStart(2, '0')}</div>
        </div>
      </div>
    </div>
  )
}
