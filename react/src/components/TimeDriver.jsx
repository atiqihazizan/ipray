import { useTimeDriver } from '../hooks/useTimeDriver'

/**
 * Komponen dedikasi untuk driver masa.
 * Panggil useTimeDriver() di sini sahaja supaya hanya satu interval wujud.
 * Data masa dihantar ke komponen lain via window event (dispatchTimeUpdate),
 * bukan melalui React state — jadi tiada re-render dari tick masa.
 */
const TimeDriver = () => {
  useTimeDriver()
  return null
}

export default TimeDriver
