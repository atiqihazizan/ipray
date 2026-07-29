/**
 * Custom event names untuk time driver (window).
 * Data dihantar melalui event supaya hanya komponen yang listen re-render; elak context/useState untuk trigger.
 */

export const TIME_EVENTS = {
  TIME_UPDATE: 'time-update',
  HIJRI_DATE_CHANGED: 'hijri-date-changed',
  PRAYER_WARNING: 'prayer-warning',
  SYURUK_TIME: 'syuruk-time',
  SYURUK_BEEP_START: 'syuruk-beep-start',
  SYURUK_BEEP_STOP: 'syuruk-beep-stop',
  DATE_CHANGED: 'date-changed',
  SLIDE_CHANGED: 'slide-changed',
  MINUTE_CHANGED: 'minute-changed',
  BLINK_TOGGLE: 'blink-toggle',
  SEQUENCE_STATE: 'sequence-state',
  SEQUENCE_END: 'sequence-end'
};

export function dispatchTimeUpdate(payload) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.TIME_UPDATE, { detail: payload }));
  }
}

export function dispatchHijriDateChanged(hijri) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.HIJRI_DATE_CHANGED, { detail: { hijri } }));
  }
}

export function dispatchPrayerWarning(prayerName, prayerTimeStr) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.PRAYER_WARNING, { detail: { prayerName, prayerTimeStr } }));
  }
}

export function dispatchSyurukTime() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.SYURUK_TIME, { detail: {} }));
  }
}

export function dispatchSyurukBeepStart() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.SYURUK_BEEP_START, { detail: {} }));
  }
}

export function dispatchSyurukBeepStop() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.SYURUK_BEEP_STOP, { detail: {} }));
  }
}

export function dispatchDateChanged(todayStr) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.DATE_CHANGED, { detail: { todayStr } }));
  }
}

export function dispatchBlinkToggle(blink) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.BLINK_TOGGLE, { detail: { blink } }));
  }
}

export function dispatchSlideChanged(datetime) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.SLIDE_CHANGED, { detail: { datetime } }));
  }
}

export function dispatchSequenceState({ phase, countdown, prayerName, prayerTimeStr }) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.SEQUENCE_STATE, { detail: { phase, countdown, prayerName, prayerTimeStr } }));
  }
}

export function dispatchSequenceEnd() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.SEQUENCE_END, { detail: {} }));
  }
}
