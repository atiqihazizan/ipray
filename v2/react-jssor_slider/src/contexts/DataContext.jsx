import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import socketService from '../services/socketService';

/**
 * Default constants untuk timing configuration (fallback jika file config.txt tidak wujud)
 */
const DEFAULT_PRAYER_TIME_CONFIG = {
  HOLD_DURATION: 60000,
  BLINK_DURATION: 15000,
  BEEP_COUNT: 5,
  WARNING_START_SECONDS: 30,
  WARNING_BEEP_COUNT: 0,
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
  const [takwimText, setTakwimText] = useState(null); // Raw text untuk processing di component level
  const [announcementsData, setAnnouncementsData] = useState(null);
  const [kuliahData, setKuliahData] = useState(null);
  const [imagesData, setImagesData] = useState(null); // Mapping kod image ke path
  const [slidesConfigData, setSlidesConfigData] = useState(null);
  const [configData, setConfigData] = useState({ // Config dari file config.txt
    PRAYER_TIME_CONFIG: DEFAULT_PRAYER_TIME_CONFIG,
    COLOR_CONFIG: DEFAULT_COLOR_CONFIG
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false); // Track Socket.IO connection status
  const [socketReady, setSocketReady] = useState(false); // Flag untuk indicate socket sudah attempt connect
  const [isReloading, setIsReloading] = useState(false); // Flag untuk indicate data reload in progress

  /**
   * Load semua data sekali sahaja
   */
  const loadAllData = useCallback(async () => {
    try {
      setIsReloading(true); // Signal reload start
      setLoading(true);
      setError(null);

      // API base URL
      const API_BASE = 'http://localhost:3001/api/files';

      // Fetch semua data secara serentak dari API
      // Tambah cache-busting untuk images untuk ensure reload selepas upload
      const cacheBuster = `?t=${Date.now()}`;
      const [takwimResponse, announcementsResponse, kuliahResponse, imagesResponse, slidesConfigResponse, configResponse] = await Promise.all([
        fetch(`${API_BASE}/takwim`),
        fetch(`${API_BASE}/announcements`),
        fetch(`${API_BASE}/kuliah`),
        fetch(`${API_BASE}/images${cacheBuster}`), // Cache-bust untuk force reload images
        fetch(`${API_BASE}/slides`),
        fetch(`${API_BASE}/config`)
      ]);

      // Check response untuk takwim
      if (!takwimResponse.ok) {
        throw new Error('Gagal memuatkan data takwim');
      }

      // Check response untuk announcements
      if (!announcementsResponse.ok) {
        throw new Error('Gagal memuatkan data announcements');
      }

      // Check response untuk kuliah
      if (!kuliahResponse.ok) {
        throw new Error('Gagal memuatkan data kuliah');
      }

      // Check response untuk slides config
      if (!slidesConfigResponse.ok) {
        throw new Error('Gagal memuatkan data slides config');
      }

      // Config response optional - guna default jika tidak ada
      const configOk = configResponse.ok;

      // Parse semua data - API returns { filename, content }
      const [takwimData, announcementsData, kuliahData, imagesData, slidesConfigData, configData] = await Promise.all([
        takwimResponse.json(),
        announcementsResponse.json(),
        kuliahResponse.json(),
        imagesResponse.json(),
        slidesConfigResponse.json(),
        configOk ? configResponse.json() : Promise.resolve({ content: '' })
      ]);

      // Extract content from API response
      const rawTakwimText = takwimData.content;
      const announcementsText = announcementsData.content;
      const kuliahText = kuliahData.content;
      const imagesText = imagesData.content;
      const slidesConfigText = slidesConfigData.content;
      const configText = configData.content;

      // Simpan raw takwim text sahaja - processing akan dibuat di component level
      setTakwimText(rawTakwimText);

      // Parse announcements data (setiap baris adalah satu item)
      const parsedAnnouncements = announcementsText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      setAnnouncementsData(parsedAnnouncements);

      // Parse kuliah data (setiap baris adalah satu item)
      const parsedKuliah = kuliahText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      setKuliahData(parsedKuliah);

      // Parse images data (mapping kod ke path)
      const imagesLines = imagesText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      const imagesMap = {};
      imagesLines.forEach(line => {
        const [code, path] = line.split('|');
        if (code && path) {
          imagesMap[code.trim()] = path.trim();
        }
      });
      setImagesData(imagesMap);

      // Parse slides config: format slideType|imagePath|duration|datetime1,datetime2
      const parsedSlidesConfig = {};
      slidesConfigText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .forEach(line => {
          const [slideType, imagePath, duration, datetimeStr] = line.split('|');
          if (slideType) {
            parsedSlidesConfig[slideType] = {
              image: imagePath || '',
              duration: duration ? parseInt(duration, 10) : null,
              datetime: datetimeStr ? datetimeStr.split(',').map(s => s.trim()).filter(s => s) : []
            };
          }
        });
      setSlidesConfigData(parsedSlidesConfig);

      // Parse config data (key|value format)
      if (configText && configText.trim()) {
        const parsedConfig = {
          PRAYER_TIME_CONFIG: { ...DEFAULT_PRAYER_TIME_CONFIG },
          COLOR_CONFIG: { ...DEFAULT_COLOR_CONFIG }
        };

        configText
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .forEach(line => {
            const [key, value] = line.split('|').map(s => s.trim());
            if (!key || !value) return;

            // Map keys to config objects
            if (key === 'HOLD_DURATION') parsedConfig.PRAYER_TIME_CONFIG.HOLD_DURATION = parseInt(value, 10);
            else if (key === 'BLINK_DURATION') parsedConfig.PRAYER_TIME_CONFIG.BLINK_DURATION = parseInt(value, 10);
            else if (key === 'BEEP_COUNT') parsedConfig.PRAYER_TIME_CONFIG.BEEP_COUNT = parseInt(value, 10);
            else if (key === 'WARNING_START_SECONDS') parsedConfig.PRAYER_TIME_CONFIG.WARNING_START_SECONDS = parseInt(value, 10);
            else if (key === 'WARNING_BEEP_COUNT') parsedConfig.PRAYER_TIME_CONFIG.WARNING_BEEP_COUNT = parseInt(value, 10);
            else if (key === 'COLOR_DEFAULT') parsedConfig.COLOR_CONFIG.DEFAULT = value;
            else if (key === 'COLOR_NEXT_PRAYER') parsedConfig.COLOR_CONFIG.NEXT_PRAYER = value;
            else if (key === 'COLOR_WARNING_PRAYER') parsedConfig.COLOR_CONFIG.WARNING_PRAYER = value;
          });

        setConfigData(parsedConfig);
      }

      setLoading(false);
      
      // Small delay before signaling reload complete untuk ensure slider recovery
      setTimeout(() => {
        setIsReloading(false);
      }, 100);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setIsReloading(false);
      // Set default values jika error
      setTakwimText('');
      setAnnouncementsData([]);
      setKuliahData([]);
      setImagesData({});
      setSlidesConfigData({});
    }
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
    let isMounted = true;

    // Debounced reload function untuk elak multiple rapid reloads
    const debouncedReload = () => {
      if (reloadDebounceTimer) {
        clearTimeout(reloadDebounceTimer);
      }
      reloadDebounceTimer = setTimeout(() => {
        if (isMounted && socketConnected) {
          loadAllData();
        }
      }, 500); // Wait 500ms before reload (debounce multiple events)
    };

    // Delay connection sedikit untuk elak connection error pada initial load
    connectTimeout = setTimeout(() => {
      if (isMounted) {
        try {
          socketService.connect('http://localhost:3001');
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

    // Listen for takwim refresh events (hanya bila connected)
    const unsubscribeTakwimRefresh = socketService.on('takwim:refresh', (data) => {
      if (isMounted && socketConnected) {
        // Use debounced reload untuk elak multiple rapid reloads
        debouncedReload();
      }
    });

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (connectTimeout) {
        clearTimeout(connectTimeout);
      }
      if (readyTimeout) {
        clearTimeout(readyTimeout);
      }
      if (reloadDebounceTimer) {
        clearTimeout(reloadDebounceTimer);
      }
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeError();
      unsubscribeTakwimRefresh();
      // Don't disconnect during React StrictMode cleanup - let it reconnect
      // socketService.disconnect();
    };
  }, [socketConnected, loadAllData]);

  const value = {
    takwimText, // Raw text untuk processing di component level
    announcementsData,
    kuliahData,
    imagesData, // Mapping kod image ke path (penceramah + slides)
    slidesConfigData,
    loading,
    error,
    socketConnected, // Expose Socket.IO connection status
    socketReady, // Expose socket ready status
    isReloading, // Expose reload status
    refresh: loadAllData,
    // Expose prayer time config constants (dari file config.txt atau default)
    PRAYER_TIME_CONFIG: configData.PRAYER_TIME_CONFIG,
    COLOR_CONFIG: configData.COLOR_CONFIG
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
