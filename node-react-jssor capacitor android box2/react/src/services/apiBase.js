/**
 * API base dan Socket URL.
 * Boleh override dengan env (build time): VITE_API_BASE atau VITE_API_URL, VITE_SOCKET_URL
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
  const envBase =
    import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL;
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

/** Asal pelayan (tanpa /api) dari env — untuk URL statik /images/... pada Capacitor/WebView */
function getServerOriginFromEnv() {
  const raw = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL;
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.replace(/\/$/, '');
  const withoutApi = trimmed.replace(/\/api\/?$/, '');
  try {
    return new URL(withoutApi).origin;
  } catch {
    return '';
  }
}

/**
 * Capacitor/WebView: /images/... ialah fail di pelayan Node, bukan di bundle tempatan.
 * Prefix dengan asal dari VITE_API_URL jika perlu.
 */
export function resolveServerImageUrl(path) {
  if (path == null || path === '') return path;
  const s = String(path);
  if (/^https?:\/\//i.test(s)) return s;
  if (import.meta.env.DEV) return s;
  const origin = getServerOriginFromEnv();
  if (!origin) return s;
  const pathOnly = s.split('?')[0];
  if (pathOnly.startsWith('/images/')) return origin + s;
  return s;
}
