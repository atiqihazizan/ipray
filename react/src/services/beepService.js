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

class BeepService {
  constructor() {
    this._ctx = null;
    this._nodes = [];
    this._params = { ...DEFAULTS };
    this._completeTimer = null;
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

  // ── Jana satu beep tunggal pada masa tertentu ──────────────────────
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

  // ── Jana satu set [beep + gap + beep] ─────────────────────────────
  _scheduleSet(startTime, beepMs, gapMs, freq, amp, fadeMs) {
    let t = startTime;
    t = this._scheduleBeep(t, beepMs, freq, amp, fadeMs);
    t += gapMs / 1000;
    if (gapMs > 0) {
      t = this._scheduleBeep(t, beepMs, freq, amp, fadeMs);
    }
    return t;
  }

  // ── Schedule onComplete callback selepas semua beep selesai ───────
  _scheduleComplete(endTime, cb) {
    if (this._completeTimer) clearTimeout(this._completeTimer);
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
    if (this._completeTimer) {
      clearTimeout(this._completeTimer);
      this._completeTimer = null;
    }
  }

  // ── Semak sama ada bunyi sedang berjalan ─────────────────────────
  getIsPlaying() {
    return this._completeTimer !== null;
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
   * beep(n) — Main n set double-beep.
   * Satu "beep" = satu set [beep+gap+beep] (b2 pattern).
   * beep()  → 2 set (default)
   * beep(n) → n set, dengan 800ms jeda antara set
   *
   * @param {number} [n=2] - Bilangan set
   * @param {Function} [onComplete] - Callback selepas semua beep selesai
   */
  beep(n = 2, onComplete) {
    if (n < 1) return;
    this.stop();

    const ac = this._getCtx();
    const { freq, amp, fadeMs } = this._params;
    const beepMs = 50;
    const shortMs = 40;
    const longMs = 1700;

    let t = ac.currentTime + 0.05;
    for (let i = 0; i < n; i++) {
      t = this._scheduleSet(t, beepMs, shortMs, freq, amp, fadeMs);
      if (i < n - 1) t += longMs / 1000;
    }

    this._scheduleComplete(t, onComplete);
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
