import { useTimeDriver } from '../hooks/useTimeDriver';

/**
 * Satu-satunya tempat yang memanggil useTimeDriver — satu interval untuk masa,
 * dispatch time-update dan event lain (hijri, prayer, date-changed) via window.
 * Render null; tiada provider.
 */
export default function TimeDriver() {
  useTimeDriver();
  return null;
}
