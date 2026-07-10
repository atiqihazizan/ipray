/**
 * Custom event names untuk time driver (window).
 * Data dihantar melalui event supaya hanya komponen yang listen re-render; elak context/useState untuk trigger.
 */

export const TIME_EVENTS = {
  TIME_UPDATE: 'time-update',
  HIJRI_DATE_CHANGED: 'hijri-date-changed',
  PRAYER_WARNING: 'prayer-warning',
  PRAYER_TIME: 'prayer-time',
  SYURUK_TIME: 'syuruk-time',
  DATE_CHANGED: 'date-changed',
  SLIDE_CHANGED: 'slide-changed'
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

export function dispatchPrayerTime(prayerName) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.PRAYER_TIME, { detail: { prayerName } }));
  }
}

export function dispatchSyurukTime() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.SYURUK_TIME, { detail: {} }));
  }
}

export function dispatchDateChanged(todayStr) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.DATE_CHANGED, { detail: { todayStr } }));
  }
}

export function dispatchSlideChanged(datetime) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.SLIDE_CHANGED, { detail: { datetime } }));
  }
}
