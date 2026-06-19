/**
 * API base dan Socket URL.
 * Env (build / dev): VITE_API_URL (utama), VITE_API_BASE (fallback), VITE_SOCKET_URL
 * - Tanpa env dalam DEV: API & Socket lalai http://localhost:4101 (tetapkan VITE_* untuk domain luar)
 * - Production tanpa env: auto ikut hostname (localhost / ipray.local / asal)
 * - Capacitor APK: aset dimuat https://localhost; guna resolveRemoteMediaUrl() untuk /images/*
 *   supaya URL mutlak ke pelayan (bukan https://localhost/images/...).
 */
function normalizeApiBase(raw) {
  if (!raw) return '';
  return raw.endsWith('/api') ? raw : raw.replace(/\/?$/, '') + '/api';
}

function getOriginForApiAndSocket() {
  if (typeof window === 'undefined') return '';
  const { hostname, port } = window.location;
  if (import.meta.env.DEV) return window.location.origin;
  if (hostname === 'ipray.local' && port === '4100') return 'http://ipray.local:4101';
  if (hostname === 'localhost') return 'http://localhost:4101';
  return window.location.origin;
}

export function getApiBase() {
  const fromEnv = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE;
  if (fromEnv) return normalizeApiBase(fromEnv);

  if (import.meta.env.DEV) {
    return 'http://localhost:4101/api';
  }

  const base = getOriginForApiAndSocket();
  return base ? `${base}/api` : 'http://localhost:4101/api';
}

export function getSocketUrl() {
  const envSocket = import.meta.env.VITE_SOCKET_URL;
  if (envSocket) return envSocket.replace(/\/$/, '');
  const fromApi = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE;
  if (fromApi) {
    const raw = String(fromApi).replace(/\/?$/, '');
    return raw.endsWith('/api') ? raw.slice(0, -4) : raw;
  }
  if (import.meta.env.DEV) return 'http://localhost:4101';
  return getOriginForApiAndSocket() || 'http://localhost:4101';
}

/**
 * URL penuh untuk imej API (/images/... dilayan Express :4101 + nginx).
 * Laluan relatif di WebView Capacitor menunjuk ke aset tempatan — mesti guna asal pelayan.
 */
export function resolveRemoteMediaUrl(src) {
  if (src == null || typeof src !== 'string') return src;
  const s = src.trim();
  if (!s) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/images')) {
    const origin = getSocketUrl();
    const path = s.startsWith('/') ? s : `/${s}`;
    return origin ? `${origin}${path}` : path;
  }
  return s;
}
