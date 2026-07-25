class PrayerTimeService {
  constructor() {
    // Data takwim - format: { date: 'YYYY-MM-DD', Subuh: 'HH:MM', Zohor: 'HH:MM', Asar: 'HH:MM', Maghrib: 'HH:MM', Isyak: 'HH:MM' }
    this.takwim = [];
  }

  // Set data takwim
  setTakwim(takwimData) {
    this.takwim = Array.isArray(takwimData) ? takwimData : [];
  }

  // Tambah data takwim
  addTakwim(takwimData) {
    if (Array.isArray(takwimData)) {
      this.takwim = [...this.takwim, ...takwimData];
    } else {
      this.takwim.push(takwimData);
    }
  }

  // Parse waktu dari string format "HH:MM" kepada Date object untuk hari tertentu
  parseTimeToDate(date, timeString) {
    if (!timeString) return null;
    
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}

// Export singleton instance
const prayerTimeService = new PrayerTimeService();
export default prayerTimeService;

