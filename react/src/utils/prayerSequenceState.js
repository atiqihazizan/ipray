/**
 * State kongsi (di luar React tree) untuk tandakan bila urutan azan/iqamah/solat
 * (PrayerSequencePage) sedang aktif di skrin. Dipakai oleh proses lain (contoh: reload
 * akibat data:updated dari panel setting) supaya boleh tangguh tindakan sehingga
 * urutan solat selesai — elak paparan azan/iqamah/solat terganggu atau berulang keluar
 * di tengah jalan.
 */
let active = false;
let onDeactivate = null;

export function setPrayerSequenceActive(value) {
  active = value;
  if (!value && onDeactivate) {
    const cb = onDeactivate;
    onDeactivate = null;
    cb();
  }
}

export function isPrayerSequenceActive() {
  return active;
}

/**
 * Jalankan callback serta-merta jika urutan solat tidak aktif.
 * Jika aktif, tangguh dan jalankan SEKALI sahaja bila urutan solat tamat.
 */
export function runAfterPrayerSequence(callback) {
  if (!active) {
    callback();
    return;
  }
  onDeactivate = callback;
}
