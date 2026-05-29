/**
 * Setiap 60s: baca semula hebahan, kira set aktif, dan broadcast HANYA bila berubah.
 * Ini buang keperluan reload 12 AM untuk hebahan.
 */
function startHebahanScheduler(dataService, socketServerService, intervalMs = 60 * 1000) {
  let lastSignature = null;

  async function tick() {
    try {
      const content = await dataService.readFile('hebahan').catch(() => '');
      const active = dataService.parseHebahan(content, new Date());
      const signature = JSON.stringify(active.map(h => h.text));
      if (signature !== lastSignature) {
        lastSignature = signature;
        socketServerService.broadcastHebahanUpdate(active);
        console.log(`hebahan: set aktif berubah -> broadcast (${active.length} item)`);
      }
    } catch (err) {
      console.error('hebahanScheduler tick error:', err);
    }
  }

  tick(); // jalankan sekali serta-merta
  const timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer);
}

module.exports = { startHebahanScheduler };