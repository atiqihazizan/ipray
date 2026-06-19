/**
 * Audio Service - Shared audio instance untuk semua komponen
 * Menggunakan singleton pattern untuk elak multiple audio instances
 */

const AUDIO_SOURCES = {
  beep: '/audio/beep.wav',
  beep_once: '/audio/beep_once.wav',
  notify: '/audio/notify.mp3'
};

class AudioService {
  constructor() {
    this.audioRef = null;
    this.audioEnabled = false;
    this.isPlaying = false;
    this.volume = 0.5; // Default volume 50%
    this.maxPlayDuration = 5 * 60 * 1000; // 5 minit dalam milliseconds
    this.playTimeout = null;
    this.listeners = [];
    this.hasInitialized = false;
    this.playCount = null; // Jumlah kali play (null = loop)
    this.currentPlayCount = 0; // Counter untuk jumlah play
    this.playInterval = null; // Interval untuk play berulang
    this.currentSound = 'beep_once'; // Default audio
    this.loadError = false; // True jika sumber audio gagal dimuat (404 / format tidak disokong)
  }

  /**
   * Initialize audio instance
   */
  init() {
    if (this.hasInitialized) return;
    
    this.audioRef = new Audio(AUDIO_SOURCES.beep_once);
    this.audioRef.loop = false; // Default false, akan set berdasarkan playCount
    this.audioRef.volume = this.volume;
    this.audioRef.preload = 'auto';
    this.loadError = false;
    
    // Handle audio events
    this.audioRef.addEventListener('ended', () => {
      this.handleAudioEnded();
    });
    
    this.audioRef.addEventListener('error', () => {
      this.loadError = true;
      this.isPlaying = false;
      this.cleanupPlayInterval();
      // Jangan log objek Event yang panjang; log mesej ringkas sahaja
      const msg = this.audioRef?.error?.message || 'Sumber audio gagal dimuat (semak path/format fail)';
      console.warn('[Audio]', msg);
    });
    
    this.hasInitialized = true;
  }

  /**
   * Handle audio ended event
   */
  handleAudioEnded() {
    if (this.playCount !== null) {
      // Play dengan jumlah tertentu
      this.currentPlayCount++;
      if (this.currentPlayCount >= this.playCount) {
        // Sudah mencapai jumlah play yang ditetapkan
        this.stop();
      } else {
        // Play lagi
        if (this.audioRef) {
          this.audioRef.currentTime = 0;
          this.audioRef.play().then(() => {
            // Pastikan isPlaying tetap true apabila play lagi
            this.isPlaying = true;
          }).catch((error) => {
            console.warn('Audio play error:', error);
            this.stop();
          });
        }
      }
    } else {
      // Loop mode - akan continue play jika loop = true
      this.isPlaying = false;
    }
  }

  /**
   * Cleanup play interval
   */
  cleanupPlayInterval() {
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  /**
   * Enable audio dengan user interaction
   * Perlu dipanggil selepas user interaction pertama
   */
  async enableAudio() {
    if (!this.audioRef) {
      this.init();
    }
    if (this.loadError) {
      const err = new Error('Sumber audio tidak tersedia. Semak fail di public/audio/ (contoh: beep_once.wav).');
      err.name = 'NotSupportedError';
      this.notifyListeners('error', err);
      throw err;
    }
    try {
      await this.audioRef.play();
      this.audioEnabled = true;
      // Pause immediately after enabling
      this.audioRef.pause();
      this.audioRef.currentTime = 0;
      this.notifyListeners('enabled');
    } catch (error) {
      this.audioEnabled = false;
      // NotAllowedError = browser perlukan user interaction (autoplay policy)
      this.notifyListeners('error', error);
      throw error;
    }
  }

  /**
   * Play audio
   * @param {Object} options - Options untuk play audio
   * @param {string} options.sound - 'beep' | 'beep_once' | 'notify', default: 'beep_once'
   * @param {number} options.volume - Volume (0-1), default: current volume
   * @param {number} options.maxDuration - Max duration dalam ms, default: 5 minit
   * @param {number} options.playCount - Jumlah kali play (null = loop), default: null
   */
  async play(options = {}) {
    if (!this.audioRef) {
      this.init();
    }

    if (this.loadError) return;

    const sound = options.sound || 'beep_once';
    const src = AUDIO_SOURCES[sound] || AUDIO_SOURCES.beep_once;
    if (this.currentSound !== sound && this.audioRef) {
      this.audioRef.src = src;
      this.currentSound = sound;
      this.loadError = false;
    }

    // Set volume jika diberikan
    if (options.volume !== undefined) {
      this.setVolume(options.volume);
    }

    // Set playCount
    this.playCount = options.playCount !== undefined ? options.playCount : null;
    this.currentPlayCount = 0;

    // Set loop berdasarkan playCount
    if (this.playCount !== null) {
      // Play dengan jumlah tertentu - tidak loop
      this.audioRef.loop = false;
    } else {
      // Loop mode
      this.audioRef.loop = true;
    }

    // Stop audio yang sedang play
    if (this.isPlaying) {
      this.stop();
    }

    try {
      if (this.audioEnabled) {
        await this.audioRef.play();
        this.isPlaying = true;
        this.notifyListeners('play');
        
        // Set timeout untuk stop audio selepas max duration (hanya jika playCount = null)
        if (this.playCount === null) {
          const maxDuration = options.maxDuration || this.maxPlayDuration;
          if (this.playTimeout) {
            clearTimeout(this.playTimeout);
          }
          this.playTimeout = setTimeout(() => {
            this.stop();
            this.notifyListeners('timeout');
          }, maxDuration);
        }
      } else {
        // Cubakan enable audio jika belum
        await this.enableAudio();
        await this.audioRef.play();
        this.isPlaying = true;
        this.notifyListeners('play');
        
        // Set timeout untuk stop audio (hanya jika playCount = null)
        if (this.playCount === null) {
          const maxDuration = options.maxDuration || this.maxPlayDuration;
          if (this.playTimeout) {
            clearTimeout(this.playTimeout);
          }
          this.playTimeout = setTimeout(() => {
            this.stop();
            this.notifyListeners('timeout');
          }, maxDuration);
        }
      }
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        this.audioEnabled = false;
      }
      this.isPlaying = false;
      this.cleanupPlayInterval();
      this.notifyListeners('error', error);
      throw error;
    }
  }

  /**
   * Stop audio
   */
  stop() {
    if (this.audioRef && !this.audioRef.paused) {
      this.audioRef.pause();
      this.audioRef.currentTime = 0;
    }
    
    if (this.playTimeout) {
      clearTimeout(this.playTimeout);
      this.playTimeout = null;
    }

    this.cleanupPlayInterval();
    
    // Reset play count
    this.playCount = null;
    this.currentPlayCount = 0;
    
    if (this.isPlaying) {
      this.isPlaying = false;
      this.notifyListeners('stop');
    }
  }

  /**
   * Set volume
   * @param {number} volume - Volume (0-1)
   */
  setVolume(volume) {
    if (volume < 0) volume = 0;
    if (volume > 1) volume = 1;
    
    this.volume = volume;
    if (this.audioRef) {
      this.audioRef.volume = volume;
    }
  }

  /**
   * Get current volume
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Check jika audio sedang play
   */
  getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * Check jika audio sudah enabled
   */
  getIsEnabled() {
    return this.audioEnabled;
  }

  /**
   * Subscribe kepada audio events
   * @param {Function} callback - Callback function
   */
  subscribe(callback) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify semua listeners
   */
  notifyListeners(event, data = null) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.warn('Error in audio listener:', error);
      }
    });
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.stop();
    this.listeners = [];
    if (this.audioRef) {
      this.audioRef = null;
    }
    this.hasInitialized = false;
    this.cleanupPlayInterval();
  }
}

// Export singleton instance
const audioService = new AudioService();

export default audioService;

