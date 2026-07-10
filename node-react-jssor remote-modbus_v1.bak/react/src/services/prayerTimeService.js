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

  // Dapatkan waktu solat untuk tarikh tertentu
  // timeService: optional, untuk guna calibrated time
  getPrayerTime(date, prayerName, timeService = null) {
    // Jika date tidak diberikan, guna current time (calibrated jika timeService ada)
    if (!date) {
      date = new Date(Date.now());
    }
    
    const dateStr = this.formatDateKey(date);
    const dayData = this.takwim.find(item => item.date === dateStr);
    
    if (!dayData) return null;
    
    if (prayerName) {
      return dayData[prayerName] || null;
    }
    
    return {
      Subuh: dayData.Subuh || null,
      Zohor: dayData.Zohor || null,
      Asar: dayData.Asar || null,
      Maghrib: dayData.Maghrib || null,
      Isyak: dayData.Isyak || null
    };
  }

  // Format tarikh sebagai key (YYYY-MM-DD)
  formatDateKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Bandingkan masa sekarang dengan waktu solat
  // Return: { isPrayerTime: boolean, prayerName: string, timeMatch: boolean }
  // timeService: optional, untuk guna calibrated time
  checkPrayerTime(currentDate, prayerName, toleranceSeconds = 0, timeService = null) {
    // Jika currentDate tidak diberikan, guna current time (calibrated jika timeService ada)
    if (!currentDate) {
      currentDate = new Date(Date.now());
    }
    const prayerTime = this.getPrayerTime(currentDate, prayerName, timeService);
    
    if (!prayerTime) {
      return { isPrayerTime: false, prayerName: null, timeMatch: false };
    }

    const [prayerHours, prayerMinutes] = prayerTime.split(':').map(Number);
    const currentHours = currentDate.getHours();
    const currentMinutes = currentDate.getMinutes();
    const currentSeconds = currentDate.getSeconds();

    // Convert kepada total seconds untuk perbandingan
    const prayerTotalSeconds = prayerHours * 3600 + prayerMinutes * 60;
    const currentTotalSeconds = currentHours * 3600 + currentMinutes * 60 + currentSeconds;

    // Check jika masa sekarang sama dengan waktu solat (dengan tolerance)
    const diffSeconds = Math.abs(currentTotalSeconds - prayerTotalSeconds);
    const timeMatch = diffSeconds <= toleranceSeconds;

    return {
      isPrayerTime: timeMatch,
      prayerName: timeMatch ? prayerName : null,
      timeMatch,
      diffSeconds
    };
  }

  // Check semua waktu solat untuk tarikh tertentu
  // timeService: optional, untuk guna calibrated time
  checkAllPrayerTimes(currentDate, toleranceSeconds = 0, timeService = null) {
    if (!currentDate) {
      currentDate = new Date(Date.now());
    }
    
    const prayers = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];
    const results = {};

    prayers.forEach(prayer => {
      results[prayer] = this.checkPrayerTime(currentDate, prayer, toleranceSeconds, timeService);
    });

    // Cari waktu solat yang sedang berlaku
    const activePrayer = prayers.find(prayer => results[prayer].isPrayerTime);

    return {
      ...results,
      activePrayer: activePrayer || null
    };
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

