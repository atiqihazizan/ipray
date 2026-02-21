import { createContext, useContext, useState, useEffect, useRef } from 'react';
import socketService from '../services/socketService';
import timeServiceStub from '../services/timeServiceStub';

/**
 * Konteks untuk kalibrasi masa. Guna timeServiceStub (Date.now() sahaja).
 * Bila masa kalibrasi berubah (test/offset) atau time-system-updated, reload window.
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

    const handleReload = () => {
      if (isMountedRef.current) window.location.reload();
    };

    const handleTimeCalibrationUpdate = () => {
      if (!isMountedRef.current) return;
      timeServiceStub
        .syncWithServer()
        .then(handleReload)
        .catch(() => {
          console.warn('[TimeSync] Sync failed after calibration update');
        });
    };

    const unsubOffset = socketService.on('time-offset-updated', () => {
      if (isMountedRef.current) handleTimeCalibrationUpdate();
    });
    const unsubSystemUpdated = socketService.on('time-system-updated', handleReload);

    return () => {
      isMountedRef.current = false;
      unsubOffset();
      unsubSystemUpdated();
    };
  }, []);

  const value = { timeSyncVersion, timeService: timeServiceStub };

  return (
    <TimeSyncContext.Provider value={value}>
      {children}
    </TimeSyncContext.Provider>
  );
};
