/**
 * Animation Constants untuk digunakan secara meluas dalam aplikasi
 * Mengandungi semua jenis animasi dan delay yang tersedia
 */

// Animasi Fade
export const FADE_ANIMATIONS = {
  FADE_IN: 'fadeIn',
  FADE_IN_LEFT: 'fadeInLeft', 
  FADE_IN_RIGHT: 'fadeInRight',
  FADE_IN_UP: 'fadeInUp',
  FADE_IN_DOWN: 'fadeInDown',
  FADE_OUT: 'fadeOut',
  FADE_OUT_LEFT: 'fadeOutLeft',
  FADE_OUT_RIGHT: 'fadeOutRight',
  FADE_OUT_UP: 'fadeOutUp',
  FADE_OUT_DOWN: 'fadeOutDown'
}

// Animasi Slide
export const SLIDE_ANIMATIONS = {
  SLIDE_IN_LEFT: 'slideInLeft',
  SLIDE_IN_RIGHT: 'slideInRight',
  SLIDE_IN_UP: 'slideInUp',
  SLIDE_IN_DOWN: 'slideInDown',
  SLIDE_OUT_LEFT: 'slideOutLeft',
  SLIDE_OUT_RIGHT: 'slideOutRight',
  SLIDE_OUT_UP: 'slideOutUp',
  SLIDE_OUT_DOWN: 'slideOutDown'
}

// Animasi Zoom
export const ZOOM_ANIMATIONS = {
  ZOOM_IN: 'zoomIn',
  ZOOM_IN_UP: 'zoomInUp',
  ZOOM_IN_DOWN: 'zoomInDown',
  ZOOM_IN_LEFT: 'zoomInLeft',
  ZOOM_IN_RIGHT: 'zoomInRight',
  ZOOM_OUT: 'zoomOut',
  ZOOM_OUT_UP: 'zoomOutUp',
  ZOOM_OUT_DOWN: 'zoomOutDown',
  ZOOM_OUT_LEFT: 'zoomOutLeft',
  ZOOM_OUT_RIGHT: 'zoomOutRight'
}

// Animasi Bounce
export const BOUNCE_ANIMATIONS = {
  BOUNCE_IN: 'bounceIn',
  BOUNCE_IN_UP: 'bounceInUp',
  BOUNCE_IN_DOWN: 'bounceInDown',
  BOUNCE_IN_LEFT: 'bounceInLeft',
  BOUNCE_IN_RIGHT: 'bounceInRight',
  BOUNCE_OUT: 'bounceOut',
  BOUNCE_OUT_UP: 'bounceOutUp',
  BOUNCE_OUT_DOWN: 'bounceOutDown',
  BOUNCE_OUT_LEFT: 'bounceOutLeft',
  BOUNCE_OUT_RIGHT: 'bounceOutRight'
}

// Animasi Rotate
export const ROTATE_ANIMATIONS = {
  ROTATE_IN: 'rotateIn',
  ROTATE_IN_DOWN_LEFT: 'rotateInDownLeft',
  ROTATE_IN_DOWN_RIGHT: 'rotateInDownRight',
  ROTATE_IN_UP_LEFT: 'rotateInUpLeft',
  ROTATE_IN_UP_RIGHT: 'rotateInUpRight',
  ROTATE_OUT: 'rotateOut',
  ROTATE_OUT_DOWN_LEFT: 'rotateOutDownLeft',
  ROTATE_OUT_DOWN_RIGHT: 'rotateOutDownRight',
  ROTATE_OUT_UP_LEFT: 'rotateOutUpLeft',
  ROTATE_OUT_UP_RIGHT: 'rotateOutUpRight'
}

// Animasi Flip
export const FLIP_ANIMATIONS = {
  FLIP_IN_X: 'flipInX',
  FLIP_IN_Y: 'flipInY',
  FLIP_OUT_X: 'flipOutX',
  FLIP_OUT_Y: 'flipOutY'
}

// Animasi Light Speed
export const LIGHTSPEED_ANIMATIONS = {
  LIGHTSPEED_IN: 'lightSpeedIn',
  LIGHTSPEED_OUT: 'lightSpeedOut'
}

// Animasi Pulse
export const PULSE_ANIMATIONS = {
  PULSE: 'pulse',
  HEARTBEAT: 'heartBeat',
  SHAKE: 'shake',
  SWING: 'swing',
  TADA: 'tada',
  WOBBLE: 'wobble',
  JELLO: 'jello',
  BOUNCE: 'bounce',
  FLASH: 'flash',
  RUBBER_BAND: 'rubberBand'
}

// Semua animasi dalam satu object untuk kemudahan
export const ANIMATIONS = {
  ...FADE_ANIMATIONS,
  ...SLIDE_ANIMATIONS,
  ...ZOOM_ANIMATIONS,
  ...BOUNCE_ANIMATIONS,
  ...ROTATE_ANIMATIONS,
  ...FLIP_ANIMATIONS,
  ...LIGHTSPEED_ANIMATIONS,
  ...PULSE_ANIMATIONS
}

// Delay constants
export const DELAYS = {
  DELAY_1S: 'delay-1s',
  DELAY_2S: 'delay-2s', 
  DELAY_3S: 'delay-3s',
  DELAY_4S: 'delay-4s',
  DELAY_5S: 'delay-5s',
  DELAY_6S: 'delay-6s',
  DELAY_7S: 'delay-7s',
  DELAY_8S: 'delay-8s',
  DELAY_9S: 'delay-9s',
  DELAY_10S: 'delay-10s'
}

// Duration constants (jika diperlukan)
export const DURATIONS = {
  SLOW: 'slow',
  SLOWER: 'slower',
  FAST: 'fast',
  FASTER: 'faster'
}

// Animation presets untuk kegunaan biasa
export const ANIMATION_PRESETS = {
  // Page entrance animations
  PAGE_ENTRANCE: FADE_ANIMATIONS.FADE_IN,
  PAGE_ENTRANCE_LEFT: FADE_ANIMATIONS.FADE_IN_LEFT,
  PAGE_ENTRANCE_RIGHT: FADE_ANIMATIONS.FADE_IN_RIGHT,
  PAGE_ENTRANCE_UP: FADE_ANIMATIONS.FADE_IN_UP,
  PAGE_ENTRANCE_DOWN: FADE_ANIMATIONS.FADE_IN_DOWN,
  
  // Content animations
  CONTENT_FADE_IN: FADE_ANIMATIONS.FADE_IN,
  CONTENT_SLIDE_IN: SLIDE_ANIMATIONS.SLIDE_IN_UP,
  CONTENT_ZOOM_IN: ZOOM_ANIMATIONS.ZOOM_IN,
  
  // Interactive animations
  BUTTON_HOVER: PULSE_ANIMATIONS.PULSE,
  NOTIFICATION: BOUNCE_ANIMATIONS.BOUNCE_IN,
  ALERT: PULSE_ANIMATIONS.SHAKE,
  
  // Exit animations
  PAGE_EXIT: FADE_ANIMATIONS.FADE_OUT,
  CONTENT_EXIT: FADE_ANIMATIONS.FADE_OUT_LEFT
}

// Helper functions
export const getAnimationClass = (animation, delay = '', duration = '') => {
  const classes = ['animated', animation]
  if (delay) classes.push(delay)
  if (duration) classes.push(duration)
  return classes.join(' ')
}

export const isFadeAnimation = (animation) => {
  return Object.values(FADE_ANIMATIONS).includes(animation)
}

export const isSlideAnimation = (animation) => {
  return Object.values(SLIDE_ANIMATIONS).includes(animation)
}

export const isZoomAnimation = (animation) => {
  return Object.values(ZOOM_ANIMATIONS).includes(animation)
}

export const isBounceAnimation = (animation) => {
  return Object.values(BOUNCE_ANIMATIONS).includes(animation)
}
