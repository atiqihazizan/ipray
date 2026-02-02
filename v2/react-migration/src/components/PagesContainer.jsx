import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Activity } from './Activity'
import { WeeklyLecture } from './WeeklyLecture'
import { MediaCarousel } from './MediaCarousel'
import { ReligiousEvent } from './ReligiousEvent'
import { useDataLoader } from '../hooks/useDataLoader'

export const PagesContainer = ({ onPageChange, onDataLoaded, holdTransition = false }) => {
  // ============================================================
  // TEST MODE: Untuk test 1 page sahaja
  // ============================================================
  // 1. Set TEST_MODE = true untuk enable test mode
  // 2. Set TEST_PAGE ke page yang nak test:
  //    - 0 = Home page
  //    - 1 = Event Announcements
  //    - 2 = Weekly Lecture (Kuliah)
  //    - 3 = Media Carousel (Slider)
  //    - 4 = Event Countdown
  // 3. Bila dalam test mode, page tidak akan auto transition
  // 4. Set TEST_MODE = false untuk kembali ke normal mode
  // ============================================================
  const TEST_MODE = false // Set ke false untuk normal mode
  const TEST_PAGE = 3 // 0=Home, 1=Announcements, 2=Lecture, 3=Slider, 4=Countdown
  
  const [currentPage, setCurrentPage] = useState(TEST_MODE ? TEST_PAGE : 0)
  const [isCycleComplete, setIsCycleComplete] = useState(false)
  
  // Data management
  const { prayerData, activity, kuliahData, religiousEvents, slides, config, isLoading } = useDataLoader()

  // Page configuration - OPTIMIZED: useMemo
  const pageConfig = useMemo(() => {
    const baseTimers = (config && Array.isArray(config.timers) && config.timers.length) ? config.timers : [2000, 2000, 2000, 2000, 2000] // default fallback in milliseconds
    
    // Check data untuk setiap page dan sesuaikan timer
    const timers = [...baseTimers]
    
    // Page 1: Activity
    if (!activity || activity.length === 0) { timers[1] = 2000 } // 1 saat jika tiada data
    
    // Page 2: WeeklyLecture  
    if (!kuliahData || kuliahData.length === 0) { timers[2] = 2000 } // 1 saat jika tiada data
    
    // Page 3: MediaCarousel
    if (!slides || slides.length === 0) { timers[3] = 2000 } // 1 saat jika tiada data
    
    // Page 4: ReligiousEvent
    if (!religiousEvents || religiousEvents.length === 0) { timers[4] = 2000 } // 1 saat jika tiada data
    
    return {
      maxPage: 4,
      timers,
      attributes: (config && Array.isArray(config.attributes) && config.attributes.length) ? config.attributes : [11, 5, 5, 12, 5, 11]
    }
  }, [config, activity, kuliahData, slides, religiousEvents])

  // Navigation functions - OPTIMIZED: useCallback
  const nextPage = useCallback(() => {
    let nextPageNum = currentPage + 1
    // Skip page 3 (MediaCarousel) jika slides kosong
    if (nextPageNum === 3 && (!slides || slides.length === 0)) {
      nextPageNum = 4
    }
    setCurrentPage(nextPageNum > pageConfig.maxPage ? 0 : nextPageNum)
    setIsCycleComplete(false)
  }, [currentPage, pageConfig.maxPage, slides])
  
  const goToPage = useCallback((pageNumber) => { pageNumber >= 0 && pageNumber <= pageConfig.maxPage && (setCurrentPage(pageNumber), setIsCycleComplete(false)) }, [pageConfig.maxPage])

  // Handler untuk terima cycle completion dari child components - OPTIMIZED: useCallback
  const handleCycleComplete = useCallback(() => setIsCycleComplete(true), [])

  // Debug function
  useEffect(() => { window.setPage = goToPage; return () => { delete window.setPage } }, [goToPage])

  useEffect(() => { onPageChange && onPageChange(currentPage, Array.isArray(pageConfig.attributes) ? (pageConfig.attributes[currentPage] ?? 0) : 0) }, [currentPage, onPageChange, pageConfig.attributes])

  useEffect(() => { onDataLoaded && !isLoading && onDataLoaded({ prayerData, config }) }, [prayerData, config, isLoading, onDataLoaded])

  // Reset page ke 0 apabila holdTransition aktif
  useEffect(() => {
    if (holdTransition && currentPage !== 0 && !TEST_MODE) {
      setCurrentPage(0)
      setIsCycleComplete(false)
    }
  }, [holdTransition, currentPage, TEST_MODE])

  // Auto page transition with cycle awareness
  useEffect(() => {
    // Skip auto transition kalau dalam test mode atau holdTransition aktif
    if (TEST_MODE || holdTransition) return
    
    const pageHasCycle = currentPage !== 0 // Page 0 (home) tiada cycle
    
    // Get timeout duration from pageConfig.timers based on currentPage
    const timeoutDuration = pageConfig.timers[currentPage] || 3000 // fallback to 3 seconds
    
    if (pageHasCycle) {
      // Untuk pages dengan cycle, tunggu cycle complete dulu
      if (!isCycleComplete) return
      const timer = setTimeout(() => nextPage(), timeoutDuration); return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => nextPage(), timeoutDuration); return () => clearTimeout(timer)
    }
  }, [currentPage, isCycleComplete, pageConfig.timers, TEST_MODE, holdTransition, nextPage])

  if (isLoading) return <div className="loading">Loading...</div>

  return (
    <div className="pages-container" id="pages-container">
      {currentPage === 0 && <div className="page home" id="home">
          <div className="frames flxclm algc animated fadeInUp" style={{ marginTop: '10rem' }}>
            <h1 className="maintitle cyan-shadow">MASJID TUAN ABDULLAH</h1>
          </div>
        </div>}
      {currentPage === 1 && <Activity data={activity} onCycleComplete={handleCycleComplete} />}
      {currentPage === 2 && <WeeklyLecture data={kuliahData} onCycleComplete={handleCycleComplete} />}
      {currentPage === 3 && <MediaCarousel slides={slides} onCycleComplete={handleCycleComplete} />}
      {currentPage === 4 && <ReligiousEvent events={religiousEvents} prayerData={prayerData} onCycleComplete={handleCycleComplete} />}
    </div>
  )
}

