/**
 * API base dan Socket URL.
 * Boleh override dengan env (build time): VITE_API_BASE, VITE_SOCKET_URL
 * - localhost (kiosk): guna localhost:3001
 * - ipray.local:3000: Socket/API di port 80 (nginx proxy ke 3001) -> guna ipray.local
 * - development / host lain: guna same origin (port 80)
 */
function getOriginForApiAndSocket() {
  if (typeof window === 'undefined') return '';
  const { hostname, port } = window.location;
  if (import.meta.env.DEV) return window.location.origin;
  if (hostname === 'ipray.local' && port === '3000') return 'http://ipray.local';
  if (hostname === 'localhost') return 'http://localhost:3001';
  return window.location.origin;
}

export function getApiBase() {
  const envBase = import.meta.env.VITE_API_BASE;
  if (envBase) return envBase.endsWith('/api') ? envBase : envBase.replace(/\/?$/, '') + '/api';
  const base = getOriginForApiAndSocket();
  if (import.meta.env.DEV) return '/api';
  return base ? `${base}/api` : 'http://localhost:3001/api';
}

export function getSocketUrl() {
  const envSocket = import.meta.env.VITE_SOCKET_URL;
  if (envSocket) return envSocket.replace(/\/$/, '');
  if (import.meta.env.DEV) return window.location?.origin ?? '';
  return getOriginForApiAndSocket() || 'http://localhost:3001';
}
