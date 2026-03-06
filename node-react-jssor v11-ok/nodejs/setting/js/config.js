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
