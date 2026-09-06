/**
 * Maklumat masjid — ubah di sini untuk kemaskini semua skrin serentak.
 */
import { withAssetBase } from '../services/apiBase';

export const MOSQUE_NAME = 'MASJID TUAN ABDULLAH';
export const MOSQUE_LOCATION = 'TANAH LIAT';

/** Teks penuh untuk marquee: "MASJID TUAN ABDULLAH • TANAH LIAT" */
export const MOSQUE_FULL = `${MOSQUE_NAME} • ${MOSQUE_LOCATION}`;

/** Gambar latar slide home (hardcoded) — ubah di sini sahaja untuk tukar background home.
 *  Fail imej dihoskan di backend (nodejs/images/), bukan dibundle dengan frontend — perlu
 *  withAssetBase supaya resolve betul bila dev server tunjuk ke backend jauh (VITE_API_BASE). */
export const HOME_SLIDE_BACKGROUND = withAssetBase('/images/slides/bg-mta.webp');
