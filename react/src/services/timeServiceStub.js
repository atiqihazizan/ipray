/**
 * timeServiceStub: guna system clock kiosk terus.
 * Backend dah update hardware clock (RTC) bila NTP sync, jadi frontend tak perlu sync offset dari API.
 */

const timeServiceStub = {
  now: () => Date.now(),

  async init() {
    // No-op - guna system clock terus
  },

  async forceSync() {
    // No-op - guna system clock terus
  },

  cleanup() {
    // No-op
  },
};

export default timeServiceStub;
