import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import socketService from '../services/socketService';
import timeService from '../services/timeService';

/**
 * Default constants untuk timing configuration (fallback jika file config.txt tidak wujud)
 */
const DEFAULT_PRAYER_TIME_CONFIG = {
  HOLD_DURATION: 60000,
  BLINK_DURATION: 15000,
  BEEP_COUNT: 5,
  WARNING_START_SECONDS: 30,
  WARNING_BEEP_COUNT: 0,
  AZAN_DURATION_MIN: 0.5,
  IQAMAH_DURATION_MIN: 2,
  SOLAT_DURATION_MIN: 3,
};

/**
 * Default constants untuk warna (fallback jika file config.txt tidak wujud)
 */
const DEFAULT_COLOR_CONFIG = {
  DEFAULT: '#FFFF00',
  NEXT_PRAYER: '#90EE90',
  WARNING_PRAYER: '#FF0000',
};

/**
 * Data Context untuk menyimpan semua data dalam memory
 * Fetch sekali sahaja untuk elakkan fetch berulang kali
 */
const DataContext = createContext(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [takwimArray, setTakwimArray] = useState(null);
  const [takwimParsed, setTakwimParsed] = useState(null);
  const [announcementsData, setAnnouncementsData] = useState(null);
  const [kuliahData, setKuliahData] = useState(null);
  const [kuliahBatalData, setKuliahBatalData] = useState(null);
  const [imagesData, setImagesData] = useState(null);
  const [slidesConfigData, setSlidesConfigData] = useState(null);
  const [slideshowData, setSlideshowData] = useState(null);
  const [configData, setConfigData] = useState({
    PRAYER_TIME_CONFIG: DEFAULT_PRAYER_TIME_CONFIG,
    COLOR_CONFIG: DEFAULT_COLOR_CONFIG
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false); // Track Socket.IO connection status
  const [socketReady, setSocketReady] = useState(false); // Flag untuk indicate socket sudah attempt connect
  const [isReloading, setIsReloading] = useState(false); // Flag untuk indicate data reload in progress
  const [reloadCounter, setReloadCounter] = useState(0); // Counter untuk force data refresh

  /**
   * Load semua data sekali sahaja dari API (parsed di server, tiada parsing di client)
   */
  const loadAllData = useCallback(async () => {
    try {
      setIsReloading(true);
      setLoading(true);
      setError(null);
      setReloadCounter(prev => prev + 1);

      const isDev = import.meta.env.DEV;
      const API_BASE = isDev ? '/api' : 'http://localhost:3001/api';
      const res = await fetch(`${API_BASE}/data/app?t=${Date.now()}`);
      if (!res.ok) {
        throw new Error('Gagal memuatkan data aplikasi');
      }
      const data = await res.json();

      setTakwimArray(data.takwim?.takwimArray ?? []);
      setTakwimParsed(data.takwim?.takwimParsed ?? null);
      setAnnouncementsData(data.announcements ?? []);
      setKuliahData(data.kuliah ?? []);
      setKuliahBatalData(data.kuliahBatal ?? []);
      setImagesData(data.images ?? {});
      setSlidesConfigData(data.slidesConfig ?? {});
      setSlideshowData(data.slideshow ?? []);
      setConfigData(data.config ?? {
        PRAYER_TIME_CONFIG: DEFAULT_PRAYER_TIME_CONFIG,
        COLOR_CONFIG: DEFAULT_COLOR_CONFIG
      });

      setLoading(false);
      setTimeout(() => {
        setIsReloading(false);
      }, 100);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setIsReloading(false);
      setTakwimArray([]);
      setTakwimParsed(null);
      setAnnouncementsData([]);
      setKuliahData([]);
      setKuliahBatalData([]);
      setImagesData({});
      setSlidesConfigData({});
      setSlideshowData([]);
    }
  }, []);

  /**
   * Load takwim sahaja (tanpa ganggu slide / loading penuh) - guna API full supaya wdata lengkap, elak waktu 00
   */
  const loadTakwimOnly = useCallback(async () => {
    try {
      const isDev = import.meta.env.DEV;
      const API_BASE = isDev ? '/api' : 'http://localhost:3001/api';
      const res = await fetch(`${API_BASE}/data/app/takwim/full?t=${Date.now()}`);
      
      if (!res.ok) return;
      const data = await res.json();
      setTakwimArray(data.takwimArray ?? []);
      setTakwimParsed(data.takwimParsed ?? null);
    } catch (err) {
      // Silent fail - jangan ganggu state lain
    }
  }, []);

  /**
   * Initialize time service
   */
  useEffect(() => {
    timeService.init().catch((error) => {
      console.warn('Time service init failed:', error);
    });
    
    return () => {
      timeService.cleanup();
    };
  }, []);

  /**
   * Load data hanya bila Socket.IO connected
   */
  useEffect(() => {
    // Tunggu socket ready dan connected, baru load data
    if (socketReady && socketConnected) {
      loadAllData();
    } else if (socketReady && !socketConnected) {
      // Sambungan gagal - skip operations
      setLoading(false);
      setError('Sambungan gagal. Sila cuba semula.');
    }
  }, [socketReady, socketConnected, loadAllData]);

  /**
   * Setup Socket.IO connection untuk real-time updates
   * CRITICAL: App hanya berjalan bila Socket.IO connected
   */
  useEffect(() => {
    let connectTimeout;
    let readyTimeout;
    let reloadDebounceTimer;
    let takwimReloadDebounceTimer;
    let isMounted = true;

    const debouncedReload = () => {
      if (reloadDebounceTimer) clearTimeout(reloadDebounceTimer);
      reloadDebounceTimer = setTimeout(() => {
        if (isMounted && socketConnected) loadAllData();
      }, 500);
    };

    const debouncedLoadTakwimOnly = () => {
      if (takwimReloadDebounceTimer) clearTimeout(takwimReloadDebounceTimer);
      takwimReloadDebounceTimer = setTimeout(() => {
        if (isMounted && socketConnected) loadTakwimOnly();
      }, 500);
    };

    // Delay connection sedikit untuk elak connection error pada initial load
    connectTimeout = setTimeout(() => {
      if (isMounted) {
        try {
          // Biarkan socketService auto-detect URL berdasarkan environment
          socketService.connect();
        } catch (error) {
          if (isMounted) {
            setSocketReady(true);
            setSocketConnected(false);
          }
        }
      }
    }, 1000); // Wait 1 second for server to be ready

    // Timeout untuk declare socket ready (after attempting connection)
    readyTimeout = setTimeout(() => {
      if (isMounted && !socketConnected) {
        // After 5 seconds, jika masih tidak connected, declare ready tapi fail
        setSocketReady(true);
        setSocketConnected(false);
      }
    }, 5000); // 5 seconds timeout

    // Listen for connection success
    const unsubscribeConnect = socketService.on('connect', (data) => {
      if (isMounted) {
        setSocketConnected(true);
        setSocketReady(true);
        if (readyTimeout) {
          clearTimeout(readyTimeout);
        }
      }
    });

    // Listen for disconnect
    const unsubscribeDisconnect = socketService.on('disconnect', (data) => {
      if (isMounted) {
        setSocketConnected(false);
        // Don't reload data bila disconnect - keep existing data
      }
    });

    // Listen for connection error
    const unsubscribeError = socketService.on('error', (data) => {
      if (isMounted) {
        setSocketReady(true);
        setSocketConnected(false);
      }
    });

    // Takwim sahaja dikemas kini - slide tidak terganggu
    const unsubscribeTakwimRefresh = socketService.on('takwim:refresh', () => {
      if (isMounted && socketConnected) debouncedLoadTakwimOnly();
    });

    // Data lain (announcements, kuliah, images, slides, config) - full reload
    const unsubscribeDataUpdated = socketService.on('data:updated', () => {
      if (isMounted && socketConnected) debouncedReload();
    });

    // Reboot - reload window
    const unsubscribeReboot = socketService.on('reboot', () => {
      if (isMounted) window.location.reload();
    });

    // Nota: Event kalibrasi masa (time-offset-updated, time-test-mode-enabled, time-test-mode-disabled)
    // diurus oleh TimeSyncProvider supaya hanya paparan masa re-render, elak seluruh app reload

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (connectTimeout) {
        clearTimeout(connectTimeout);
      }
      if (readyTimeout) {
        clearTimeout(readyTimeout);
      }
      if (reloadDebounceTimer) clearTimeout(reloadDebounceTimer);
      if (takwimReloadDebounceTimer) clearTimeout(takwimReloadDebounceTimer);
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeError();
      unsubscribeTakwimRefresh();
      unsubscribeDataUpdated();
      unsubscribeReboot();
      // Don't disconnect during React StrictMode cleanup - let it reconnect
      // socketService.disconnect();
    };
  }, [socketConnected, loadAllData, loadTakwimOnly]);

  const value = {
    takwimArray,
    takwimParsed,
    announcementsData,
    kuliahData,
    kuliahBatalData,
    imagesData,
    slidesConfigData,
    slideshowData,
    loading,
    error,
    socketConnected, // Expose Socket.IO connection status
    socketReady, // Expose socket ready status
    isReloading, // Expose reload status
    reloadCounter, // Expose reload counter untuk force refresh di hooks
    refresh: loadAllData,
    PRAYER_TIME_CONFIG: configData.PRAYER_TIME_CONFIG,
    COLOR_CONFIG: configData.COLOR_CONFIG,
    timeService
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
