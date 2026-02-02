'use strict'

/**
 * Fungsi untuk mengekstrak data dan mengembalikannya dalam format JSON sesuai dengan struktur aplikasi
 * Menggunakan caching untuk mengoptimalkan kinerja (load sekali sahaja)
 */
const dataExtractor = (function() {
  const wdays = ["AHAD","ISNIN","SELASA","RABU","KHAMIS","JUMAAT","SABTU"];
  const mname = ["MASIHI","JAN","FEB","MAC","APR","MEI","JUN","JUL","OGS","SEP","OKT","NOV","DIS"];

  // Struktur data yang akan menyimpan semua data yang diekstrak
  const sysData = {
    agency: {},
    program: [],
    highlights: [], // Untuk data dari highlight.txt
    kuliah: [],     // Untuk data dari kuliah.txt
    programs: [],   // Untuk data dari program.txt
    scrolls: [],    // Untuk data dari scroll.txt
    slides: [],     // Untuk data dari slide.txt
    upcoming: []    // Untuk data dari upcoming.txt
  };
  
  // Cache untuk menyimpan hasil data yang sudah diproses
  const cache = {
    dataLoaded: false,
    appData: null,
    upcomingEvents: null,
    upcomingNotice: null,  // Diganti dari announcements
    kuliahUpcoming: null,  // Diganti dari activeKuliah
    presentFormat: null
  };
  
  // Data akan diterima terus dari Electron API
  
  /**
   * Fungsi bantuan untuk memformat tanggal
   * @param {string} dtString - String tanggal format YYYY-MM-DD
   * @returns {Array} - [year, month, day, hour, minute]
   */
  function parseDateTime(dtString) {
    if (dtString.includes('-')) {
      const [datePart, timePart] = dtString.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart ? timePart.split(':').map(Number) : [0, 0];
      return [year, month, day, hour, minute];
    } else if (dtString.includes('/')) {
      const [datePart, timePart] = dtString.split(' ');
      const [day, month, year] = datePart.split('/').map(Number);
      const [hour, minute] = timePart ? timePart.split(':').map(Number) : [0, 0];
      return [year, month, day, hour, minute];
    }
    return [2000, 1, 1, 0, 0];
  }
  
  /**
   * Menghitung perbedaan hari, jam, menit antara tanggal target dan sekarang
   * @param {Date|string} targetDate - Tanggal target
   * @returns {Array} - [hari, jam, menit]
   */
  function GetDiff(targetDate) {
    const now = new Date();
    const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (8 * 3600000));
    
    let end = targetDate;
    if (typeof targetDate === 'string') {
      const [year, month, day, hour, minute] = parseDateTime(targetDate);
      end = new Date(year, month-1, day, hour, minute);
    }
    
    const utcEnd = new Date(end.getTime() + (end.getTimezoneOffset() * 60000) + (8 * 3600000));
    const diffMs = utcNow - utcEnd;
    
    // Hitung perbezaan dalam minit, jam, dan hari
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    // Hitung perbezaan hari dengan membandingkan tarikh (tanpa kira masa)
    const startOfDayNow = new Date(utcNow.getFullYear(), utcNow.getMonth(), utcNow.getDate());
    const startOfDayEnd = new Date(utcEnd.getFullYear(), utcEnd.getMonth(), utcEnd.getDate());
    const diffDays = Math.floor((startOfDayNow - startOfDayEnd) / (1000 * 60 * 60 * 24));
    
    return [
      diffDays,          // Jumlah hari penuh
      diffHours,         // Jumlah jam penuh
      diffMinutes        // Jumlah minit penuh
    ];
  }
  
  /**
   * Mendapatkan selisih waktu dalam format tertentu
   * @param {string} dts - String datetime
   * @returns {object|boolean} - Info selisih waktu atau false
   */
  function GetDiff2(dts) {
    const dtString = dts.split("|")[0];
    const [year, month, day, hour, minute] = parseDateTime(dtString);
    const dt = new Date(year, month-1, day, hour, minute);
    const [asDay, asHour, asMin] = GetDiff(dt);
    
    if(asDay < 0) return {duration:(asDay * -1), duraStr:(asDay * -1) + ' Hari Lagi', type: 'day'};
    if(asMin === 0) return {duration:0, duraStr:'Sedang berlangsung', type: 'now'};
    if(asMin < 0) return {duration:(asMin * -1), duraStr:(asMin * -1) + ' Minit Lagi', type: 'min'};
    if(asHour < 0) return {duration:(asHour * -1), duraStr:(asHour * -1) + ' Jam Lagi', type: 'hour'};
    return false;
  }
  
  /**
   * Menerima data dari electron API sahaja (tidak lagi berurusan dengan fail)
   * @param {string} dataType - Jenis data yang diminta
   * @returns {string} - Data yang diterima dari electron
   */
  function getDataFromElectron(dataType) {
    try {
      // Hanya gunakan electronAPI sahaja
      if (window.electronAPI) {
        const data = window.electronAPI.getData(dataType);
        if (!data) throw new Error(`Failed to get data: ${dataType}`);
        return data;
      } else {
        throw new Error('Electron API tidak tersedia - aplikasi mesti dijalankan dalam Electron');
      }
    } catch (error) {
      console.error(`Error mendapatkan data ${dataType}:`, error);
      throw error;
    }
  }
  
  /**
   * Menerima data dari electron dan mengekstrak data (hanya memuat data sekali)
   * @returns {Object} - Data yang telah diekstrak
   */
  function extractData() {
    // Jika data sudah dimuat sebelumnya, kembalikan data yang ada
    if (cache.dataLoaded) return sysData;
    
    try {
      
      // Mengambil semua data dari electron API
      const highlightData = getDataFromElectron('highlight');
      const kuliahData = getDataFromElectron('kuliah');
      const programData = getDataFromElectron('program');
      const scrollData = getDataFromElectron('scroll');
      const slideData = getDataFromElectron('slide');
      const upcomingData = getDataFromElectron('upcoming');

      // Mengolah data highlight dari electron
      sysData.highlights = highlightData.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const [date, name, description] = line.split('|');
          return {
            date,
            name,
            description,
            raw: line // Simpan raw data untuk format original
          };
        });

      // Mengolah data kuliah dari electron
      sysData.kuliah = kuliahData.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const [dateTime, title, speaker, topic, audience] = line.split('|');
          const [date, time] = dateTime.split(' ');
          return { date,time,title,speaker,topic,audience, raw: line, date_time: dateTime };
        });

      // Mengolah data program dari electron
      sysData.programs = programData.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const [dateTime, title, location, description, audience] = line.split('|');
          const [date, time] = dateTime.split(' ');
          return { date,time,title,location,description,audience, raw: line, date_time: dateTime };
        });

      // Mengolah data scroll dari electron
      sysData.scrolls = scrollData.split('|')
        .map(item => item.trim())
        .filter(item => item !== '');

      // Mengolah data slide dari electron
      sysData.slides = slideData.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const [dateTime, type, fileName, description] = line.split('|');
          const [date, time] = dateTime.split(' ');
          return { date,time,type,fileName,description,raw: line, date_time: dateTime,
            isVid: type === 'vid' ? 1 : type === 'iframe' ? 2 : 0,
            id: `slidvid${fileName.replace(/\.[^/.]+$/, "")}` // ID sesuai dengan nama file tanpa ekstensi
          };
        });

      // Mengolah data upcoming dari electron
      sysData.upcoming = upcomingData.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const [dateTime, title, description, location, audience] = line.split('|');
          const [date, time] = dateTime.split(' ');
          return { date,time,title,description,location,audience,raw: line, date_time: dateTime };
        });

      // Tandai bahwa data telah dimuat
      cache.dataLoaded = true;
      
      return sysData;
    } catch (error) {
      console.error('Error dalam mengekstrak data:', error);
      return { error: error.message };
    }
  }
  
  /**
   * Mengekstrak data dalam format kompitabel dengan aplikasi
   * @returns {Object} - Data sesuai format yang dibutuhkan aplikasi
   */
  function getAppData() {
    // Gunakan cache jika sudah ada
    if (cache.appData) {return cache.appData;}
    
    extractData();
    
    // Konversi data untuk format aplikasi
    const eventData = [...sysData.highlights.map(h => h.raw)];
    const upcomingList = [...sysData.upcoming.map(u => u.raw)]; // Diganti dari countdownData
    
    // Format slides untuk format aplikasi
    const slides = sysData.slides.map((s, index) => ({ id: `slidvid${index}`, isVid: s.type === 'vid' ? 1 : s.type === 'iframe' ? 2 : 0, filename: s.fileName }));
    
    // Format kuliahData untuk aplikasi
    const kuliahList = sysData.kuliah.map(k => k.raw); // Diganti dari kuliahData
    
    // Simpan hasil ke cache
    cache.appData = {eventData,upcomingList,slides,kuliahList,rawData: sysData};
    return cache.appData;
  }
  
  /**
   * Mengambil data dalam format untuk ditampilkan atau diproses
   * @returns {Object} - Data untuk ditampilkan
   */
  function getDataAsJson() {
    extractData();
    return JSON.stringify(sysData, null, 2);
  }
  
  /**
   * Mendapatkan acara yang akan datang untuk countdown
   * @returns {Array} - Acara untuk countdown
   */
  function getUpcomingEvents() {    
    if(!cache.dataLoaded) extractData();
    
    // Sama seperti logika present.js
    const rows = sysData.highlights
      .filter(item => {
        const [year, month, day] = item.date.split('-').map(Number);
        const dateObj = new Date(year, month-1, day);
        const [asDays] = GetDiff(dateObj);
        // Filter for items less than 0 days AND greater than -200 days
        return (!isNaN(asDays) && asDays < 0 && asDays > -200);
      })
      .map(item => {
        const [year, month, day] = item.date.split('-').map(Number);
        const dateObj = new Date(year, month-1, day);
        const [asDays] = GetDiff(dateObj);
        return [
          item.name,
          item.date,
          // item.hijriDate,
          // item.description,
          asDays * -1
        ];
      });
    
    // Simpan hasil ke cache
    cache.upcomingEvents = rows;
    return rows;
  }
  
  /**
   * Mendapatkan acara berdasarkan rentang tanggal
   * @param {string} startDate - Tanggal mulai (format: YYYY-MM-DD)
   * @param {string} endDate - Tanggal akhir (format: YYYY-MM-DD)
   * @returns {Object} - Acara yang terjadi dalam rentang tanggal
   */
  function getEventsByDateRange(startDate, endDate) {
    if(!cache.dataLoaded) extractData();
    
    // Fungsi untuk memeriksa apakah tanggal berada dalam rentang
    const isInDateRange = (eventDate) => {return eventDate >= startDate && eventDate <= endDate;};

    // Filter acara berdasarkan rentang tanggal
    const filteredHighlights = sysData.highlights.filter(item => isInDateRange(item.date));
    const filteredKuliah = sysData.kuliah.filter(item => isInDateRange(item.date));
    const filteredPrograms = sysData.programs.filter(item => isInDateRange(item.date));
    const filteredSlides = sysData.slides.filter(item => isInDateRange(item.date));
    const filteredUpcoming = sysData.upcoming.filter(item => isInDateRange(item.date));
    return {highlights: filteredHighlights,kuliah: filteredKuliah,programs: filteredPrograms,slides: filteredSlides,upcoming: filteredUpcoming};
  }
  
  /**
   * Mendapatkan pengumuman untuk tampilan
   * @returns {Array} - Data pengumuman
   */
  function getUpcomingNotice() { // Diganti dari getAnnouncements
    if(!cache.dataLoaded) extractData();
    
    // Logika pengumuman sesuai dengan showAnnouncement() di present.js
    const upcomingNotice = sysData.upcoming // Diganti dari announcements
      .filter(item => {
        const timeInfo = getTimeRemaining(`${item.date} ${item.time}`);
        // Pass jika: event belum berlalu DAN (dalam 15 hari atau kurang)
        return !timeInfo.isPast && timeInfo.totalMinutes <= (15 * 24 * 60);
      })
      .map(item =>{ 
        const dateParts = item.date.split("-");
        const timeParts = item.time.split(":");
        const day = wdays[new Date(Date.UTC(+dateParts[0], +dateParts[1]-1, +dateParts[2])).getDay()];
        const date = `${day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()}, ${dateParts[2]} ${mname[dateParts[1] * 1].charAt(0).toUpperCase() + mname[dateParts[1] * 1].slice(1).toLowerCase()} ${dateParts[0]}`;
        const time = `${timeParts[0]}:${timeParts[1]}${timeParts[2] === "00" ? "" : timeParts[2] === "30" ? "30" : ""}${timeParts[2] === "00" ? "" : timeParts[2] < 12 ? " AM" : " PM"}`;

        // Guna function baru untuk counter masa tinggal yang lebih tepat
        const timeRemaining = formatAnnouncementTime(item);

        return [item.title,item.description,date,time,item.location,item.audience,timeRemaining];
      });
    
    // Simpan hasil ke cache
    cache.upcomingNotice = upcomingNotice; // Diganti dari announcements
    return upcomingNotice; // Diganti dari announcements
  }
  
  /**
   * Mendapatkan data kuliah untuk tampilan
   * @returns {Array} - Data kuliah yang akan ditampilkan
   */
  function getKuliahUpcoming() { // Diganti dari getActiveKuliah
    if(!cache.dataLoaded) extractData();
    
    // Logika kuliah aktif sesuai dengan showKuliah() di present.js
    const kuliahUpcoming = sysData.kuliah
      .filter(item => {
        const diffInfo = GetDiff2(`${item.date} ${item.time}|${item.title}`);
        
        // Dapatkan tarikh semasa
        const currentDate = new Date();
        
        // Tetapkan ke awal minggu (Isnin)
        // Dengan formula ini: Isnin = 1, Selasa = 2, ..., Ahad = 0
        // Maka (currentDate.getDay() || 7) - 1 akan berikan: 
        // Isnin: (1 || 7) - 1 = 0, Selasa: (2 || 7) - 1 = 1, ... Ahad: (0 || 7) - 1 = 6
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - ((currentDate.getDay() + 6) % 7));
        startOfWeek.setHours(0, 0, 0, 0);
        
        // Tetapkan ke akhir minggu (Ahad)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        // Parse tarikh kuliah
        const dateParts = item.date.split("-");
        const kuliahDate = new Date(Date.UTC(+dateParts[0], +dateParts[1]-1, +dateParts[2]));
        
        // Filter hanya kuliah yang berlaku dalam minggu semasa
        // DAN masih berlaku (diffInfo !== false)
        return (diffInfo !== false) && (kuliahDate >= startOfWeek && kuliahDate <= endOfWeek);
      })
      .map(item => {
        const dateParts = item.date.split("-");
        const timeParts = item.time.split(":");
        const day = wdays[new Date(Date.UTC(+dateParts[0], +dateParts[1]-1, +dateParts[2])).getDay()];
        const date = `${day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()}, ${dateParts[2]} ${mname[dateParts[1] * 1].charAt(0).toUpperCase() + mname[dateParts[1] * 1].slice(1).toLowerCase()} ${dateParts[0]}`;
        const time = `${timeParts[0]}:${timeParts[1]}${timeParts[2] === "00" ? "" : timeParts[2] === "30" ? "30" : ""}${timeParts[2] === "00" ? "" : timeParts[2] < 12 ? " AM" : " PM"}`;
        
        return [item.title,item.speaker,date,item.topic,item.audience,]
      });
    
    // Simpan hasil ke cache
    cache.kuliahUpcoming = kuliahUpcoming; // Diganti dari activeKuliah
    return kuliahUpcoming; // Diganti dari activeKuliah
  }
  
  /**
   * Mencari acara berdasarkan kata kunci
   * @param {string} keyword - Kata kunci untuk pencarian
   * @returns {Object} - Acara yang mengandung kata kunci
   */
  function searchEvents(keyword) {
    if(!cache.dataLoaded) extractData();
    const searchTermLower = keyword.toLowerCase();
    
    // Fungsi untuk memeriksa apakah acara mengandung kata kunci
    const containsKeyword = (event) => {return Object.values(event).some(value => {if (typeof value === 'string') { return value.toLowerCase().includes(searchTermLower);}});};

    // Filter acara berdasarkan kata kunci
    const matchedHighlights = sysData.highlights.filter(containsKeyword);
    const matchedKuliah = sysData.kuliah.filter(containsKeyword);
    const matchedPrograms = sysData.programs.filter(containsKeyword);
    const matchedSlides = sysData.slides.filter(containsKeyword);
    const matchedUpcoming = sysData.upcoming.filter(containsKeyword);
    const matchedScrolls = sysData.scrolls.filter(text => text.toLowerCase().includes(searchTermLower));

    return {
      highlights: matchedHighlights,
      kuliah: matchedKuliah,
      programs: matchedPrograms,
      slides: matchedSlides,
      upcoming: matchedUpcoming,
      scrolls: matchedScrolls
    };
  }
  
  /**
   * Mengkonversi data ke format untuk dikonsumsi aplikasi present.js
   * @returns {Object} - Data dalam format yang dibutuhkan present.js
   */
  function formatForPresent() {
    // Gunakan cache jika sudah ada
    // if (cache.presentFormat) {
    //   return cache.presentFormat;
    // }
    
    if(!cache.dataLoaded) extractData();
    
    // Persiapkan semua data yang dibutuhkan
    const upcomingEvents = getUpcomingEvents();
    const upcomingNotice = getUpcomingNotice(); // Diganti dari getAnnouncements
    const kuliahUpcoming = getKuliahUpcoming();  // Diganti dari getActiveKuliah
    
    // Format data sesuai yang dibutuhkan di present.js
    const presentData = {
      slides: sysData.slides.map((s, idx) => ({
        id: `slidvid${idx}`, 
        isVid: s.type === 'vid' ? 1 : s.type === 'iframe' ? 2 : 0,
        filename: s.fileName
      })),
      eventData: sysData.highlights.map(h => h.raw),
      upcomingList: sysData.upcoming.map(u => u.raw),   // Diganti dari countdownData
      kuliahList: sysData.kuliah.map(k => k.raw),       // Diganti dari kuliahData
      upcomingNotice: upcomingNotice,                   // Diganti dari umumActive
      kuliahUpcoming: kuliahUpcoming,                   // Diganti dari kuliahActive
      eventUpcoming: upcomingEvents
    };
    
    // Simpan hasil ke cache
    cache.presentFormat = presentData;
    return presentData;
  }
  
  /**
   * Memulai ulang cache (reload data)
   * Berguna jika perlu memuat ulang data
   */
  function resetCache() {
    // Reset semua cache
    cache.dataLoaded = false;
    cache.appData = null;
    cache.upcomingEvents = null;
    cache.upcomingNotice = null;  // Diganti dari announcements
    cache.kuliahUpcoming = null;  // Diganti dari activeKuliah
    cache.presentFormat = null;
  }

  // Expose fungsi-fungsi
  return {
    extractData,
    getDataAsJson,
    getEventsByDateRange,
    getUpcomingEvents,
    getUpcomingNotice, // Diganti dari getAnnouncements
    getKuliahUpcoming, // Diganti dari getActiveKuliah
    searchEvents,
    formatForPresent,
    getAppData,
    resetCache
  };
})();
