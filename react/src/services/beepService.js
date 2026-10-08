/**
 * Beep Service — Web Audio API
 * Jana bunyi beep terus tanpa fail WAV.
 * Parameter sepadan dengan BEEP_MODULE.H dalam firmware ESP32.
 */

const DEFAULTS = {
  freq: 2800,   // BEEP_FREQ Hz
  amp: 1.0,     // BEEP_AMP (normalized 0–1)
  fadeMs: 5,    // fade in/out ms (elak click/pop)
};

// Pattern dari C++ _makeWavSet / _makeWav
const PATTERNS = {
  b1: { beepMs: 70,  gapMs: 0,    longMs: 0,    sets: 1 },  // beep tunggal
  b2: { beepMs: 50,  gapMs: 40,   longMs: 0,    sets: 1 },  // beepDouble — 2 beep
  b3: { beepMs: 50,  gapMs: 40,   longMs: 1700, sets: 5 },  // beepWarning — 5 set
  ba: { beepMs: 50,  gapMs: 40,   longMs: 1700, sets: 8 },  // beepPrayer  — 8 set
  bell: { beepMs: 450, gapMs: 0,  longMs: 0,    sets: 1, freq: 900, fadeMs: 8 }, // loceng jam
};

/**
 * Default untuk pattern 'prayer' (beep masuk waktu) — emulasi buzzer piezo.
 * Boleh dilaraskan dari tetapan Node.js (nodejs/setting) via BEEP_CONFIG (lihat DataContext).
 */
const PRAYER_DEFAULTS = {
  BEEP_FREQ: 2800,
  BEEP_MS: 120,
  BEEP_GAP_MS: 100,
  BEEP_SETS: 6,
  BEEP_SET_GAP_MS: 1000,
  BEEP_WAVE: 'piezo',
  BEEP_Q: 3,
  BEEP_LEADIN_MS: 200,
};

const PIEZO_PEAK_AMP = 0.9;   // puncak ternormal untuk wave 'piezo'
const PIEZO_FADE_MS = 6;      // fade in/out 5–8ms untuk elak click
const PIEZO_TAIL_MS = 25;     // ekor ring-down lepas beep (bandpass resonan)

// Had masa maksimum beep masuk waktu mesti kurang daripada fallback 30s (useTimeDriver.js)
const BEEP_FALLBACK_MS = 30000;
const BEEP_SAFETY_MARGIN_MS = 2000;

/** Kurangkan bilangan set (minimum 1) jika jumlah masa melebihi had fallback. */
function clampSetsForDuration(sets, leadinMs, beepMs, gapMs, setGapMs) {
  const maxTotalMs = BEEP_FALLBACK_MS - BEEP_SAFETY_MARGIN_MS;
  let n = sets;
  while (n > 1) {
    const total = leadinMs + n * (2 * beepMs + gapMs) + (n - 1) * setGapMs;
    if (total <= maxTotalMs) break;
    n -= 1;
  }
  return n;
}

class BeepService {
  constructor() {
    this._ctx = null;
    this._nodes = [];
    this._params = { ...DEFAULTS, ...PRAYER_DEFAULTS };
    this._completeTimer = null;
    this._endTime = 0; // AudioContext currentTime bila semua beep + ekor selesai
  }

  // ── AudioContext (lazy init, unlock autoplay) ──────────────────────
  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    return this._ctx;
  }

  // ── Tukar parameter global ─────────────────────────────────────────
  setParams(params = {}) {
    this._params = { ...this._params, ...params };
  }

  getParams() {
    return { ...this._params };
  }

  // ── Jana satu beep tunggal (sine) pada masa tertentu ───────────────
  _scheduleBeep(startTime, durationMs, freq, amp, fadeMs) {
    const ac = this._getCtx();
    const dur = durationMs / 1000;
    const fade = Math.min(fadeMs / 1000, dur / 2);

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ac.destination);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(amp, startTime + fade);
    gain.gain.setValueAtTime(amp, startTime + dur - fade);
    gain.gain.linearRampToValueAtTime(0, startTime + dur);

    osc.start(startTime);
    osc.stop(startTime + dur);
    this._nodes.push(osc);
    return startTime + dur;
  }

  // ── Jana satu beep tunggal (piezo: square + bandpass resonan + ring-down) ──
  _scheduleBeepPiezo(startTime, durationMs, freq, q, fadeMs) {
    const ac = this._getCtx();
    const dur = durationMs / 1000;
    const fade = Math.min(fadeMs / 1000, dur / 2);
    const tail = PIEZO_TAIL_MS / 1000;

    const osc = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(PIEZO_PEAK_AMP, startTime + fade);
    gain.gain.setValueAtTime(PIEZO_PEAK_AMP, startTime + dur - fade);
    // ekor ring-down ~25ms supaya resonan bandpass kedengaran selepas osc berhenti
    gain.gain.linearRampToValueAtTime(0, startTime + dur + tail);

    osc.start(startTime);
    osc.stop(startTime + dur + tail);
    this._nodes.push(osc);
    return startTime + dur;
  }

  // ── Jana satu set [beep + gap + beep] (sine, pattern lama b1/b2/b3/ba/bell) ──
  _scheduleSet(startTime, beepMs, gapMs, freq, amp, fadeMs) {
    let t = startTime;
    t = this._scheduleBeep(t, beepMs, freq, amp, fadeMs);
    t += gapMs / 1000;
    if (gapMs > 0) {
      t = this._scheduleBeep(t, beepMs, freq, amp, fadeMs);
    }
    return t;
  }

  // ── Jana satu set [beep + gap + beep] untuk pattern 'prayer' (piezo/sine ikut BEEP_WAVE) ──
  _scheduleSetPrayer(startTime, beepMs, gapMs, freq, wave, q, fadeMs) {
    let t = startTime;
    if (wave === 'sine') {
      t = this._scheduleBeep(t, beepMs, freq, this._params.amp ?? DEFAULTS.amp, fadeMs);
      t += gapMs / 1000;
      t = this._scheduleBeep(t, beepMs, freq, this._params.amp ?? DEFAULTS.amp, fadeMs);
    } else {
      t = this._scheduleBeepPiezo(t, beepMs, freq, q, fadeMs);
      t += gapMs / 1000;
      t = this._scheduleBeepPiezo(t, beepMs, freq, q, fadeMs);
    }
    return t;
  }

  // ── Schedule onComplete callback selepas semua beep selesai ───────
  _scheduleComplete(endTime, cb) {
    if (this._completeTimer) clearTimeout(this._completeTimer);
    this._completeTimer = null;
    this._endTime = endTime;
    if (!cb) return;
    const ac = this._getCtx();
    const delayMs = (endTime - ac.currentTime) * 1000 + 80;
    this._completeTimer = setTimeout(() => {
      this._completeTimer = null;
      cb();
    }, Math.max(0, delayMs));
  }

  // ── Henti semua bunyi ─────────────────────────────────────────────
  stop() {
    this._nodes.forEach(n => { try { n.stop(); } catch (_) {} });
    this._nodes = [];
    this._endTime = 0;
    if (this._completeTimer) {
      clearTimeout(this._completeTimer);
      this._completeTimer = null;
    }
  }

  // ── Semak sama ada bunyi sedang berjalan ─────────────────────────
  getIsPlaying() {
    if (!this._ctx) return false;
    return this._ctx.currentTime < this._endTime;
  }

  // ── Main pattern bernama (b1/b2/b3/ba/bell) ───────────────────────
  playPattern(name, onComplete) {
    const pat = PATTERNS[name];
    if (!pat) {
      console.warn('[BeepService] Pattern tidak dikenali:', name);
      return;
    }
    this.stop();

    const ac = this._getCtx();
    const freq = pat.freq ?? this._params.freq;
    const amp = this._params.amp;
    const fadeMs = pat.fadeMs ?? this._params.fadeMs;
    const { beepMs, gapMs, longMs, sets } = pat;

    let t = ac.currentTime + 0.05;

    if (sets === 1 && gapMs === 0) {
      t = this._scheduleBeep(t, beepMs, freq, amp, fadeMs);
    } else {
      for (let i = 0; i < sets; i++) {
        t = this._scheduleSet(t, beepMs, gapMs, freq, amp, fadeMs);
        if (i < sets - 1) t += longMs / 1000;
      }
    }

    this._scheduleComplete(t, onComplete);
  }

  /**
   * playPrayer(onComplete, setsOverride) — Beep masuk waktu, emulasi buzzer piezo.
   * Semua parameter (frekuensi, durasi, jeda, Q, lead-in, wave) dibaca dari
   * `_params` (BEEP_CONFIG, boleh dilaras dari tetapan Node.js tanpa reload).
   *
   * @param {Function} [onComplete] - Callback selepas semua beep + ekor selesai
   * @param {number} [setsOverride] - Override bilangan set (default BEEP_SETS)
   */
  playPrayer(onComplete, setsOverride) {
    this.stop();

    const ac = this._getCtx();
    const freq = this._params.BEEP_FREQ ?? PRAYER_DEFAULTS.BEEP_FREQ;
    const beepMs = this._params.BEEP_MS ?? PRAYER_DEFAULTS.BEEP_MS;
    const gapMs = this._params.BEEP_GAP_MS ?? PRAYER_DEFAULTS.BEEP_GAP_MS;
    const setGapMs = this._params.BEEP_SET_GAP_MS ?? PRAYER_DEFAULTS.BEEP_SET_GAP_MS;
    const wave = this._params.BEEP_WAVE ?? PRAYER_DEFAULTS.BEEP_WAVE;
    const q = this._params.BEEP_Q ?? PRAYER_DEFAULTS.BEEP_Q;
    const leadinMs = this._params.BEEP_LEADIN_MS ?? PRAYER_DEFAULTS.BEEP_LEADIN_MS;
    const fadeMs = wave === 'sine' ? (this._params.fadeMs ?? DEFAULTS.fadeMs) : PIEZO_FADE_MS;
    const rawSets = setsOverride ?? (this._params.BEEP_SETS ?? PRAYER_DEFAULTS.BEEP_SETS);
    const sets = clampSetsForDuration(rawSets, leadinMs, beepMs, gapMs, setGapMs);

    if (sets < 1) {
      this._scheduleComplete(ac.currentTime, onComplete);
      return;
    }

    let t = ac.currentTime + 0.05 + leadinMs / 1000;
    for (let i = 0; i < sets; i++) {
      t = this._scheduleSetPrayer(t, beepMs, gapMs, freq, wave, q, fadeMs);
      if (i < sets - 1) t += setGapMs / 1000;
    }

    this._scheduleComplete(t, onComplete);
  }

  /**
   * beep(n) — Main n set double-beep.
   * Satu "beep" = satu set [beep+gap+beep].
   * beep()  → 2 set (default)
   * beep(n) → n set, dengan jeda antara set ikut BEEP_SET_GAP_MS (default 1000ms)
   *
   * n === 1 dikekalkan sebagai chime notify lama (sine, tidak berubah — digunakan
   * oleh `playNotifyIfIdle`). n > 1 (beep masuk waktu) menggunakan pattern `prayer`
   * (lihat `playPrayer`), supaya boleh dilaras dari tetapan Node.js tanpa reload.
   *
   * @param {number} [n=2] - Bilangan set
   * @param {Function} [onComplete] - Callback selepas semua beep selesai
   */
  beep(n = 2, onComplete) {
    if (n < 1) return;
    if (n === 1) {
      this.stop();
      const ac = this._getCtx();
      const { freq, amp, fadeMs } = this._params;
      const t = this._scheduleSet(ac.currentTime + 0.05, 50, 40, freq, amp, fadeMs);
      this._scheduleComplete(t, onComplete);
      return;
    }
    this.playPrayer(onComplete, n);
  }
}

const beepService = new BeepService();

/**
 * Fungsi beep mudah — boleh import terus.
 * beep()    → 2x beep (default)
 * beep(n)   → n× beep
 */
export const beep = (n = 2) => beepService.beep(n);

export default beepService;
