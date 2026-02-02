import React, { useState, useEffect } from 'react'
import { truncateText } from '../utils/text'
import { Page } from './Page'
import { ANIMATIONS, DELAYS } from '../utils/animations'
import { InfoTable, WEEKLY_LECTURE_ROWS } from './InfoTable'

export const WeeklyLecture = ({ data = [], onCycleComplete }) => {
  const [isCycleComplete, setIsCycleComplete] = useState(false)
  const [animIn, setAnimIn] = useState('fadeInRight')
  const [dataSlide, setDataSlide] = useState(data)
  const iconClass = data.length === 0 ? 'hidden' : `animated fadeInLeft ${DELAYS.DELAY_1S}`
  const imgClass = data.length === 0 ? 'hidden' : `animated fadeInRight ${DELAYS.DELAY_1S}`

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

  useEffect(() => {
    if (isCycleComplete && onCycleComplete) onCycleComplete()
  }, [isCycleComplete, onCycleComplete])

  const currentKuliah = dataSlide[0] || {}

  // Build table rows menggunakan presets
  const tableRows = [
    WEEKLY_LECTURE_ROWS.SPEAKER(currentKuliah.speaker),
    WEEKLY_LECTURE_ROWS.DATE_TIME(currentKuliah.date, currentKuliah.time),
    WEEKLY_LECTURE_ROWS.EVENT(currentKuliah.title),
    WEEKLY_LECTURE_ROWS.TOPIC(currentKuliah.topic)
  ]

  return (
    <Page id="kuliah" className="kuliah">
      <div className="frames flxclm algc">
        <h1 className="maintitle">KULIAH MINGGUAN</h1>
        <InfoTable
          title={currentKuliah.title || 'Tiada kuliah minggu ini'}
          rows={tableRows}
          animation={animIn}
          iconClass={iconClass}
          contentClass="txtkuliah"
          headerColspan={3}
          style={{ position: 'relative' }}
        >
          <img 
            src="./images/person-icon.png" 
            className={`img-pengajar txtkuliah ${imgClass}`} 
            alt="Pengajar"
          />
        </InfoTable>
      </div>
    </Page>
  )
}

const formatDateTime = (dateString, timeString) => {
  const date = new Date(dateString)
  const wdays = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"]
  const mname = ["", "Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogs", "Sep", "Okt", "Nov", "Dis"]
  
  const day = wdays[date.getDay()]
  const dayNum = date.getDate()
  const month = mname[date.getMonth() + 1]
  const year = date.getFullYear()
  
  // return `${day}, ${dayNum} ${month} ${year} - ${timeString}`
  return `${day}, ${dayNum} ${month} ${year}`
}


