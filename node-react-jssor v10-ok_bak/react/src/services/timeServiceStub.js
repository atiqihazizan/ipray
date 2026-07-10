/**
 * Stub timeService: guna Date.now() sahaja (masa mesin).
 * Digunakan supaya frontend tidak bergantung pada offset/sync; calculation guna jam tempatan.
 */
const timeServiceStub = {
  now: () => Date.now(),
  syncWithServer: () => Promise.resolve(),
  cleanup: () => {},
  init: () => Promise.resolve()
};

export default timeServiceStub;
