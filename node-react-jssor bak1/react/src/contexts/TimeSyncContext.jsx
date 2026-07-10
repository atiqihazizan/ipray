import { createContext, useContext, useState, useEffect, useRef } from 'react';
import socketService from '../services/socketService';
import timeService from '../services/timeService';

/**
 * Konteks untuk kalibrasi masa.
 * Bila masa kalibrasi berubah (test/offset), sync dengan server kemudian reload window (seperti reboot).
 */
const TimeSyncContext = createContext(null);

export const useTimeSync = () => {
  const context = useContext(TimeSyncContext);
  if (!context) {
    throw new Error('useTimeSync must be used within TimeSyncProvider');
  }
  return context;
};

export const TimeSyncProvider = ({ children }) => {
  const [timeSyncVersion, setTimeSyncVersion] = useState(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const handleTimeCalibrationUpdate = () => {
      if (!isMountedRef.current) return;
      timeService
        .syncWithServer()
        .then(() => {
          if (isMountedRef.current) window.location.reload();
        })
        .catch(() => {
          console.warn('[TimeSync] Sync failed after calibration update');
        });
    };

    const unsubOffset = socketService.on('time-offset-updated', () => {
      if (isMountedRef.current) handleTimeCalibrationUpdate();
    });
    const unsubTestOn = socketService.on('time-test-mode-enabled', () => {
      if (isMountedRef.current) handleTimeCalibrationUpdate();
    });
    const unsubTestOff = socketService.on('time-test-mode-disabled', () => {
      if (isMountedRef.current) handleTimeCalibrationUpdate();
    });

    return () => {
      isMountedRef.current = false;
      unsubOffset();
      unsubTestOn();
      unsubTestOff();
    };
  }, []);

  const value = { timeSyncVersion, timeService };

  return (
    <TimeSyncContext.Provider value={value}>
      {children}
    </TimeSyncContext.Provider>
  );
};
