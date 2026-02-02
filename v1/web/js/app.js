'use strict'
const present = (function(){
  const sysData = {agency:{},program:[]};
  const iPray = {page:0,maxPage:0,kuliah:0,slide:0,time:0,countdown:0,umum:0,attr:[11,11,12,4,5],timer:[5,5,5,5,3,5],stsmsg:1,pendingSlideTransition:false,pendingPageTransition: false,pendingPrayerTransition: false};
  const DateTime = {year:0,mon:0,day:0,dow:0,yearh:0,monh:0,dayh:0,hour:0,min:0,sec:0,mins:0,time:-1,days:0,daysm:0,maghrib:0,wnow:0};
  const mdays = [0,31,28,31,30,31,30,31,31,30,31,30,31];
  const wdays = ["AHAD","ISNIN","SELASA","RABU","KHAMIS","JUMAAT","SABTU"];
  const mname = ["MASIHI","JAN","FEB","MAC","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const hname = ["HIJRAH","MUHARRAM","SAFAR","RAB.AWAL","RAB.AKHIR","JAM.AWAL","JAM.AKHIR","REJAB","SYA`BAN","RAMADHAN","SYAWAL","ZULKAEDAH","ZULHIJJAH"];
  const wname = ["MASA","SUBUH","SYURUK","ZOHOR","ASAR","MAGHRIB","ISYAK"];
  const cname = ["K.LUMPUR","MEKAH","MADINAH","AL-AQSA"];
  let appData = {};

  let slides = [];
  let masukWaktu = false, player, playing = false, popupEl, dot = false;
  let beepAudio = null;
  
  // Bahagian untuk menguruskan peringkat solat
  const prayerStages = {AZAN: 0, IQAMAH: 1, SOLAT: 2, COMPLETED: 3};
  let currentPrayerStage = prayerStages.AZAN;

  // Tempoh untuk setiap peringkat dalam minit
  const stageDurations = {
    AZAN: 0.5,      // 2 minit untuk azan
    IQAMAH: 1,    // 2 minit untuk iqamah
    SOLAT: 0.5      // 5 minit untuk solat fardhu
  };

  function NUM2(dd){return parseInt(dd)<10 ? "0"+dd : ""+dd;}
  function MinToTime(dd){dd = parseInt(dd); return (dd / 60) * 100 + (dd % 60);}
  function TimeToMin(dd){dd = parseInt(dd); return (dd / 100) * 60 + (dd % 100);}
  function TimeToVal(txt){const atxt = txt.split(":"); return parseInt(atxt[0])*100 + parseInt(atxt[1]);}
  function ValToTime(dd){const min = parseInt(dd); return parseInt(min/100) + ":" + NUM2(min % 100);}
  function TimeToTime(dd){let h = parseInt(dd / 100), m = parseInt(dd % 100); return (h == 0 ? 12 : (h > 12 ? h-12 : h)) + ":" + NUM2(m);}
  function pauseVid() {player.pause(); player.currentTime = 0; playing = false;}
  function startv(){playVid(); document.getElementById('start').style.display = 'none';}
  function playVid() {player.play(); player.muted = false; playing = true;}

  function HijriDate() {
    let DayH = 24, MonH = 9, YearH = 1420;
    let DaysH = DateTime.daysm;
    if(DateTime.maghrib <= DateTime.mins && DateTime.mins < 1440) DaysH++;

    let SetF = 31 - DayH, DatP = 1, BitP = 0;
    let SetS = sysData.hdata[DatP];
    while(DaysH > 0){
      if(SetS & 0x01) SetF++;
      if(DaysH > SetF){
        DayH = 0;
        DaysH -= SetF;
        MonH++;
        if(MonH === 13){MonH = 1; YearH++;}
        SetS = (SetS >> 1);
        SetF = 29;
        BitP++;
        if(BitP == 8){DatP++; BitP = 0; SetS = sysData.hdata[DatP];}
      } else {DayH += DaysH; DaysH = 0;}
    }
    DateTime.yearh = YearH;
    DateTime.monh = MonH;
    DateTime.dayh = DayH;
  }
  // Fungsi untuk mengkonversi tanggal Masehi ke Hijriyah
  function convertToHijri(masiDateStr) {
    // Parse tanggal Masehi (format: YYYY-MM-DD)
    const [year, month, day] = masiDateStr.split('-').map(Number);
    
    // Menggunakan fungsi GetYearDays yang sudah ada di app.js
    const [days, daysm] = GetYearDays(year, month, day);
    
    // Variabel sementara untuk menyimpan data yang diperlukan
    const tempData = {
      days: days,
      daysm: daysm,
      mins: 0, // Asumsikan waktu pagi
      maghrib: 0 // Akan diisi jika data tersedia
    };
    
    // Cek jika data waktu solat tersedia
    if (sysData.wdata && sysData.wdata[days] && sysData.wdata[days][5]) {
      tempData.maghrib = TimeToMin(sysData.wdata[days][5]);
    }
    
    // Algoritma konversi (sama dengan fungsi HijriDate)
    let DayH = 24, MonH = 9, YearH = 1420;
    let DaysH = tempData.daysm;
    
    // Algoritma dalam HijriDate yang mengubah hari jika setelah maghrib
    // Diabaikan karena kita asumsikan waktu pagi
    
    let SetF = 31 - DayH, DatP = 1, BitP = 0;
    let SetS = sysData.hdata[DatP];
    
    while(DaysH > 0) {
      if(SetS & 0x01) SetF++;
      if(DaysH > SetF) {
        DayH = 0;
        DaysH -= SetF;
        MonH++;
        if(MonH === 13) {
          MonH = 1; 
          YearH++;
        }
        SetS = (SetS >> 1);
        SetF = 29;
        BitP++;
        if(BitP == 8) {
          DatP++; 
          BitP = 0; 
          SetS = sysData.hdata[DatP];
        }
      } else {
        DayH += DaysH; 
        DaysH = 0;
      }
    }
    
    // Format hasil
    return {
      day: DayH,
      month: MonH,
      monthName: hname[MonH],
      year: YearH,
      formatted: `${DayH}-${hname[MonH]}`
    };
  }

  function GetYearDays(year,mon,day){
    let days = day;
    for(let i=1; i<mon; i++) days += mdays[i];
    let daysm = days, yy = (year % 100);
    if (yy > 0) daysm += (yy * 365) + parseInt((yy - 1) / 4) + 1;
    return [days,daysm];
  }

  function GetDateTime(){
    const d = new Date();
    const time = d.getHours() * 100 + d.getMinutes();
    if(DateTime.time == time) return false;
    
    DateTime.dow = d.getDay();
    DateTime.time = time;
    DateTime.year = d.getFullYear();
    DateTime.mon = d.getMonth()+1;
    DateTime.day = d.getDate();
    DateTime.hour = d.getHours();
    DateTime.min = d.getMinutes();
    DateTime.sec = d.getSeconds();
    DateTime.mins = d.getHours() * 60 + d.getMinutes();
    
    const arr_days = GetYearDays(DateTime.year, DateTime.mon, DateTime.day);
    DateTime.days = arr_days[0];
    DateTime.daysm = arr_days[1];
    return true;
  }

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
    
    return [
      Math.floor(diffMs / (1000 * 60 * 60 * 24)),
      Math.floor(diffMs / (1000 * 60 * 60)),
      Math.floor(diffMs / (1000 * 60))
    ];
  }

  function ShowWaktu() {
    document.getElementById("day1").innerHTML = NUM2(DateTime.day);
    document.getElementById("hari").innerHTML = wdays[DateTime.dow];
    document.getElementById("date1").innerHTML = mname[DateTime.mon]+" "+DateTime.year;
    
    let maghrib = 0, wnow = 0, mins = DateTime.mins;
    
    for(let i=1; i<=6; i++){
      const masa = sysData.wdata[DateTime.days][i];
      const min1 = TimeToMin(masa);
      const min2 = TimeToMin(sysData.wdata[DateTime.days][i < 6 ? i+1 : 1]);
      
      if(mins >= min1 && mins < min2) wnow = i;
      if(i == 5) maghrib = TimeToMin(masa);
      document.getElementById("masa"+i).innerHTML = TimeToTime(masa);
    }
    
    const wnxt = wnow + 1 > 6 ? 1 : wnow + 1;
    document.getElementById("nama0").innerHTML = wname[wnxt];
    document.getElementById("masa0").innerHTML = TimeToTime(sysData.wdata[DateTime.days][wnxt]);
    document.querySelectorAll('.waktu').forEach(el => el.classList.remove('next'));
    
    const masaWnxt = document.getElementById("masa" + wnxt);
    if(masaWnxt) {
      const nextWaktu = masaWnxt.closest('.waktu');
      if(nextWaktu) nextWaktu.classList.add('next');
    }
  
    // Ketika masuk waktu baru
    if(masukWaktu === false && sysData.wdata[DateTime.days][wnxt] === DateTime.time) {
      const masaWnxtEl = document.getElementById("masa" + wnxt);
      if(masaWnxtEl) {
        const nextWaktuEl = masaWnxtEl.closest('.waktu');
        if(nextWaktuEl) nextWaktuEl.classList.add('solattime');
      }
      
      masukWaktu = true;
      currentPrayerStage = prayerStages.AZAN;
      beepAudio.currentTime = 0;
      beepAudio.play()
      beepAudio.onended = () => {iPray.time = stageDurations.AZAN * 60}
      iPray.page = iPray.maxPage-1;
      PageShow();
    }
    
    if(sysData.wdata[DateTime.days][wnxt] !== DateTime.time && document.querySelector('.waktu.solattime')) {
      document.querySelectorAll(".waktu.solattime").forEach(el => el.classList.remove('solattime', 'blink'));
    }
  
    DateTime.maghrib = maghrib;
    HijriDate();
    document.getElementById("day2").innerHTML = NUM2(DateTime.dayh);
    document.getElementById("bulan").innerHTML = hname[DateTime.monh];
    document.getElementById("date2").innerHTML = `${DateTime.yearh}H`;
  }
  
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
        for(let k=1; k<8; k++) data.push(TimeToVal(dtext[k]));
        data.push(dtext[0])
        wdata.push(data);
      }
    }
    
    sysData.hdata = hdata;
    sysData.wdata = wdata;
  }
  
  function showCountdown(){
    const tbody = document.querySelectorAll('#rows_event tr');
    tbody.forEach((tr,i)=>{
      if(i >= appData.eventUpcoming.length) return;
      const [name, date, days] = appData.eventUpcoming[i];
      const hijr = convertToHijri(date).formatted;
      const dateFormat = new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const tds = tr.querySelectorAll('td');
        if (tds.length >= 4) {
          tds[0].querySelector('div').textContent = name;
          tds[0].querySelector('div').className = 'animated fadeInRight delay-1s';
          tds[1].querySelector('div').textContent = dateFormat;
          tds[1].querySelector('div').className = 'animated fadeInRight delay-1s tc';
          tds[2].querySelector('div').textContent = hijr;
          tds[2].querySelector('div').className = 'animated fadeInRight delay-1s';
          tds[3].querySelector('div').textContent = days;
          tds[3].querySelector('div').className = 'animated fadeInRight delay-1s tc';
        }
    })
  }
  
  function showVid(){
    const _slider = slides[iPray.slide];
    const objVid = `<div class="animated slideInLeft videoPlay" id="videoScreen"><video id="${_slider.id}" muted="true" class="wfull">
        <source src="${_slider.filename}" type="video/mp4">
        <source src="${_slider.filename}" type="video/ogg">
        Your browser does not support the audio element.
    </video></div>`;
    
    document.body.insertAdjacentHTML('beforeend', objVid);
    player = document.getElementById(_slider.id);
    popupEl = document.getElementById('videoScreen');
    player.addEventListener('ended', () => { playing = false; iPray.time=0 });
    playVid();
  }
  
  function showIfra(){
    const _slider = slides[iPray.slide];
    const objVid = `<div class="animated slideInLeft videoPlay iframeShow" id="ifraScreen"><iframe class="cover" src="${_slider.filename}" scrolling="no" align="top" frameborder="0">No Iframes</iframe></div>`;
    document.body.insertAdjacentHTML('beforeend', objVid);
    popupEl = document.getElementById('ifraScreen');
  }
  
  function showPrayerStageDisplay() {
    const prayerStagesContainer = document.getElementById('prayer-stages');
    if (prayerStagesContainer) {
      prayerStagesContainer.classList.remove('dnone');
      const timerEl = document.getElementById('prayer-timer');
      timerEl.classList.add('dnone');
      prayerStagesContainer.classList.remove('azan','iqamah','solat');
      
      switch(currentPrayerStage) {
        case prayerStages.AZAN:
          // prayerStagesContainer.classList.add('azan');
          break;
        case prayerStages.IQAMAH:
          prayerStagesContainer.classList.add('iqamah');
          timerEl.classList.remove('dnone');
          break;
        case prayerStages.SOLAT:
          prayerStagesContainer.classList.add('solat');
          // timerEl.classList.remove('dnone');
          break;
      }
    }

  }

  function manageStagePrayer(){
    return {
      stage: ()=>{
        // Peralihan peringkat berdasarkan peringkat semasa
        if(currentPrayerStage === prayerStages.AZAN) { 
          currentPrayerStage = prayerStages.IQAMAH;
          iPray.time = stageDurations.IQAMAH * 60;
          showPrayerStageDisplay();
          return;
        }
        
        if(currentPrayerStage === prayerStages.IQAMAH) { 
          currentPrayerStage = prayerStages.SOLAT;
          iPray.time = stageDurations.SOLAT * 60;
          showPrayerStageDisplay();
          return;
        }
        
        if(currentPrayerStage === prayerStages.SOLAT) { 
          currentPrayerStage = prayerStages.COMPLETED;
          iPray.time = 0;
          iPray.pendingPrayerTransition = true;
          return;
        }
      },
      complete: ()=>{
        iPray.pendingPrayerTransition = false; // Reset flag
        const prayerStagesEl = document.getElementById('prayer-stages');
        if (prayerStagesEl) prayerStagesEl.classList.add('dnone');
        masukWaktu = false;
      }
    }
  }

  function updatePrayerTimer(timerElement, currentTime, maxTime) {
    currentTime = parseInt(currentTime);
    maxTime = parseInt(maxTime);
    
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    const percentComplete = maxTime > 0 ? (1 - (currentTime / maxTime)) * 100 : 0;
    let gradientColor;
    
    timerElement.textContent = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    switch(currentPrayerStage) {
      case prayerStages.AZAN:
        gradientColor = 'rgba(0,150,0,0.5)';
        break;
      case prayerStages.IQAMAH:
        gradientColor = 'rgba(150,0,0,0.5)';
        break;
      case prayerStages.SOLAT:
        gradientColor = 'rgba(0,0,150,0.5)';
        break;
      default:
        gradientColor = 'rgba(0,255,0,0.3)';
    }
    // timerElement.style.backgroundImage = `linear-gradient(90deg, ${gradientColor} ${percentComplete}%, transparent ${percentComplete}%)`;
  }
  
  function showAnnouncement(){
    async function out (){
      document.querySelectorAll('.txtum').forEach(i => {
        i.classList.replace('fadeInRight', 'fadeOut');
        i.classList.replace('fadeIn','fadeOut');
        i.classList.remove('delay-1s');
      });
      iPray.pendingSlideTransition = true;
      iPray.time = 0;
    }
    
    function get(){
      document.querySelectorAll('.txtum').forEach(i => i.classList.remove('fadeInRight', 'fadeOut', 'delay-1s','fadeIn','delay-2s'));
      iPray.pendingSlideTransition = false;
      document.querySelectorAll('.txtum').forEach((i,n) => {
        i.textContent = appData.upcomingNotice[iPray.umum][n];
        if(n === 0) i.textContent = i.textContent.toUpperCase();
        if(n === document.querySelectorAll('.txtum').length-1) {
          i.classList.add('fadeIn','delay-1s');
          return;
        }
        if(iPray.umum === 0) i.classList.add('delay-1s');
        i.classList.add('fadeInRight');
      });
    }
    
    return {get, out};
  }
  
  function showKuliah(){
    async function out (){
      document.querySelectorAll('.txtkuliah').forEach(i => {
        i.classList.replace('fadeInRight', 'fadeOut');
        i.classList.remove('delay-1s');
      });
      iPray.pendingSlideTransition = true;
      iPray.time = 0;
    }
    function get(){
      document.querySelectorAll('.txtkuliah').forEach(i => i.classList.remove('fadeInRight', 'fadeOut','delay-1s'));
      iPray.pendingSlideTransition = false;
      document.querySelectorAll('.txtkuliah').forEach((i,n) => {
        i.innerHTML = appData.kuliahUpcoming[iPray.kuliah][n] || '&nbsp;';
        if(n === 0) i.innerHTML = i.innerHTML.toUpperCase();
        if(iPray.kuliah === 0) i.classList.add('delay-1s');
        i.classList.add('fadeInRight');
      });
    }
    
    return {get, out};
  }

  async function PageShow(){
    let page = iPray.page + 1;
    let attr = 0;

    if(page > iPray.maxPage) page = 0;
    if(document.querySelector('.page.disabled')) page++;

    iPray.page = page;
    iPray.time = iPray.timer[page];
    attr = iPray.attr[page];

    const currentPage = document.querySelector('.pages.show');
    if (currentPage) currentPage.classList.remove('show', 'fadeInLeft', 'fadeOutRight');
    const nextPage = document.querySelector('.page' + page);
    if (nextPage) nextPage.classList.add('fadeInLeft', 'show');

    document.querySelectorAll('.datebar-top').forEach(i => {i.classList.add('fadeInDown'); i.classList.remove('fadeOutUp');});
    document.querySelectorAll('.masablock, .timeblock').forEach(i => {i.classList.add('fadeInUp'); i.classList.remove('fadeOutDown');});
    
    ['datebar', 'masabar', 'timebar', 'msgbar'].forEach((id, idx) => {
      const el = document.getElementById(id);
      if(el) {
        if(id === 'msgbar') {(attr & 8 && iPray.stsmsg === 1) ? el.classList.remove('dnone') : el.classList.add('dnone');}
        else {(attr & (1 << idx)) ? el.classList.remove('dnone') : el.classList.add('dnone');}
      }
    });

    switch(iPray.page){
      case 0: // home
        break;
      case 1: // upcomming
        appData.upcomingNotice = await dataExtractor.getUpcomingNotice();
        if(appData.upcomingNotice.length === 0) {await PageShow(); return;}
        iPray.umum = 0;
        showAnnouncement().get();
        break;
      case 2: // kuliah
        appData.kuliahUpcoming = await dataExtractor.getKuliahUpcoming();
        if(appData.kuliahUpcoming.length === 0) {await PageShow(); return;}
        iPray.kuliah = 0;
        showKuliah().get();
        break;
      case 3: // slider
        iPray.slide = 0;
        playing = false;
        player = null;
        if(slides.length === 0) {await PageShow(); return;}
        imageSlider.reload();
        if(slides[0].isVid === 1) showVid();
        if(slides[0].isVid === 2) showIfra();
        break;
      case 4: // upcoming
        appData.eventUpcoming = await dataExtractor.getUpcomingEvents();
        if(appData.eventUpcoming.length === 0) {await PageShow(); return;}
        showCountdown();
        break;
      case 5: // world prayer
        break;
    }
    
    iPray.pendingPageTransition = true;
  }

  async function ShowTime(){
    dot = !dot;
    if(GetDateTime()) ShowWaktu();
    
    let jam = parseInt(DateTime.time/100);
    let min = parseInt(DateTime.time%100);
    if(jam == 0) jam = 12; else if(jam > 12) jam -= 12;
    
    const msgbarEl = document.getElementById('msgbar');
    if(msgbarEl && iPray.stsmsg === 0) msgbarEl.classList.add('dnone');

    if(masukWaktu && (currentPrayerStage === prayerStages.AZAN || currentPrayerStage === prayerStages.IQAMAH || currentPrayerStage === prayerStages.SOLAT)) {
      const timerEl = document.getElementById('prayer-timer');
      if(timerEl) {
        let maxTime = 0;
        switch(currentPrayerStage) {
          case prayerStages.AZAN: maxTime = stageDurations.AZAN * 60; break;
          case prayerStages.IQAMAH: maxTime = stageDurations.IQAMAH * 60; break;
          case prayerStages.SOLAT: maxTime = stageDurations.SOLAT * 60; break;
        }
        updatePrayerTimer(timerEl, iPray.time, maxTime);
      }
    }
    
    document.querySelectorAll("#jam1, #jam2").forEach(el => el.innerHTML = jam);
    document.querySelectorAll("#min1, #min2").forEach(el => el.innerHTML = NUM2(min));
    
    if(dot){
      document.querySelectorAll('.waktu.solattime.blink').forEach(el => el.classList.remove('blink'));
      document.querySelectorAll("#dot1, #dot2").forEach(el => el.classList.remove('blink'));
      const page1Show = document.querySelector('.page1');
      if (page1Show) page1Show.querySelector('.notice').classList.remove('blink');


      if(iPray.time > 0) iPray.time--;
      if(iPray.time === 0){

        if(masukWaktu) {
          if(currentPrayerStage !== prayerStages.COMPLETED) return manageStagePrayer().stage();
          if(iPray.pendingPrayerTransition) manageStagePrayer().complete();
        }
        
        if(iPray.page === 1 && iPray.umum < appData.upcomingNotice.length-1){ 
          if(iPray.pendingSlideTransition === false) return showAnnouncement().out();
          iPray.umum++; 
          iPray.time = iPray.timer[1];
          showAnnouncement().get();
          return;
        }
        
        if(iPray.page === 2 && iPray.kuliah < appData.kuliahUpcoming.length-1){
          if(iPray.pendingSlideTransition === false) return showKuliah().out();
          iPray.kuliah++; 
          iPray.time = iPray.timer[2];
          showKuliah().get();
          return;
        }
        
        if(iPray.page === 3 && iPray.slide < (slides.length-1)){
          iPray.time = iPray.timer[3];
          iPray.slide++;
          const _slider = slides[iPray.slide];
          if(_slider.isVid === 1 && _slider.filename.toString().indexOf('.mp4') !== -1) showVid();
          if(_slider.isVid === 2) showIfra();
          if(_slider.isVid === 0 && popupEl) {
            popupEl.remove();
            popupEl = null;
          }
          imageSlider.next();
          return;
        }
        
        if(iPray.pendingPageTransition && !masukWaktu) {
          iPray.pendingPageTransition = false; // Reset flag
          iPray.time = 0; // masa transistion
          const nextPage = document.querySelector('.page' + iPray.page);
          if (nextPage) {nextPage.classList.remove('fadeInLeft'); nextPage.classList.add('fadeOutRight');}
          document.querySelectorAll('.datebar-top').forEach(i => {i.classList.remove('fadeInDown'); i.classList.add('fadeOutUp');});
          document.querySelectorAll('.masablock, .timeblock').forEach(i => {i.classList.remove('fadeInUp'); i.classList.add('fadeOutDown');});
          return;
        }
        
        await PageShow();
      }
    } else {
      document.querySelectorAll("#dot1, #dot2").forEach(el => el.classList.add('blink'));
      document.querySelectorAll('.waktu.solattime').forEach(el => el.classList.add('blink'));
      const page1Show = document.querySelector('.page1.show');
      if (page1Show) page1Show.querySelector('.notice').classList.add('blink');
    }
  }
  
  async function ReadWaktu(filenameTakwim) {
    const response = await fetch(filenameTakwim);
    if(response.status !== 200) throw new Error("Server Error");
    const text = await response.text();
    ParseWaktu(text);
    ShowWaktu();
    await ShowTime();
  }

  async function readFile(filename){
    const con = await fetch(filename);
    return await con.text();
  }
  
  async function GetConfig(fileConfig){
    const loadFile = await readFile(fileConfig);
    const confData = loadFile.split("\n") || [];
    const aConf = confData.reduce((r, i) => (i !== '' && !i.startsWith('//') ? { ...r, [i.split('=')[0]]: i.split('=')[1] } : r), {});
    const dlyView = confData.filter(m => m.indexOf('TMR_VW') !== -1).map(m => parseInt(m.split('=')[1]));
    const attrView = confData.filter(m => m.indexOf('ATT_VW') !== -1).map(m => parseInt(m.split('=')[1]));

    iPray.timer = dlyView;
    iPray.attr = attrView;
    iPray.stsmsg = parseInt(aConf.MSGSTS);
    iPray.azanvid = './azan.mp4';
    beepAudio = new Audio('/audio/beep_loop_solat.wav');

    appData = await dataExtractor.formatForPresent();
    
    const {rawData} = await dataExtractor.getAppData();
    const {scrolls} = rawData;
    const msgbarEl = document.getElementById("msgbar");
    if(msgbarEl) msgbarEl.innerHTML = `<ul class="marquee">${scrolls.map(s => `<li>${s}</li>`).join('')}</ul>`;
  }

  async function init(){
    document.addEventListener('click', () => {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const beep = (delay = 0) => {
        const osc = audioCtx.createOscillator();
        osc.type = "square";
        osc.frequency.value = 800;
        osc.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.1);
      };
      
      beep(0);
    });

    iPray.maxPage = document.querySelectorAll('.pages').length - 1;
    iPray.page = iPray.maxPage;
    GetDateTime();
    await GetConfig('./config.txt');
    await ReadWaktu('./takwim.txt');
    const debug = false;
    if(!debug){
      setInterval(ShowTime, 500);
    } else {
      iPray.page = 0;
      PageShow();
    }
  }

  return {init}
})()

present.init()