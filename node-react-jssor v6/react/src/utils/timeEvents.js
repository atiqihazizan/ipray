/**
 * Custom event names untuk time driver (window).
 * Data dihantar melalui event supaya hanya komponen yang listen re-render; elak context/useState untuk trigger.
 */

export const TIME_EVENTS = {
  TIME_UPDATE: 'time-update',
  HIJRI_DATE_CHANGED: 'hijri-date-changed',
  PRAYER_WARNING: 'prayer-warning',
  PRAYER_TIME: 'prayer-time',
  DATE_CHANGED: 'date-changed'
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

export function dispatchPrayerWarning(prayerName) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.PRAYER_WARNING, { detail: { prayerName, in30Seconds: true } }));
  }
}

export function dispatchPrayerTime(prayerName) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.PRAYER_TIME, { detail: { prayerName } }));
  }
}

export function dispatchDateChanged(todayStr) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIME_EVENTS.DATE_CHANGED, { detail: { todayStr } }));
  }
}
