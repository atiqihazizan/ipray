import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getApiBase } from '../services/apiBase';
import socketService from '../services/socketService';
import timeServiceStub from '../services/timeServiceStub';

/**
 * Default constants untuk timing configuration (fallback jika file config.txt tidak wujud)
 */
const DEFAULT_PRAYER_TIME_CONFIG = {
  BEEP_COUNT: 5,
  WARNING_START_MINUTES: 5,
  IQAMAH_DURATION_MIN: 10,
  SOLAT_DURATION_MIN: 10,
};

/**
 * Default constants untuk warna (fallback jika file config.txt tidak wujud)
 */
const DEFAULT_COLOR_CONFIG = {
  CURRENT_TIME: '#FFFF00',
  DEFAULT: '#FFFF00',
  NEXT_PRAYER: '#90EE90',
  WARNING_PRAYER: '#FF0000',
  OVERLAY_BG: 'rgba(16, 16, 16, 0.1)',
};

const DEFAULT_MARQUEE_CONFIG = {
  ENABLED: true,
  DURATION: 25,
  SEPARATOR: ' • ',
  SHOW_MOSQUE_NAME: true,
};

const DEFAULT_HOME_TITLE_CONFIG = {
  SHOW_TITLE: true,
  TITLE1_TOP: 120,
  TITLE_LEFT: 0,
  TITLE_RIGHT: 0,
  TITLE_BG: 'transparent',
  TITLE_GAP: 30,
  TITLE_ALIGN: 'center',
  TITLE1_SIZE: 88,
  TITLE1_COLOR: '#00FFFF',
  TITLE2_SIZE: 88,
  TITLE2_COLOR: '#00FFFF',
  DURATION_SEC: 10,
};

const DEFAULT_SLIDES_CONFIG = {
  ORDER: 'A'
};

const DATA_LOAD_DATE_KEY = 'dataLoadDate';
const RELOAD_DELAY_MS = 15000;

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
  const [countdownsData, setCountdownsData] = useState(null);
  const [hebahanData, setHebahanData] = useState([]);
  const [kuliahHariProcessed, setKuliahHariProcessed] = useState([]);
  const [kuliahHariReplacements, setKuliahHariReplacements] = useState([]);
  const [kuliahMingguProcessed, setKuliahMingguProcessed] = useState([]);
  const [kuliahBulananProcessed, setKuliahBulananProcessed] = useState([]);
  const [imagesData, setImagesData] = useState(null);
  const [midnightReloadMessage, setMidnightReloadMessage] = useState(null);
  const [slidesConfigData, setSlidesConfigData] = useState(null);
  const [slidesMarqueeShow, setSlidesMarqueeShow] = useState(true);
  const [slideshowData, setSlideshowData] = useState(null);
  const [configData, setConfigData] = useState({
    PRAYER_TIME_CONFIG: DEFAULT_PRAYER_TIME_CONFIG,
    COLOR_CONFIG: DEFAULT_COLOR_CONFIG,
    MARQUEE_CONFIG: DEFAULT_MARQUEE_CONFIG,
    HOME_TITLE_CONFIG: DEFAULT_HOME_TITLE_CONFIG,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadCounter, setReloadCounter] = useState(0);
  const [deathAnnouncementData, setDeathAnnouncementData] = useState(null);
  // const [deathAnnouncementData, setDeathAnnouncementData] = useState({
  //     nama: "Abu Bakar bin Abdul Aziz",
  //     tempatJenazah: "Kuala Lumpur",
  //     masaSolat: "10:00",
  //     maklumatTambahan: "",
  //     durasiSaat: 0,
  //     overlayConfig: {
  //         showDate: true,
  //         showSmallTime: true,
  //         showMarquee: true
  //     },
  //     active: true,
  //     timestamp: 1774614721856
  // });
  const [liveStreamData, setLiveStreamData] = useState(null);
  const [petugasData, setPetugasData] = useState([]);
  const [hlsNotification, setHlsNotification] = useState(null); // { type: 'success'|'error', message }
  const dataLoadDateRef = useRef(null);
  const kematianTimerRef = useRef(null);
  const hlsNotificationTimerRef = useRef(null);

  /**
   * Load semua data sekali sahaja dari API (parsed di server, tiada parsing di client)
   */
  const loadAllData = useCallback(async () => {
    try {
      setIsReloading(true);
      setLoading(true);
      setError(null);
      setReloadCounter(prev => prev + 1);

      const API_BASE = getApiBase();
      const res = await fetch(`${API_BASE}/data/app?t=${Date.now()}`);
      if (!res.ok) {
        throw new Error('Gagal memuatkan data aplikasi');
      }
      const data = await res.json();

      setTakwimArray(data.takwim?.takwimArray ?? []);
      setTakwimParsed(data.takwim?.takwimParsed ?? null);
      setAnnouncementsData(data.announcements ?? []);
      setCountdownsData(data.countdowns ?? []);
      setHebahanData(data.hebahan ?? []);
      setKuliahHariProcessed(data.kuliahHariProcessed ?? []);
      setKuliahHariReplacements(data.kuliahHariReplacements ?? []);
      setKuliahMingguProcessed(data.kuliahMingguProcessed ?? []);
      setKuliahBulananProcessed(data.kuliahBulananProcessed ?? []);
      setImagesData(data.images ?? {});
      setSlidesConfigData(data.slidesConfig ?? {});
      setSlidesMarqueeShow(data.slidesMarqueeShow !== false);
      setSlideshowData(data.slideshow ?? []);
      setPetugasData(data.petugasData ?? []);
      setConfigData(data.config ?? {
        PRAYER_TIME_CONFIG: DEFAULT_PRAYER_TIME_CONFIG,
        COLOR_CONFIG: DEFAULT_COLOR_CONFIG,
        MARQUEE_CONFIG: DEFAULT_MARQUEE_CONFIG,
        HOME_TITLE_CONFIG: DEFAULT_HOME_TITLE_CONFIG,
      });

      const todayStr = new Date().toISOString().slice(0, 10);
      dataLoadDateRef.current = todayStr;
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(DATA_LOAD_DATE_KEY, todayStr);
      } catch (_) {}

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
      setKuliahHariProcessed([]);
      setKuliahMingguProcessed([]);
      setKuliahBulananProcessed([]);
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
      const API_BASE = getApiBase();
      const res = await fetch(`${API_BASE}/data/app/takwim/full?t=${Date.now()}`);
      
      if (!res.ok) return;
      const data = await res.json();
      setTakwimArray(data.takwimArray ?? []);
      setTakwimParsed(data.takwimParsed ?? null);
    } catch (err) {
      // Silent fail - jangan ganggu state lain
    }
  }, []);

  useEffect(() => {
    timeServiceStub.init().catch(() => {});
    return () => { timeServiceStub.cleanup(); };
  }, []);

  const checkMidnight = useCallback((todayStr) => {
    const lastLoad = dataLoadDateRef.current
      ?? (typeof localStorage !== 'undefined' ? localStorage.getItem(DATA_LOAD_DATE_KEY) : null)
      ?? '';
    if (lastLoad && todayStr !== lastLoad) {
      dataLoadDateRef.current = todayStr;
      try { if (typeof localStorage !== 'undefined') localStorage.setItem(DATA_LOAD_DATE_KEY, todayStr); } catch (_) {}
      loadAllData();   // refresh tanpa reload penuh; takwim ikut takwim:refresh / loadTakwimOnly
    }
  }, [loadAllData]);

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

    // Takwim sahaja dikemas kini - guna payload hari semasa jika ada (tiada fetch); jika tiada payload, fetch API
    const unsubscribeTakwimRefresh = socketService.on('takwim:refresh', (data) => {
      if (!isMounted || !socketConnected) return;
      const hasPayload = data && Array.isArray(data.takwimArray) && data.takwimParsed != null;
      if (hasPayload) {
        if (takwimReloadDebounceTimer) clearTimeout(takwimReloadDebounceTimer);
        setTakwimArray(data.takwimArray);
        setTakwimParsed(data.takwimParsed);
      } else {
        debouncedLoadTakwimOnly();
      }
    });

    // Home title config - update state sahaja tanpa reload
    const unsubscribeHomeTitleUpdated = socketService.on('home-title:updated', (data) => {
      console.log(data.homeTitleConfig);
      if (isMounted && data?.homeTitleConfig) {
        setConfigData(prev => ({ ...prev, HOME_TITLE_CONFIG: data.homeTitleConfig }));
      }
    });

    // Marquee config - update state terus tanpa reload
    const unsubscribeMarqueeConfigUpdated = socketService.on('marquee-config:updated', (data) => {
      if (isMounted && data?.marqueeConfig) {
        setConfigData(prev => ({ ...prev, MARQUEE_CONFIG: data.marqueeConfig }));
      }
    });

    const unsubscribeColorConfigUpdated = socketService.on('color-config:updated', (data) => {
      if (isMounted && data?.colorConfig) {
        setConfigData(prev => ({ ...prev, COLOR_CONFIG: data.colorConfig }));
      }
    });

    // Hebahan - update state terus tanpa reload
    const unsubscribeHebahanUpdated = socketService.on('hebahan:updated', (data) => {
      if (isMounted && Array.isArray(data?.hebahan)) {
        setHebahanData(data.hebahan);
      }
    });

    // Screen flags (date/time/marquee): update state sahaja, tiada reload
    const unsubscribeScreenFlagsUpdated = socketService.on('screen-flags:updated', (data) => {
      if (!isMounted) return;
      if (data?.slidesConfig) setSlidesConfigData(data.slidesConfig);
      if (data?.slidesMarqueeShow !== undefined) setSlidesMarqueeShow(data.slidesMarqueeShow !== false);
    });

    // Data lain (announcements, kuliah, images, config, dll) - reload page supaya tiada slider stuck
    // Bila fileName === 'slides' (flag paparan sahaja), jangan reload - paparan dikemas kini via screen-flags:updated
    const unsubscribeDataUpdated = socketService.on('data:updated', (data) => {
      if (data?.fileName === 'slides') return;
      window.location.reload();
    });

    // Reboot - reload window
    const unsubscribeReboot = socketService.on('reboot', () => {
      if (isMounted) window.location.reload();
    });

    // Kematian announcement
    const unsubscribeKematianUpdated = socketService.on('kematian:updated', (data) => {
      if (!isMounted) return;
      if (kematianTimerRef.current) clearTimeout(kematianTimerRef.current);
      setDeathAnnouncementData(data);
      const durasi = data?.durasiSaat;
      if (durasi && durasi > 0) {
        kematianTimerRef.current = setTimeout(() => {
          // if (isMounted) setDeathAnnouncementData(null);
          if (isMounted) {
            setDeathAnnouncementData(null);
            window.location.reload();
          }
          kematianTimerRef.current = null;
        }, durasi * 1000);
      }
    });
    const unsubscribeKematianCleared = socketService.on('kematian:cleared', () => {
      if (!isMounted) return;
      if (kematianTimerRef.current) { clearTimeout(kematianTimerRef.current); kematianTimerRef.current = null; }
      // setDeathAnnouncementData(null);
      window.location.reload();
    });

    // Live streaming
    const unsubscribeLiveStarted = socketService.on('live:started', (data) => {
      if (isMounted) setLiveStreamData(data);
    });
    const unsubscribeLivestreamOverlayConfig = socketService.on('livestream:overlay-config', (data) => {
      if (!isMounted || !data?.overlayConfig) return;
      setLiveStreamData(prev => (prev ? { ...prev, overlayConfig: data.overlayConfig } : null));
    });
    const unsubscribeKematianOverlayConfig = socketService.on('kematian:overlay-config', (data) => {
      if (!isMounted || !data?.overlayConfig) return;
      setDeathAnnouncementData(prev => (prev ? { ...prev, overlayConfig: data.overlayConfig } : null));
    });
    const unsubscribeLiveStopped = socketService.on('live:stopped', () => {
      // if (isMounted) setLiveStreamData(null);
      if (isMounted) {
        // setLiveStreamData(null);
        window.location.reload();
      }
    });

    const showHlsNotification = (type, message) => {
      if (hlsNotificationTimerRef.current) clearTimeout(hlsNotificationTimerRef.current);
      if (isMounted) setHlsNotification({ type, message });
      hlsNotificationTimerRef.current = setTimeout(() => {
        if (isMounted) setHlsNotification(null);
        hlsNotificationTimerRef.current = null;
      }, 5000);
    };
    const unsubscribeHlsPlaylistReady = socketService.on('hls:playlistReady', () => {
      if (isMounted) showHlsNotification('success', 'Playlist HLS (index.m3u8) berjaya dicipta. Siaran sedia.');
    });
    const unsubscribeHlsError = socketService.on('hls:error', (data) => {
      if (isMounted) showHlsNotification('error', data?.message || 'HLS: Ralat.');
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
      if (reloadDebounceTimer) clearTimeout(reloadDebounceTimer);
      if (takwimReloadDebounceTimer) clearTimeout(takwimReloadDebounceTimer);
      if (kematianTimerRef.current) { clearTimeout(kematianTimerRef.current); kematianTimerRef.current = null; }
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeError();
      unsubscribeTakwimRefresh();
      unsubscribeHomeTitleUpdated();
      unsubscribeMarqueeConfigUpdated();
      unsubscribeColorConfigUpdated();
      unsubscribeHebahanUpdated();
      unsubscribeScreenFlagsUpdated();
      unsubscribeDataUpdated();
      unsubscribeReboot();
      unsubscribeKematianUpdated();
      unsubscribeKematianCleared();
      unsubscribeLiveStarted();
      unsubscribeLivestreamOverlayConfig();
      unsubscribeKematianOverlayConfig();
      unsubscribeLiveStopped();
      unsubscribeHlsPlaylistReady();
      unsubscribeHlsError();
      if (hlsNotificationTimerRef.current) clearTimeout(hlsNotificationTimerRef.current);
    };
  }, [socketConnected, loadAllData, loadTakwimOnly]);

  const value = {
    takwimArray,
    takwimParsed,
    announcementsData,
    countdownsData,
    hebahanData,
    kuliahHariProcessed,
    kuliahHariReplacements,
    kuliahMingguProcessed,
    kuliahBulananProcessed,
    imagesData,
    midnightReloadMessage,
    slidesConfigData,
    slidesMarqueeShow,
    slideshowData,
    loading,
    error,
    socketConnected,
    socketReady,
    isReloading,
    reloadCounter,
    deathAnnouncementData,
    liveStreamData,
    petugasData,
    refresh: loadAllData,
    checkMidnight,
    PRAYER_TIME_CONFIG: configData.PRAYER_TIME_CONFIG,
    COLOR_CONFIG: configData.COLOR_CONFIG,
    MARQUEE_CONFIG: configData.MARQUEE_CONFIG ?? DEFAULT_MARQUEE_CONFIG,
    HOME_TITLE_CONFIG: configData.HOME_TITLE_CONFIG ?? DEFAULT_HOME_TITLE_CONFIG,
    SLIDES_CONFIG: configData.SLIDES_CONFIG ?? DEFAULT_SLIDES_CONFIG,
    timeService: timeServiceStub
  };

  return (
    <DataContext.Provider value={value}>
      {hlsNotification && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            borderRadius: 8,
            maxWidth: '90%',
            zIndex: 10000,
            backgroundColor: hlsNotification.type === 'error' ? '#b91c1c' : '#15803d',
            color: '#fff',
            fontSize: 14,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {hlsNotification.message}
        </div>
      )}
      {children}
    </DataContext.Provider>
  );
};
