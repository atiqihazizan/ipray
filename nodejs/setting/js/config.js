/**
 * Configuration & Constants
 * Konfigurasi URL dan settings aplikasi
 */

// Dynamic URL based on current host (support access from outside via nginx)
const currentHost = window.location.hostname;
const currentPort = window.location.port;
const currentProtocol = window.location.protocol;

// If accessed via port 80 (nginx), use same host without port
// If accessed directly via port 3001, use that
export const BASE_URL = currentPort === '3001' || currentPort === '' 
    ? `${currentProtocol}//${currentHost}${currentPort ? ':' + currentPort : ''}`
    : `${currentProtocol}//${currentHost}:3001`;

export const API_URL = `${BASE_URL}/api`;
export const SOCKET_URL = BASE_URL;

// Export untuk browser environment
if (typeof window !== 'undefined') {
    window.Config = {
        BASE_URL,
        API_URL,
        SOCKET_URL
    };
}

/**
 * Auth token untuk panel setting — server (apiServerService.js) kini wajibkan header
 * X-Access-Token untuk semua endpoint /api/* tulis/admin (WiFi, reboot, CRUD data, dsb).
 * Dibungkus di sini (satu tempat) supaya SEMUA panggilan fetch() sedia ada di seluruh
 * panel setting (api.js, dialog.js, table.js, wifi.js, dll — 70+ tempat) automatik
 * hantar token tanpa perlu ubah setiap satu.
 */
if (typeof window !== 'undefined' && !window.__fetchTokenPatched) {
    window.__fetchTokenPatched = true;
    // PENTING: nativeFetch (bukan window.fetch) dipakai untuk dapatkan token itu sendiri —
    // kalau guna window.fetch di sini, ia panggil versi wrapped semula (sebab dah dipatch di
    // bawah), yang cuba dapatkan token dahulu... sebelum token pertama sempat di-cache = rekursi.
    const nativeFetch = window.fetch.bind(window);
    const TOKEN_URL = `${API_URL}/token`;

    let _accessTokenPromise = null;
    function ensureAccessToken() {
        if (!_accessTokenPromise) {
            _accessTokenPromise = nativeFetch(TOKEN_URL)
                .then(res => res.json())
                .then(data => data.token)
                .catch(() => null);
        }
        return _accessTokenPromise;
    }

    window.fetch = async (input, init = {}) => {
        const url = typeof input === 'string' ? input : (input?.url || '');
        // Hanya sisip token untuk permintaan ke API kita sendiri (same-origin API), bukan CDN/pihak
        // ketiga — dan bukan /api/token itu sendiri (elak rekursi + memang tak perlukan token).
        if ((url.startsWith(API_URL) || url.startsWith('/api')) && url !== TOKEN_URL) {
            const token = await ensureAccessToken();
            if (token) {
                const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
                headers.set('X-Access-Token', token);
                init = { ...init, headers };
            }
            const res = await nativeFetch(input, init);
            // Jika 401 — token cache mungkin stale (server restart). Clear dan retry sekali.
            if (res.status === 401) {
                _accessTokenPromise = null;
                const freshToken = await ensureAccessToken();
                if (freshToken) {
                    const headers = new Headers(init.headers);
                    headers.set('X-Access-Token', freshToken);
                    return nativeFetch(input, { ...init, headers });
                }
            }
            return res;
        }
        return nativeFetch(input, init);
    };
}
