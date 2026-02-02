import React, { useState, useCallback, useEffect } from 'react'
import { PrayerTimes } from './components/PrayerTimes'
import { DateBar } from './components/DateBar'
import { PagesContainer } from './components/PagesContainer'
import { usePrayerTimes } from './hooks/usePrayerTimes'
import './App.css'

function App() {
  const [currentAttributes, setCurrentAttributes] = useState(0)
  const [loadedData, setLoadedData] = useState({ prayerData: null, config: null })

  // Use prayer times hook untuk dapatkan holdTransition state
  const { holdTransition } = usePrayerTimes(loadedData.prayerData, loadedData.config)

  // Calculate display attributes
  const showDateBar = (currentAttributes & 1) !== 0
  const showPrayerBlock = (currentAttributes & 2) !== 0
  const showTimeBlock = (currentAttributes & 4) !== 0
  const showMsgBar = (currentAttributes & 8) !== 0

  const handlePageChange = useCallback((pageNumber, attributes) => setCurrentAttributes(attributes), [])
  const handleDataLoaded = useCallback((data) => setLoadedData(data), [])
  
  // Pastikan attributes di-set dengan betul apabila holdTransition aktif
  useEffect(() => {
    if (holdTransition && loadedData.config) {
      // Untuk holdTransition, gunakan default attributes page 0: DateBar + PrayerBlock + MsgBar (TIDAK ada TimeBlock)
      const page0Attributes = (loadedData.config && Array.isArray(loadedData.config.attributes) && loadedData.config.attributes.length) 
        ? loadedData.config.attributes[0] 
        : 11 // Default untuk page 0: showDateBar + showPrayerBlock + showMsgBar (binary 1011)
      setCurrentAttributes(page0Attributes)
    }
  }, [holdTransition, loadedData.config])

  return (
    <div className="app bg-blackdark">
      {showDateBar && loadedData.prayerData && <DateBar prayerData={loadedData.prayerData} />}
      
      <PagesContainer onPageChange={handlePageChange} onDataLoaded={handleDataLoaded} holdTransition={holdTransition} />
      
      {(showPrayerBlock || showTimeBlock) && loadedData.prayerData && loadedData.config && (
        <PrayerTimes 
          prayerData={loadedData.prayerData} 
          config={loadedData.config} 
          showPrayerTimes={showPrayerBlock} 
          showTime={showTimeBlock} 
        />
      )}
    </div>
  )
}

export default App
