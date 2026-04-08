/**
 * API base dan Socket URL.
 * Env (build / dev): VITE_API_URL (utama), VITE_API_BASE (fallback), VITE_SOCKET_URL
 * - Tanpa env dalam DEV: API & Socket langsung ke http://localhost:3001
 * - Production tanpa env: auto ikut hostname (localhost / ipray.local / asal)
 */
function normalizeApiBase(raw) {
  if (!raw) return '';
  return raw.endsWith('/api') ? raw : raw.replace(/\/?$/, '') + '/api';
}

function getOriginForApiAndSocket() {
  if (typeof window === 'undefined') return '';
  const { hostname, port } = window.location;
  if (import.meta.env.DEV) return window.location.origin;
  if (hostname === 'ipray.local' && port === '3000') return 'http://ipray.local';
  if (hostname === 'localhost') return 'http://localhost:3001';
  return window.location.origin;
}

export function getApiBase() {
  const fromEnv = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE;
  if (fromEnv) return normalizeApiBase(fromEnv);

  if (import.meta.env.DEV) {
    return 'http://localhost:3001/api';
  }

  const base = getOriginForApiAndSocket();
  return base ? `${base}/api` : 'http://localhost:3001/api';
}

export function getSocketUrl() {
  const envSocket = import.meta.env.VITE_SOCKET_URL;
  if (envSocket) return envSocket.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://localhost:3001';
  return getOriginForApiAndSocket() || 'http://localhost:3001';
}
