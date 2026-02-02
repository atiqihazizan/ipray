import React from 'react'
import { ANIMATIONS, DELAYS, ANIMATION_PRESETS } from '../utils/animations'

/**
 * Komponen Page yang boleh dicustomkan untuk semua halaman
 * Menggunakan React.forwardRef untuk support ref
 * @param {Object} props - Props untuk komponen Page
 * @param {string} props.id - ID untuk page (required)
 * @param {string} props.className - Class tambahan untuk page
 * @param {string} props.animation - Jenis animasi (fadeIn, fadeInLeft, fadeInRight, fadeInUp, fadeInDown)
 * @param {string} props.delay - Delay untuk animasi (delay-1s, delay-2s, etc)
 * @param {boolean} props.animated - Enable/disable animasi (default: true)
 * @param {React.ReactNode} props.children - Content untuk page
 * @param {Object} props.style - Inline styles
 */
export const Page = React.forwardRef(({ 
  id, 
  className = '', 
  animation = ANIMATION_PRESETS.PAGE_ENTRANCE, 
  delay = '', 
  animated = true,
  children, 
  style = {},
  ...props 
}, ref) => {
  // Build class names
  const baseClasses = 'page'
  const animationClass = animated ? `animated ${animation}` : ''
  const delayClass = delay ? delay : ''
  const customClass = className ? className : ''
  
  // Combine all classes
  const combinedClasses = [baseClasses, animationClass, delayClass, customClass]
    .filter(Boolean)
    .join(' ')

  return (
    <div 
      ref={ref}
      id={id}
      className={combinedClasses}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
})

// Set display name untuk debugging
Page.displayName = 'Page'

// Re-export untuk kemudahan
export { ANIMATIONS, DELAYS, ANIMATION_PRESETS }
