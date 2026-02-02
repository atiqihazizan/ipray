import React, { Fragment, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { imageSlider } from "../assets/js-image-slider/js-image-slider.js";
import "../assets/js-image-slider/js-image-slider.css";
import { Page } from './Page'
import { ANIMATIONS, DELAYS } from '../utils/animations'

export const MediaCarousel = ({ slides = [], onCycleComplete }) => {
  // Skip render jika tiada slides dan panggil onCycleComplete untuk ke page seterusnya
  if (!Array.isArray(slides) || slides.length === 0) {
    onCycleComplete()
    return <Page id="slider" className="slider"></Page>
  }
  
  const slideRef = useRef(null)
  const videoRef = useRef(null)
  const timerRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [pause, setPause] = useState(true)
  const [isFirstTime, setIsFirstTime] = useState(true)
  const [isCycleComplete, setIsCycleComplete] = useState(false)

  // Map data MediaCarousel -> struktur sliderData (image/iframe/video)
  const sliderData = useMemo(() => {
    if (!Array.isArray(slides)) return []
    const mapped = slides.map((s, idx) => {
      const duration = s.duration || 5 // default 5 seconds
      if (s.isVid === 1) return { type: 'video', time: duration, src: './images/bg.jpg', path: s.path || '' }
      if (s.isVid === 2) return { type: 'iframe', time: duration, src: './images/bg.jpg', path: s.path || '' }
      return { type: 'image', time: duration, src: s.imgSrc || s.fileName, title: s.description || '', path: '' }
    })
    return mapped
  }, [slides])

  const nextSlide = useCallback(() => {
    if (!sliderData.length || isCycleComplete) return
    if (currentIndex === sliderData.length - 1) {
      setIsCycleComplete(true)
      setPause(true)
      return
    }
    const nextIndex = currentIndex + 1
    setCurrentIndex(nextIndex)
    try { imageSlider.displaySlide(nextIndex) } catch (_) {}
  }, [currentIndex, sliderData, isCycleComplete])

  const playCurrentVideo = useCallback(() => {
    const video = videoRef.current
    const path = sliderData[currentIndex]?.path
    if (!path) { setPause(false); nextSlide(); return }
    if (video) {
      setPause(true)
      // Pause video dulu untuk elakkan konflik
      video.pause()
      video.currentTime = 0
      video.src = path
      video.muted = true
      const playPromise = video.play()
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.then(() => { video.muted = false; videoRef.current && (videoRef.current.onended = () => { setPause(false); nextSlide() }) }).catch(() => { setPause(false); nextSlide() })
      } else {
        // Jika tiada Promise (browser lama)
        videoRef.current && (videoRef.current.onended = () => { setPause(false); nextSlide() })
      }
    } else { setPause(false); nextSlide() }
  }, [currentIndex, nextSlide, sliderData])

  // Auto progression - guna before/after slide change
  useEffect(() => {
    const handleBeforeSlideChange = () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      const v = videoRef.current
      if (v) { try { v.pause() } catch (_) {}; v.onended = null; v.currentTime = 0 }
    }

    const handleAfterSlideChange = (slideIndex, slideElement) => {
      if (pause) return
      
      // Gunakan slideIndex yang diberikan oleh slider library atau currentIndex sebagai fallback
      const actualIndex = typeof slideIndex === 'number' ? slideIndex : currentIndex
      
      // Update currentIndex jika slideIndex diberikan oleh slider library
      if (typeof slideIndex === 'number' && slideIndex !== currentIndex) setCurrentIndex(slideIndex)
      
      const currentItem = sliderData?.[actualIndex]
      if (!currentItem) return
      
      if (currentItem.type === 'video') { 
        playCurrentVideo(); 
        return 
      }
      
      const slideTime = (currentItem.time || 5) * 1000
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => { 
        nextSlide(); 
        setIsFirstTime(false) 
      }, slideTime)
    }

    // Daftarkan handler global yang digunakan oleh js-image-slider
    window.beforeSlideChange = handleBeforeSlideChange
    window.afterSlideChange = handleAfterSlideChange

    // Pasang timeout sekiranya tiada transisi awal yang trigger afterSlideChange (contoh: slide pertama statik)
    if (!pause && isFirstTime) setTimeout(() => handleAfterSlideChange(0), 100)

    return () => {
      if (window.beforeSlideChange === handleBeforeSlideChange) delete window.beforeSlideChange
      if (window.afterSlideChange === handleAfterSlideChange) delete window.afterSlideChange
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    }
  }, [currentIndex, pause, sliderData, nextSlide, playCurrentVideo, isFirstTime])

  // Init/Reload slider selepas slides berubah
  useEffect(() => {
    setPause(true)
    setCurrentIndex(0)
    setIsCycleComplete(false)
    if (sliderData && sliderData.length) {
      try { imageSlider.reload() } catch (_) {}
    }
    const checkSlider = setInterval(() => {
      if (slideRef.current) {
        try { imageSlider.reload() } catch (_) {}
        setPause(false)
        clearInterval(checkSlider)
      }
    }, 100)
    return () => clearInterval(checkSlider)
  }, [sliderData])

  // Notify parent bila cycle complete
  useEffect(() => { if (isCycleComplete && onCycleComplete) onCycleComplete() }, [isCycleComplete, onCycleComplete])

  return (
    <Page ref={slideRef} id="slider" className="slider">
      {sliderData.map((img, idx) => (
        <Fragment key={idx}>
          {(img.type === 'image' || img.type === 'img') && (
            <a href="#">
              <img 
                src={img.src} 
                alt={img.title || ''}
              />
            </a>
          )}
          {img.type === 'iframe' && (
            <a href="#">
              <img src={img.src} alt={img.title || ''} />
              {currentIndex === idx && (
                <iframe
                  src={img.path}
                  className={'absolute w-full h-full border-0 z-10'}
                  allowFullScreen
                ></iframe>
              )}
            </a>
          )}
          {img.type === 'video' && (
            <a className="video">
              <video
                preload="none"
                data-image={img.src}
                ref={currentIndex === idx ? videoRef : null}
                style={{ display: 'block', position: 'absolute', width: '100%', height: '100%', border: 0, zIndex: 1 }}
                type="video/mp4"
              ></video>
            </a>
          )}
        </Fragment>
      ))}
    </Page>
  )
}
