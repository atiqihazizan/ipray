/**
 * State kongsi (di luar React tree) untuk tandakan bila urutan azan/iqamah/solat
 * (PrayerSequencePage) sedang aktif di skrin. Dipakai oleh proses lain (contoh: reload
 * akibat data:updated dari panel setting) supaya boleh tangguh tindakan sehingga
 * urutan solat selesai — elak paparan azan/iqamah/solat terganggu atau berulang keluar
 * di tengah jalan.
 */
let active = false;
let onDeactivateQueue = [];

export function setPrayerSequenceActive(value) {
  active = value;
  if (!value && onDeactivateQueue.length > 0) {
    const queue = onDeactivateQueue;
    onDeactivateQueue = [];
    queue.forEach(cb => cb());
  }
}

export function isPrayerSequenceActive() {
  return active;
}

/**
 * Jalankan callback serta-merta jika urutan solat tidak aktif.
 * Jika aktif, queue dan jalankan semua callbacks bila urutan solat tamat.
 */
export function runAfterPrayerSequence(callback) {
  if (!active) {
    callback();
    return;
  }
  onDeactivateQueue.push(callback);
}
