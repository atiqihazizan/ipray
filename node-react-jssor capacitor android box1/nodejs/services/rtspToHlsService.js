/**
 * RTSP → HLS service untuk CCTV (Uniview dll.) dalam Electron/app.
 * Bila livestream URL ialah rtsp://, servis ini jalankan FFmpeg dan ganti URL
 * dengan HLS yang dilayan oleh public server.
 *
 * Keperluan: FFmpeg dalam PATH (atau set config.ffmpegPath).
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');

const HLS_URL_PATH = '/hls/cctv/index.m3u8';
const PLAYLIST_POLL_MS = 500;
const PLAYLIST_POLL_MAX = 24; // ~12 saat (24 × 500ms)

/** Huraian kod keluar FFmpeg/Windows yang biasa (untuk mesej notifikasi) */
function getExitCodeHint(code) {
  if (code == null) return '';
  const c = Number(code);
  if (c === -4058) return ' Kod -4058 (Windows): selalunya FFmpeg ditamatkan paksa atau ralat akses. Cuba set FFMPEG_PATH dalam config jika guna ffmpeg sendiri.';
  if (c === 1) return ' Kod 1: ralat input/sambungan RTSP atau codec. Semak URL RTSP, kata laluan, dan log konsol.';
  if (c === -9 || c === 9) return ' Proses ditamatkan (SIGKILL).';
  if (c < 0) return ' Kod negatif selalunya proses ditamatkan atau ralat sistem. Semak log konsol.';
  return '';
}

class RtspToHlsService extends EventEmitter {
  constructor() {
    super();
    this.publicPath = null;
    /** Di Electron packaged: folder boleh tulis untuk HLS (luar asar). */
    this.hlsOutputPath = null;
    /** Path fail log (Electron: supaya boleh semak tanpa terminal). */
    this.logPath = null;
    this.port = 4100;
    this.ffmpegPath = 'ffmpeg';
    this.ffProcess = null;
    this.currentRtspUrl = null;
    this._playlistPollTimer = null;
  }

  /**
   * @param {{ publicPath: string, port?: number, ffmpegPath?: string, hlsOutputPath?: string, logPath?: string }} config
   *        hlsOutputPath = folder boleh tulis untuk HLS (Electron: luar asar). Jika null, guna publicPath/hls/cctv.
   *        logPath = path fail log (Electron: e.g. exeDir/logs/rtsp-hls.log) supaya pengguna boleh buka dan semak.
   */
  init(config) {
    this.publicPath = config.publicPath;
    this.hlsOutputPath = config.hlsOutputPath || null;
    this.logPath = config.logPath || null;
    this.port = config.port != null ? config.port : 4100;
    if (config.ffmpegPath) this.ffmpegPath = config.ffmpegPath;
  }

  _log(line, isError = false) {
    const prefix = '[RTSP→HLS] ';
    const out = prefix + line;
    if (isError) {
      console.error(out);
    } else {
      console.log(out);
    }
    if (this.logPath) {
      try {
        const ts = new Date().toISOString();
        fs.appendFileSync(this.logPath, ts + ' ' + out + '\n');
      } catch (e) {
        try { console.error('[RTSP→HLS] Gagal tulis log:', e.message); } catch (_) {}
      }
    }
  }

  _logFfmpeg(line) {
    const out = '[RTSP→HLS FFmpeg] ' + line;
    console.log(out);
    if (this.logPath) {
      try {
        const ts = new Date().toISOString();
        fs.appendFileSync(this.logPath, ts + ' ' + out + '\n');
      } catch (e) {}
    }
  }

  isRtsp(url) {
    return typeof url === 'string' && url.trim().toLowerCase().startsWith('rtsp://');
  }

  /**
   * Mulakan FFmpeg RTSP → HLS. Return URL HLS untuk overlay.
   * @param {string} rtspUrl - URL RTSP penuh (cth: rtsp://user:pass@192.168.1.100:554/path)
   * @returns {{ url: string, error?: string }} url = HLS URL; error jika gagal start
   */
  start(rtspUrl) {
    if (!this.publicPath && !this.hlsOutputPath) {
      return { url: rtspUrl, error: 'RTSP service tidak diinisialisasi (publicPath/hlsOutputPath kosong)' };
    }

    this.stop();

    // Electron: hlsOutputPath sudah = .../public/hls → tulis ke hlsOutputPath/cctv/
    // Dev: hlsOutputPath null → tulis ke publicPath/hls/cctv/ supaya URL /hls/cctv/... match
    const hlsDir = this.hlsOutputPath
      ? path.join(this.hlsOutputPath, 'cctv')
      : path.join(this.publicPath, 'hls', 'cctv');

    if (!fs.existsSync(hlsDir)) {
      fs.mkdirSync(hlsDir, { recursive: true });
    }

    const playlistPath = path.join(hlsDir, 'index.m3u8');
    const segmentPattern = path.join(hlsDir, 'seg%03d.ts');

    // FFmpeg pada Windows perlukan path dengan forward slash supaya playlist/segment ditulis betul
    const playlistPathFfmpeg = playlistPath.replace(/\\/g, '/');
    const segmentPatternFfmpeg = segmentPattern.replace(/\\/g, '/');

    // -an = tiada audio (kebanyakan CCTV tiada audio; -c:a aac boleh gagal)
    // Segment lebih pendek (1s) + senarai pendek (3) = latency lebih rendah; masih stabil untuk CCTV
    const args = [
      '-rtsp_transport', 'tcp',
      '-i', rtspUrl,
      '-c:v', 'copy',
      '-an',
      '-f', 'hls',
      '-hls_time', '1',
      '-hls_list_size', '3',
      '-hls_flags', 'delete_segments',
      '-hls_segment_filename', segmentPatternFfmpeg,
      '-start_number', '0',
      '-y',
      playlistPathFfmpeg
    ];

    try {
      this.ffProcess = spawn(this.ffmpegPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      });

      this.currentRtspUrl = rtspUrl;

      let stderrBuffer = '';
      const self = this;

      const clearPoll = () => {
        if (self._playlistPollTimer) {
          clearInterval(self._playlistPollTimer);
          self._playlistPollTimer = null;
        }
      };

      // Poll untuk kesan bila index.m3u8 wujud — then emit playlistReady
      let pollCount = 0;
      this._playlistPollTimer = setInterval(() => {
        if (!self.ffProcess) {
          clearPoll();
          return;
        }
        pollCount++;
        if (fs.existsSync(playlistPath)) {
          clearPoll();
          self._log('Playlist index.m3u8 berjaya dicipta.');
          self.emit('playlistReady', { path: playlistPath });
        } else if (pollCount >= PLAYLIST_POLL_MAX) {
          clearPoll();
          self._log('Playlist tidak wujud selepas masa menunggu.', true);
          self.emit('error', { message: 'Playlist index.m3u8 tidak dihasilkan. Semak sambungan RTSP atau log FFmpeg.' });
        }
      }, PLAYLIST_POLL_MS);

      this.ffProcess.stderr.on('data', (d) => {
        const s = d.toString();
        stderrBuffer += s;
        self._logFfmpeg(s.trimEnd());
      });

      this.ffProcess.on('error', (err) => {
        clearPoll();
        self._log('FFmpeg spawn error: ' + err.message, true);
        self.emit('error', { message: 'FFmpeg tidak dapat dijalankan: ' + err.message });
      });

      this.ffProcess.on('close', (code, signal) => {
        clearPoll();
        self._log('FFmpeg keluar, kod: ' + code + ', signal: ' + signal);
        if (code !== 0 && code !== null) {
          const lastErr = stderrBuffer.slice(-800);
          self._log('FFmpeg gagal — playlist mungkin tiada. Ralat terakhir: ' + lastErr, true);
          const hint = getExitCodeHint(code);
          const lastLine = (lastErr.trim().split(/\r?\n/).filter(Boolean).pop() || '').slice(0, 120);
          const detail = lastLine ? ` Log: ${lastLine}` : '';
          self.emit('error', {
            message: 'FFmpeg gagal (kod ' + code + ').' + hint + detail
          });
        }
        this.ffProcess = null;
        this.currentRtspUrl = null;
      });

      const baseUrl = `http://localhost:${this.port}`;
      const hlsUrl = baseUrl + HLS_URL_PATH;
      this._log('Bermula: ' + rtspUrl + ' → ' + hlsUrl);
      this._log('Fail index.m3u8 akan ditulis di: ' + playlistPath);
      return { url: hlsUrl };
    } catch (err) {
      this._log('Gagal start: ' + err.message, true);
      return { url: rtspUrl, error: err.message };
    }
  }

  /**
   * Hentikan proses FFmpeg jika ada.
   */
  stop() {
    if (this._playlistPollTimer) {
      clearInterval(this._playlistPollTimer);
      this._playlistPollTimer = null;
    }
    if (this.ffProcess) {
      try {
        this.ffProcess.kill('SIGTERM');
      } catch (e) {
        try { this.ffProcess.kill('SIGKILL'); } catch (_) {}
      }
      this.ffProcess = null;
    }
    this.currentRtspUrl = null;
  }
}

const rtspToHlsService = new RtspToHlsService();
module.exports = rtspToHlsService;
