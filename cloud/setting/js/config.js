/**
 * Cloud Setting Panel Configuration
 */

const currentHost = window.location.hostname;
const currentPort = window.location.port;
const currentProtocol = window.location.protocol;

export const CLOUD_URL = `${currentProtocol}//${currentHost}${currentPort ? ':' + currentPort : ''}`;

export const BASE_URL = CLOUD_URL;
export const API_URL = `${BASE_URL}/api`;
export const SOCKET_URL = CLOUD_URL;

function getStoredClientId() {
  return localStorage.getItem('cloud_client_id') || 'clientA';
}
function getStoredClientToken() {
  return localStorage.getItem('cloud_client_token') || 'tokenA';
}

export let CLIENT_ID = getStoredClientId();
export let CLIENT_TOKEN = getStoredClientToken();

/** Kemas kini CLIENT_ID/CLIENT_TOKEN dari localStorage (selepas tukar client). */
export function updateConfigFromStorage() {
  CLIENT_ID = getStoredClientId();
  CLIENT_TOKEN = getStoredClientToken();
  if (typeof window !== 'undefined' && window.Config) {
    window.Config.CLIENT_ID = CLIENT_ID;
    window.Config.CLIENT_TOKEN = CLIENT_TOKEN;
  }
}

function getImageBaseUrl() {
    return `${BASE_URL}/storage/${CLIENT_ID}/images`;
}

function resolveImagePathForUrl(imagePath) {
    if (!imagePath || typeof imagePath !== 'string') return 'noimage.png';
    if (imagePath.startsWith('http')) return imagePath;
    // Normalize: /images/category/file, images/category/file → category/file
    const p = imagePath.replace(/^\/+/, '').replace(/^images\//, '');
    return p || 'noimage.png';
}

if (typeof window !== 'undefined') {
    window.Config = {
        BASE_URL,
        API_URL,
        SOCKET_URL,
        CLOUD_URL,
        get CLIENT_ID() { return CLIENT_ID; },
        set CLIENT_ID(v) { CLIENT_ID = v; },
        get CLIENT_TOKEN() { return CLIENT_TOKEN; },
        set CLIENT_TOKEN(v) { CLIENT_TOKEN = v; },
        getImageBaseUrl,
        resolveImagePathForUrl,
        updateConfigFromStorage
    };
}
