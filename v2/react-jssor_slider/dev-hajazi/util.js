'use strict'

// ========== FUNGSI MASA DAN FORMAT ==========
const TimeUtils = (function(){
  function NUM2(dd){return parseInt(dd)<10 ? "0"+dd : ""+dd;}
  function MinToTime(totalMin){totalMin = parseInt(totalMin); const h = Math.floor(totalMin / 60); const m = totalMin % 60; return h * 100 + m;}
  function TimeToMin(hhmm){hhmm = parseInt(hhmm); const h = Math.floor(hhmm / 100); const m = hhmm % 100; return h * 60 + m;}
  function TimeToVal(txt){const atxt = txt.split(":"); return parseInt(atxt[0])*100 + parseInt(atxt[1]);}
  function ValToTime(dd){const min = parseInt(dd); return parseInt(min/100) + ":" + NUM2(min % 100);}
  function TimeToTime(dd){let h = parseInt(dd / 100), m = parseInt(dd % 100); return (h == 0 ? 12 : (h > 12 ? h-12 : h)) + ":" + NUM2(m);}
  return {NUM2, MinToTime, TimeToMin, TimeToVal, ValToTime, TimeToTime};
})();

// ========== FUNGSI TARIKH DAN WAKTU ==========
const DateUtils = (function(){
  const mdays = [0,31,28,31,30,31,30,31,31,30,31,30,31];
  
  // Kira hari dalam tahun dan hari sejak epoch (2000)
  function GetYearDays(year,mon,day){
    let days = day;
    for(let i=1; i<mon; i++) days += mdays[i];
    let daysm = days, yy = (year % 100);
    if (yy > 0) daysm += (yy * 365) + parseInt((yy - 1) / 4) + 1;
    return [days,daysm];
  }
  
  // Parse string tarikh ke komponen [year, month, day, hour, minute]
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
  
  // Kira perbezaan masa dalam hari, jam, minit
  function GetDiff(targetDate){
    const now = new Date();
    const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (8 * 3600000));
    let end = targetDate;
    if (typeof targetDate === 'string') {
      const [year, month, day, hour, minute] = parseDateTime(targetDate);
      end = new Date(year, month-1, day, hour, minute);
    }
    const utcEnd = new Date(end.getTime() + (end.getTimezoneOffset() * 60000) + (8 * 3600000));
    const diffMs = utcNow - utcEnd;
    return [Math.floor(diffMs / (1000 * 60 * 60 * 24)), Math.floor(diffMs / (1000 * 60 * 60)), Math.floor(diffMs / (1000 * 60))];
  }
  
  // Format perbezaan masa dengan string yang sesuai
  function GetDiff2(dts){
    const dtString = dts.split("|")[0];
    const [year, month, day, hour, minute] = parseDateTime(dtString);
    const dt = new Date(year, month-1, day, hour, minute);
    const [asDay, asHour, asMin] = GetDiff(dt);
    if(asDay < 0) return {duration:(asDay * -1) , duraStr:(asDay * -1) + ' Hari Lagi', type: 'day'};
    if(asHour < 0) return {duration:(asDay * -1) , duraStr:(asHour * -1) + ' Jam Lagi', type: 'hour'};
    if(asMin < 0) return {duration:(asDay * -1) , duraStr:(asMin * -1) + ' Minit Lagi', type: 'min'};
    if(asMin === 0) return {duration:(asDay * -1) , duraStr:'Sedang berlangsung', type: 'now'};
    return false;
  }
  
  return {GetYearDays, parseDateTime, GetDiff, GetDiff2};
})();

// ========== FUNGSI HIJRIAH ==========
const HijriUtils = (function(){
  // Konversi Masehi ke Hijrah (generik - terima hdata, days, daysm, maghrib, mins)
  function calculateHijri(hdata, daysm, maghrib, mins){
    let DayH = 24, MonH = 9, YearH = 1420;
    let DaysH = daysm;
    if(maghrib <= mins && mins < 1440) DaysH++;
    let SetF = 31 - DayH, DatP = 1, BitP = 0;
    let SetS = hdata[DatP];
    while(DaysH > 0){
      if(SetS & 0x01) SetF++;
      if(DaysH > SetF){
        DayH = 0; DaysH -= SetF; MonH++;
        if(MonH === 13){MonH = 1; YearH++;}
        SetS = (SetS >> 1); SetF = 29; BitP++;
        if(BitP == 8){DatP++; BitP = 0; SetS = hdata[DatP];}
      } else {DayH += DaysH; DaysH = 0;}
    }
    return {day: DayH, month: MonH, year: YearH};
  }
  
  // Konversi tarikh Masehi (string) ke Hijrah dengan format
  function convertToHijri(masiDateStr, hdata, wdata, hname){
    const [year, month, day] = masiDateStr.split('-').map(Number);
    const [days, daysm] = DateUtils.GetYearDays(year, month, day);
    let maghrib = 0;
    if (wdata && wdata[days] && wdata[days][5]) maghrib = TimeUtils.TimeToMin(wdata[days][5]);
    const result = calculateHijri(hdata, daysm, maghrib, 0);
    return {day: result.day, month: result.month, monthName: hname[result.month], year: result.year, formatted: `${result.day}-${hname[result.month]}`};
  }
  
  return {calculateHijri, convertToHijri};
})();

// ========== FUNGSI PARSER WAKTU SOLAT ==========
const WaktuParser = (function(){
  // Parse fail takwim.txt dan return hdata & wdata
  function ParseWaktu(text){
    const atext = text.split("\r\n");
    const btext = atext[1].split("=");
    const ctext = btext[1];
    const hdata = [24];
    
    for(let i=0, j=ctext.length; i<j; i+=2){
      const dd = parseInt(ctext.substr(i,2),16);
      hdata.push(dd);
    }
    
    const wdata = [0];
    for(let i=2, j=atext.length; i<j; i++){
      const dtext = atext[i].split("\t");
      if(dtext.length == 8){
        const data = [];
        for(let k=1; k<8; k++) data.push(TimeUtils.TimeToVal(dtext[k]));
        data.push(dtext[0])
        wdata.push(data);
      }
    }
    
    return {hdata, wdata};
  }
  
  return {ParseWaktu};
})();

// ========== FUNGSI DATETIME ==========
const DateTimeUtils = (function(){
  // GetDateTime - return object dengan semua maklumat masa semasa
  function GetDateTime(){
    const d = new Date();
    const time = d.getHours() * 100 + d.getMinutes();
    const [days, daysm] = DateUtils.GetYearDays(d.getFullYear(), d.getMonth()+1, d.getDate());
    
    return {
      dow: d.getDay(),
      time: time,
      year: d.getFullYear(),
      mon: d.getMonth()+1,
      day: d.getDate(),
      hour: d.getHours(),
      min: d.getMinutes(),
      sec: d.getSeconds(),
      mins: d.getHours() * 60 + d.getMinutes(),
      days: days,
      daysm: daysm
    };
  }
  
  return {GetDateTime};
})();

// ========== FUNGSI PRAYER STAGE ==========
const PrayerUtils = (function(){
  // Kira peringkat solat seterusnya berdasarkan peringkat semasa
  function getNextStage(currentStage, stages){
    if(currentStage === stages.AZAN) return stages.IQAMAH;
    if(currentStage === stages.IQAMAH) return stages.SOLAT;
    if(currentStage === stages.SOLAT) return stages.COMPLETED;
    return stages.COMPLETED;
  }

  // Update timer display - return object dengan formatted values
  function formatPrayerTimer(currentTime, maxTime){
    currentTime = parseInt(currentTime);
    maxTime = parseInt(maxTime);
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    const percentComplete = maxTime > 0 ? (1 - (currentTime / maxTime)) * 100 : 0;

    return {
      minutes: minutes,
      seconds: seconds,
      minutesFormatted: minutes < 10 ? '0' + minutes : '' + minutes,
      secondsFormatted: seconds < 10 ? '0' + seconds : '' + seconds,
      percentComplete: percentComplete
    };
  }

  return {getNextStage, formatPrayerTimer};
})();

// ========== FUNGSI COUNTER MASA TINGGAL ==========
const CounterUtils = (function(){
  // Kira masa tinggal untuk event (lebih tepat daripada GetDiff2)
  function getTimeRemaining(targetDateTime) {
    const now = new Date();
    const target = new Date(targetDateTime);
    
    // Kira perbezaan dalam milisaat
    const diffMs = target - now;
    
    if (diffMs <= 0) {
      return {
        isPast: true,
        totalSeconds: 0,
        totalMinutes: 0,
        totalHours: 0,
        totalDays: 0,
        displayText: 'Sudah berlalu',
        shortText: 'Lalu'
      };
    }
    
    // Kira komponen masa
    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    
    // Format display text - tunjuk hanya satu unit masa yang paling besar
    let displayText = '';
    let shortText = '';
    
    if (totalDays > 0) {
      // Lebih dari 24 jam - papar dalam hari sahaja
      displayText = `${totalDays} hari lagi`;
      shortText = `${totalDays}d`;
    } else if (totalHours > 0) {
      // Lebih dari 60 minit - papar dalam jam sahaja
      displayText = `${totalHours} jam lagi`;
      shortText = `${totalHours}j`;
    } else if (totalMinutes > 0) {
      // Lebih dari 60 saat - papar dalam minit sahaja
      displayText = `${totalMinutes} minit lagi`;
      shortText = `${totalMinutes}m`;
    } else {
      // Kurang dari 60 saat - papar dalam saat sahaja
      displayText = `${totalSeconds} saat lagi`;
      shortText = `${totalSeconds}s`;
    }
    
    return {
      isPast: false,
      totalSeconds: totalSeconds,
      totalMinutes: totalMinutes,
      totalHours: totalHours,
      totalDays: totalDays,
      displayText: displayText,
      shortText: shortText
    };
  }

  // Format masa tinggal untuk announcement display
  function formatAnnouncementTime(item) {
    const timeInfo = getTimeRemaining(`${item.date} ${item.time}`);
    
    if (timeInfo.isPast) {
      return 'Sudah berlalu';
    }
    
    // Guna displayText yang sudah diformat mengikut kehendak
    return timeInfo.displayText;
  }

  return {getTimeRemaining, formatAnnouncementTime};
})();

// Export ke global scope
const {NUM2, MinToTime, TimeToMin, TimeToVal, ValToTime, TimeToTime} = TimeUtils;
const {GetYearDays, parseDateTime, GetDiff, GetDiff2} = DateUtils;
const {calculateHijri, convertToHijri} = HijriUtils;
const {ParseWaktu} = WaktuParser;
const {GetDateTime} = DateTimeUtils;
const {getNextStage, formatPrayerTimer} = PrayerUtils;
const {getTimeRemaining, formatAnnouncementTime} = CounterUtils;

