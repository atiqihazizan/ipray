import React, { useState, useEffect } from 'react'
import { Page } from './Page'
import { ANIMATIONS, DELAYS } from '../utils/animations'
import { InfoTable, ACTIVITY_ROWS, TWO_COLUMN_ROWS } from './InfoTable'

export const Activity = ({ data = [], onCycleComplete }) => {
  const [isCycleComplete, setIsCycleComplete] = useState(false)
  const [animIn, setAnimIn] = useState('fadeInRight')
  const [dataSlide, setDataSlide] = useState(data)
  const iconClass = data.length === 0 ? 'hidden' : `animated fadeInLeft ${DELAYS.DELAY_1S}`

  useEffect(() => {
    if (data.length === 0 || dataSlide.length === 1) {
      const timeout = setTimeout(() => setIsCycleComplete(true), 1000)
      return () => clearTimeout(timeout)
    }
    const displayMs = 2500
    const fadeOutMs = 5000

    let tNext

    const tFadeOut = setTimeout(() => {
      setAnimIn('fadeOutRight')
      tNext = setTimeout(() => {
        setDataSlide(dataSlide.slice(1))
        setAnimIn('fadeInRight')
      }, displayMs)
    }, fadeOutMs)

    return () => {
      clearTimeout(tFadeOut)
      if (tNext) clearTimeout(tNext)
    }
  }, [dataSlide, isCycleComplete])

  // Notify parent bila cycle complete (sudah tunjuk semua items satu kali)
  useEffect(() => {
    if (isCycleComplete && onCycleComplete) onCycleComplete()
  }, [isCycleComplete, onCycleComplete])

  const currentAnnouncement = dataSlide[0] || {}
  
  // Build table rows menggunakan presets
  const tableRows = [
    // ACTIVITY_ROWS.DATE_TIME(currentAnnouncement?.date, currentAnnouncement?.time),
    ACTIVITY_ROWS.LOCATION(currentAnnouncement?.location),
    TWO_COLUMN_ROWS.DATE_TIME(currentAnnouncement?.date, currentAnnouncement?.time, { timeWidth: 'small' }),
    ACTIVITY_ROWS.DESCRIPTION(currentAnnouncement?.description),
    ACTIVITY_ROWS.AUDIENCE(currentAnnouncement?.audience),
    ACTIVITY_ROWS.COUNTDOWN(currentAnnouncement?.daysLeft)
  ]

  return (
    <Page id="umum" className="umum">
      <div className="frames flxclm algc">
        <h1 className="maintitle">PENGUMUMAN</h1>
        <InfoTable
          title={currentAnnouncement?.title || 'Tiada pengumuman'}
          rows={tableRows}
          animation={animIn}
          iconClass={iconClass}
          contentClass="txtum"
          headerColspan={4}
        />
      </div>
    </Page>
  )
}

const formatDate = (dateString) => {
  if(!dateString) return '';
  const date = new Date(dateString)
  const wdays = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"]
  const mname = ["", "Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogs", "Sep", "Okt", "Nov", "Dis"]
  
  const day = wdays[date.getDay()]
  const dayNum = date.getDate()
  const month = mname[date.getMonth() + 1]
  const year = date.getFullYear()
  
  return `${day}, ${dayNum} ${month} ${year}`
}

const formatTime12Hour = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour24 = parseInt(hours, 10);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minutes} ${ampm}`;
}
