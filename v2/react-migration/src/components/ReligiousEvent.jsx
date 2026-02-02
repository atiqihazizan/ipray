import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { convertToHijri } from '../utils/hijriUtils'
import { Page } from './Page'
import { ANIMATIONS, DELAYS } from '../utils/animations'

export const ReligiousEvent = ({ events = [], onCycleComplete, prayerData }) => {
  const [currentEvents, setCurrentEvents] = useState([])
  const [currentPage, setCurrentPage] = useState(0)
  const [pagesShown, setPagesShown] = useState(0)
  const [isCycleComplete, setIsCycleComplete] = useState(false)
  const [animIn, setAnimIn] = useState('fadeInRight')
  let tNext
  
  const MAX_ROWS = 5
  const displayMs = 2000
  const fadeOutMs = 5000

  // OPTIMIZED: useMemo for heavy event processing
  const processedEvents = useMemo(() => {
    return events.map(event => {
      const eventDate = new Date(event.date)
      const now = new Date()
      const diffTime = eventDate - now
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      return {
        ...event,
        daysLeft: diffDays,
        hijriDate: convertToHijri(event.date, prayerData?.hdata)
      }
    }).filter(event => event.daysLeft >= 0)
  }, [events, prayerData])

  useEffect(() => {
    setCurrentEvents(processedEvents)
  }, [processedEvents])

  // Cycle mechanism untuk events
  useEffect(() => {
    if (currentEvents.length === 0) {
      // Jika tiada data, set cycle complete selepas 1 saat
      const timeout = setTimeout(() => {
        setIsCycleComplete(true)
      }, 1000)
      return () => clearTimeout(timeout)
    }

    // if (currentEvents.length <= MAX_ROWS) {
    //   // Jika events kurang dari atau sama dengan 9, set cycle complete selepas 5 saat
    //   const timeout = setTimeout(() => {
    //     setIsCycleComplete(true)
    //   }, 5000)
    //   return () => clearTimeout(timeout)
    // }
    
    const totalPages = Math.ceil(currentEvents.length / MAX_ROWS)
    const tFadeOut = setTimeout(() => {
      setAnimIn('fadeOutRight')
      tNext = setTimeout(() => {
        setCurrentPage(prev => (prev + 1) % totalPages)
        setAnimIn('fadeInRight')
      }, displayMs)
    }, fadeOutMs)

    return () => {
      clearTimeout(tFadeOut)
      if (tNext) clearTimeout(tNext)
    }
  }, [currentEvents])

  // Notify parent bila cycle complete (sudah tunjuk semua pages satu kali)
  useEffect(() => {
    if (isCycleComplete && onCycleComplete) {
      onCycleComplete()
    }
  }, [isCycleComplete, onCycleComplete])

  // Get events untuk current page
  const startIndex = currentPage * MAX_ROWS
  const endIndex = startIndex + MAX_ROWS
  const displayEvents = currentEvents.slice(startIndex, endIndex)

  return (
    <Page id="countdown" className="countdown">
      <div className="frames flxclm algc">
        <h1 className="maintitle">PERISTIWA</h1>
        <div className="tablefram">
          <table className="table-disp striped-row striped-col disp-sm">
            <thead>
              <tr>
                <th>PERISTIWA</th>
                <th style={{ width: '255px' }}>MASIHI</th>
                <th style={{ width: '330px' }}>HIJRAH</th>
                <th style={{ width: '135px' }}>HARI</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: MAX_ROWS }, (_, index) => {
                const event = displayEvents[index]
                return (
                  <tr key={index}>
                    <td>
                      <div className={`col-event animated ${animIn} ${DELAYS.DELAY_1S}`}>
                        {event ? event.name : ''}
                      </div>
                    </td>
                    <td>
                      <div className={`col-masih animated ${animIn} ${DELAYS.DELAY_1S} tc`}>
                        {event ? formatMasihiDate(event.date) : ''}
                      </div>
                    </td>
                    <td>
                      <div className={`col-hijri animated ${animIn} ${DELAYS.DELAY_1S}`}>
                        {event ? event.hijriDate.formatted : ''}
                      </div>
                    </td>
                    <td>
                      <div className={`col-hari tc animated ${animIn} ${DELAYS.DELAY_1S}`}>
                        {event ? (event.daysLeft === 0 ? 'SEKARANG' : `${event.daysLeft} HARI LAGI`) : ''}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  )
}

const formatMasihiDate = (dateString) => {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// convertToHijri function telah dipindahkan ke utils/hijriUtils.js
