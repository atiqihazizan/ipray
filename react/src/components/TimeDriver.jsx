import { useTimeDriver } from '../hooks/useTimeDriver'

/**
 * Komponen dedikasi untuk driver masa.
 * Panggil useTimeDriver() di sini sahaja supaya hanya satu interval wujud.
 * Return null supaya bila state time/snapshot update setiap saat,
 * hanya komponen ini re-render — AppContent dan tree lain tidak terjejas.
 */
const TimeDriver = () => {
  useTimeDriver()
  return null
}

export default TimeDriver
