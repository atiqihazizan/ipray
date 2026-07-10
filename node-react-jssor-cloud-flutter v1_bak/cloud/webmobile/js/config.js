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

export const CLIENT_ID = localStorage.getItem('cloud_client_id') || 'clientA';
export const CLIENT_TOKEN = localStorage.getItem('cloud_client_token') || 'tokenA';

function getImageBaseUrl() {
    return `${BASE_URL}/images/${CLIENT_ID}`;
}

function resolveImagePathForUrl(imagePath) {
    if (!imagePath || typeof imagePath !== 'string') return 'noimage.png';
    return imagePath.replace(/^\/images\/?/, '').replace(/^images\//, '');
}

if (typeof window !== 'undefined') {
    window.Config = {
        BASE_URL,
        API_URL,
        SOCKET_URL,
        CLOUD_URL,
        CLIENT_ID,
        CLIENT_TOKEN,
        getImageBaseUrl,
        resolveImagePathForUrl
    };
}
