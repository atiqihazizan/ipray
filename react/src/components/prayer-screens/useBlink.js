import { useState, useEffect } from 'react';
import { TIME_EVENTS } from '../../utils/timeEvents';

/**
 * Hook blink — toggle setiap saat mengikut event TIME_UPDATE (sama seperti dot dalam DisplayTime).
 * @returns {boolean} blink — true/false bergilir setiap saat
 */
export function useBlink() {
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const handler = () => setBlink(prev => !prev);
    window.addEventListener(TIME_EVENTS.TIME_UPDATE, handler);
    return () => window.removeEventListener(TIME_EVENTS.TIME_UPDATE, handler);
  }, []);

  return blink;
}
