/**
 * Setiap 60s: baca semula hebahan, kira set aktif, dan broadcast HANYA bila berubah.
 * Ini buang keperluan reload 12 AM untuk hebahan.
 */
function startHebahanScheduler(dataService, socketServerService, intervalMs = 60 * 1000) {
  let lastSignature = null;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5; // log hanya 5 error berturut-turut, kemudian senyap

  async function tick() {
    try {
      const content = await dataService.readFile('hebahan').catch(() => '');
      const active = dataService.parseHebahan(content, new Date());
      const signature = JSON.stringify(active.map(h => h.text));
      consecutiveErrors = 0; // reset counter bila berjaya
      if (signature !== lastSignature) {
        lastSignature = signature;
        socketServerService.broadcastHebahanUpdate(active);
        console.log(`hebahan: set aktif berubah -> broadcast (${active.length} item)`);
      }
    } catch (err) {
      consecutiveErrors++;
      if (consecutiveErrors <= MAX_CONSECUTIVE_ERRORS) {
        console.error(`hebahanScheduler tick error (#${consecutiveErrors}):`, err.message);
      } else if (consecutiveErrors === MAX_CONSECUTIVE_ERRORS + 1) {
        console.error(`hebahanScheduler: ${MAX_CONSECUTIVE_ERRORS} kali gagal berturut-turut — log ditahan untuk elak banjir log.`);
      }
      // Timer terus berjalan — akan cuba semula pada tick seterusnya
    }
  }

  tick();
  const timer = setInterval(tick, intervalMs);
  // .unref() supaya scheduler tidak halang Node.js exit semasa graceful shutdown
  if (timer.unref) timer.unref();
  return () => clearInterval(timer);
}

module.exports = { startHebahanScheduler };