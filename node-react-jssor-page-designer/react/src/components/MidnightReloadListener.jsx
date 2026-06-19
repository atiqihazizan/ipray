import { useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { TIME_EVENTS } from '../utils/timeEvents';

/**
 * Listen date-changed dari driver masa (useTimeDriver); panggil checkMidnight supaya tiada setInterval 60s dalam DataContext.
 */
export default function MidnightReloadListener() {
  const { checkMidnight } = useData();

  useEffect(() => {
    const handler = (e) => {
      const todayStr = e.detail?.todayStr;
      if (todayStr && typeof checkMidnight === 'function') checkMidnight(todayStr);
    };
    window.addEventListener(TIME_EVENTS.DATE_CHANGED, handler);
    return () => window.removeEventListener(TIME_EVENTS.DATE_CHANGED, handler);
  }, [checkMidnight]);

  return null;
}
