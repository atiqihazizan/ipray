import { getApiBase } from './apiBase';

/**
 * timeServiceStub: sync offset dari server supaya masa React konsisten dengan backend NTP.
 * Fallback kepada Date.now() jika server tidak boleh dicapai.
 *
 * Ini penting untuk Raspberry Pi dengan CMOS battery rosak — backend ada masa betul
 * via NTP offset, React mesti guna masa yang sama untuk calculation waktu solat.
 */

const SYNC_INTERVAL_MS = 10 * 60 * 1000; // sync setiap 10 minit
const SYNC_TIMEOUT_MS = 5_000;

let serverOffset = 0; // Date.now() + serverOffset = masa sebenar
let syncIntervalId = null;
let initialized = false;

async function fetchServerOffset() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
    const res = await fetch(`${getApiBase()}/time`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return;
    const data = await res.json();
    if (typeof data.timestamp === 'number') {
      serverOffset = data.timestamp - Date.now();
    }
  } catch (_) {
    // Silent fail — kekal guna offset lama
  }
}

const timeServiceStub = {
  now: () => Date.now() + serverOffset,

  async init() {
    if (initialized) return;
    initialized = true;
    await fetchServerOffset();
    syncIntervalId = setInterval(fetchServerOffset, SYNC_INTERVAL_MS);
  },

  cleanup() {
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
    }
    initialized = false;
    serverOffset = 0;
  },

  // Expose untuk debugging
  getOffset: () => serverOffset,

  syncNow: fetchServerOffset,
};

export default timeServiceStub;
