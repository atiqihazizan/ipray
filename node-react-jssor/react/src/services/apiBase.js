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

/**
 * Base host:port untuk asset statik (imej) yang datang dari data server (images.txt, dll),
 * BUKAN dari /api. Perlu berasingan dari getApiBase() sebab path imej dari server (contoh
 * "/images/penceramah/xxx.png") adalah root-relative dan akan resolve ke origin dev server
 * (localhost:5173) bukan backend sebenar bila VITE_API_BASE tunjuk ke host lain (contoh
 * ujian terus ke RPi produksi).
 */
export function getAssetBase() {
  const envSocket = import.meta.env.VITE_SOCKET_URL;
  const envApi = import.meta.env.VITE_API_BASE;
  const envBase = envSocket || envApi;
  if (envBase) return envBase.replace(/\/api\/?$/, '').replace(/\/$/, '');
  if (import.meta.env.DEV) return '';
  return getOriginForApiAndSocket();
}

/** Sambungkan base host ke path root-relative (contoh "/images/x.png") jika base disediakan */
export function withAssetBase(path) {
  if (!path || typeof path !== 'string') return path;
  if (/^https?:\/\//i.test(path)) return path;
  const base = getAssetBase();
  if (!base) return path;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}
