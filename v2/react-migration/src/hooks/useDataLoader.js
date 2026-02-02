import { useState, useEffect, useRef } from 'react'
import { computeDaysLeft } from '../utils/date'

export const useDataLoader = () => {
  const [prayerData, setPrayerData] = useState(null)
  const [activity, setActivity] = useState([])                 // Activity (program)
  const [kuliahData, setKuliahData] = useState([])             // WeeklyLecture (kuliah)
  const [religiousEvents, setReligiousEvents] = useState([])   // ReligiousEvent (religious)
  const [slides, setSlides] = useState([])                     // MediaCarousel (slide)
  const [config, setConfig] = useState({ timeFormat: true }) // default 24 hour
  const [isLoading, setIsLoading] = useState(true)
  const blobUrlsRef = useRef([])

  // Load data from Electron API or fallback to fetch
  const loadData = async () => {
    try {
      // Check if running in Electron
      if (window.electronAPI) {
        await loadDataFromElectron()
      } else {
        // Fallback untuk development mode (browser)
        await loadDataFromBrowser()
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setIsLoading(false)
    }
  }

  const loadDataFromElectron = async () => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API tidak tersedia')
      }

      // Load config data
      const configData = window.electronAPI.readFile('data/system-config.txt')
      if (configData) {
        const parsedConfig = parseConfigData(configData)
        setConfig(parsedConfig)
      }

      // Load prayer times data
      const takwimData = window.electronAPI.readFile('data/prayer-times.txt')
      if (takwimData) {
        const parsedData = parseWaktuData(takwimData)
        setPrayerData(parsedData)
      }

      // Load other data
      const religiousData = window.electronAPI.getData('religious')  // ReligiousEvent
      const kuliahData = window.electronAPI.getData('kuliah')        // WeeklyLecture  
      const activityData = window.electronAPI.getData('program')      // Activity
      const slideData = window.electronAPI.getData('slide')          // MediaCarousel: kini objek siap proses

      // Process announcements (Activity)
      if (activityData) {
        const processed = processActivityData(activityData)
        setActivity(processed)
      }

      // Process kuliah data (WeeklyLecture)
      if (kuliahData) {
        const processed = processKuliahData(kuliahData)
        setKuliahData(processed)
      }

      // Process upcoming events (ReligiousEvent)
      if (religiousData) {
        const processed = processReligiousEvents(religiousData)
        setReligiousEvents(processed)
      }

      // Process slides (MediaCarousel) -> cipta Blob URL jika imgSrcBlob tersedia
      const rawSlides = Array.isArray(slideData) ? slideData : []

      // Revoke URL lama sebelum cipta baharu
      if (blobUrlsRef.current.length) {
        blobUrlsRef.current.forEach(u => { try { URL.revokeObjectURL(u) } catch (_) {} })
        blobUrlsRef.current = []
      }

      const toBlobUrl = async (hint) => {
        try {
          if (!hint || !window.electronAPI?.readArrayBuffer) return null
          const ab = await window.electronAPI.readArrayBuffer(hint.absPath)
          if (!ab) return null
          const url = URL.createObjectURL(new Blob([ab], { type: hint.mime }))
          blobUrlsRef.current.push(url)
          return url
        } catch (_) { return null }
      }

      const upgradedSlides = await Promise.all(rawSlides.map(async s => {
        if (s?.imgSrcBlob) {
          const url = await toBlobUrl(s.imgSrcBlob)
          if (url) return { ...s, imgSrc: url }
        }
        return s
      }))
      setSlides(upgradedSlides)

      setIsLoading(false)
    } catch (error) {
      console.error('Error loading data from Electron:', error)
      setIsLoading(false)
    }
  }

  const loadDataFromBrowser = async () => {
    try {
      // Fallback untuk development mode - tiada data mock

      // Default config
      const defaultConfig = { timeFormat: true }
      setConfig(defaultConfig)

      // Set empty data
      setPrayerData(null)
      setActivity([])
      setKuliahData([])
      setReligiousEvents([])
      setSlides([])

      setIsLoading(false)
    } catch (error) {
      console.error('Error in browser mode:', error)
      setIsLoading(false)
    }
  }

  // Parse config data
  const parseConfigData = (text) => {
    const lines = text.split('\n')
    const config = {
      timeFormat: true, // default 24 hour
      imsakDisplay: false, // default hide imsak
      attributes: [], // default empty, will fallback in App.jsx
      timers: [] // default empty, will fallback in PagesContainer.jsx
    }

    lines.forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('TIME_FORMAT=')) {
        const value = trimmedLine.split('=')[1]
        config.timeFormat = value === '1' // 1 = 24 hour, 0 = 12 hour
      }
      if (trimmedLine.startsWith('IMSAK_DISPLAY=')) {
        const value = trimmedLine.split('=')[1]
        config.imsakDisplay = value === '1' // 1 = show, 0 = hide
      }
      // Parse ATT_VW* lines e.g., ATT_VW0=11
      if (trimmedLine.startsWith('ATT_VW')) {
        const [key, valueStr] = trimmedLine.split('=')
        const indexStr = key.replace('ATT_VW', '')
        const index = parseInt(indexStr, 10)
        const value = parseInt(valueStr, 10)
        if (!Number.isNaN(index) && !Number.isNaN(value)) {
          config.attributes[index] = value
        }
      }
      // Parse TMR_VW* lines e.g., TMR_VW0=3 (in seconds, convert to milliseconds)
      if (trimmedLine.startsWith('TMR_VW')) {
        const [key, valueStr] = trimmedLine.split('=')
        const indexStr = key.replace('TMR_VW', '')
        const index = parseInt(indexStr, 10)
        const value = parseInt(valueStr, 10)
        if (!Number.isNaN(index) && !Number.isNaN(value)) {
          config.timers[index] = value * 1000 // convert seconds to milliseconds
        }
      }
    })

    return config
  }

  // Parse waktu data - sama seperti original ParseWaktu function
  const parseWaktuData = (text) => {
    const atext = text.split("\r\n")
    const btext = atext[1].split("=")
    const ctext = btext[1]
    const hdata = [24]

    for (let i = 0, j = ctext.length; i < j; i += 2) {
      const dd = parseInt(ctext.substr(i, 2), 16)
      hdata.push(dd)
    }

    const wdata = [0]
    for (let i = 2, j = atext.length; i < j; i++) {
      const dtext = atext[i].split("\t")
      if (dtext.length == 8) {
        const data = []
        for (let k = 1; k < 8; k++) {
          data.push(TimeToVal(dtext[k]))
        }
        data.push(dtext[0])
        wdata.push(data)
      }
    }

    return { hdata, wdata }
  }

  const TimeToVal = (txt) => {
    const atxt = txt.split(":")
    return parseInt(atxt[0]) * 100 + parseInt(atxt[1])
  }

  // Process activity data for announcements
  const processActivityData = (data) => {
    if (!data || typeof data !== 'string') return []
    
    return data.split('\n')
      .filter(line => {
        const trimmed = line.trim()
        return trimmed !== '' && !trimmed.startsWith('//')
      })
      .map(line => {
        const parts = line.split('|')
        if (parts.length < 5) {
          // console.warn('Invalid activity data format:', line)
          return null
        }
        const [dateTime, title, location, description, audience] = parts
        const [date, time] = dateTime.split(' ')
        return { date, time, title, location, description, audience }
      })
      .filter(item => item !== null)
      .filter(item => computeDaysLeft(item.date) >= 0)
      .map(item => {
        return { ...item, daysLeft: computeDaysLeft(item.date) }
      })
  }

  // Process kuliah data
  const processKuliahData = (data) => {
    if (!data || typeof data !== 'string') return []
    
    return data.split('\n')
      .filter(line => {
        const trimmed = line.trim()
        return trimmed !== '' && !trimmed.startsWith('//')
      })
      .map(line => {
        const parts = line.split('|')
        if (parts.length < 5) {
          // console.warn('Invalid kuliah data format:', line)
          return null
        }
        const [dateTime, title, speaker, topic, audience] = parts
        const [date, time] = dateTime.split(' ')
        return { date, time, title, speaker, topic, audience }
      })
      .filter(item => item !== null)
      .filter(item => {
        // Filter for this week's kuliah
        const eventDate = new Date(item.date)
        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
        startOfWeek.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6) // Sunday
        endOfWeek.setHours(23, 59, 59, 999)

        return eventDate >= startOfWeek && eventDate <= endOfWeek
      })
  }

  // Process religious events for countdown
  const processReligiousEvents = (data) => {
    if (!data || typeof data !== 'string') return []
    
    return data.split('\n')
      .filter(line => {
        const trimmed = line.trim()
        return trimmed !== '' && !trimmed.startsWith('//')
      })
      .map(line => {
        const parts = line.split('|')
        if (parts.length < 2) return null
        const [date, name] = parts
        return { date, name }
      })
      .filter(item => item !== null)
      .filter(item => computeDaysLeft(item.date) >= 0)
      .map(item => ({ ...item, daysLeft: computeDaysLeft(item.date) }))
  }
 
  // processSlideData dipindahkan ke util/getData.js (diproses di preload)

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  // Listen for file changes from Electron
  useEffect(() => {
    const handleFileChange = () => {
      loadData()
    }

    if (window.electronAPI) {
      // Listen for file change events from Electron
      window.addEventListener('file-changed', handleFileChange)
      return () => window.removeEventListener('file-changed', handleFileChange)
    }
    return () => {
      if (blobUrlsRef.current.length) {
        blobUrlsRef.current.forEach(u => { try { URL.revokeObjectURL(u) } catch (_) {} })
        blobUrlsRef.current = []
      }
    }
  }, [])

  return {
    prayerData,
    activity,
    kuliahData,
    religiousEvents,
    slides,
    config,
    isLoading,
    reloadData: loadData
  }
}
