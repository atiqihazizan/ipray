import socketService from './socketService';

/**
 * Hantar event lifecycle penting (amaran waktu solat, bip mula/selesai,
 * peralihan skrin azan/iqamah/solat, ralat) ke server supaya boleh disemak
 * semula via `pm2 logs`/fail log — event ini sebelum ini HANYA nampak dalam
 * console browser kiosk, yang hilang bila reload dan tak boleh diakses tanpa
 * pergi terus ke tapak. Best-effort sahaja — kalau socket tak connect, senyap
 * gagal (jangan sekali-kali jejaskan logik bip/countdown sebenar).
 */
export function logKioskEvent(event, detail) {
  try {
    socketService.emit('client:log', { event, detail });
  } catch {
    // Senyap gagal — logging tak boleh jejaskan flow utama
  }
}

export default logKioskEvent;
