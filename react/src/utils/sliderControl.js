/**
 * Singleton ref untuk jssor slider instance.
 * init() dipanggil dalam useJssorSlider bila slider berjaya dibuat.
 * pause() dan play() selamat dipanggil dari mana-mana — no-op jika slider belum init.
 */

let _instance = null;
let _externalPause = false;

export function sliderInit(instance) {
  _instance = instance || null;
  _externalPause = false;
}

export function sliderPause() {
  _externalPause = true;
  if (_instance && typeof _instance.$Pause === 'function') {
    try { _instance.$Pause(); } catch (_) {}
  }
}

export function sliderPlay() {
  if (_externalPause) return;
  if (_instance && typeof _instance.$Play === 'function') {
    try { _instance.$Play(); } catch (_) {}
  }
}

export function sliderResume() {
  _externalPause = false;
  if (_instance && typeof _instance.$Play === 'function') {
    try { _instance.$Play(); } catch (_) {}
  }
}

export function sliderGoTo(index) {
  if (_instance && typeof _instance.$GoTo === 'function') {
    try { _instance.$GoTo(index); } catch (_) {}
  }
}

export function sliderIsReady() {
  return !!(_instance && _instance.$Elmt);
}
