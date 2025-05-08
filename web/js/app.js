'use strict'
const present = (function(){
  const animated = [
    '',
    'backInDown',
    'backInLeft',
    'backInRight',
    'backInUp',
    'bounceIn',
    'bounceInDown',
    'bounceInLeft',
    'bounceInRight',
    'bounceInUp',
    'fadeIn',
    'fadeInDown',
    'fadeInDownBig',
    'fadeInLeft',
    'fadeInLeftBig',
    'fadeInRight',
    'fadeInRightBig',
    'fadeInUp',
    'fadeInUpBig',
    'fadeInTopLeft',
    'fadeInTopRight',
    'fadeInBottomLeft',
    'lightSpeedInRight',
    'lightSpeedInLeft',
    'rotateIn',
    'rotateInDownLeft',
    'rotateInDownRight',
    'rotateInUpLeft',
    'rotateInUpRight',
    'zoomIn',
    'zoomInDown',
    'zoomInLeft',
    'zoomInRight',
    'zoomInUp',
  ];
  
  const machineId = crypto.randomUUID()

  const random = () => Math.floor(Math.random() * animated.length)
  const sysData = {agency:{},program:[]};
  const iPray = {page:0,kuliah:0,slide:0,time:0,countdown:0,umum:0,attr:[11,11,12,4,5],timer:[5,5,5,3,5],stsmsg:1};
  const DateTime = {year:0,mon:0,day:0,dow:0,yearh:0,monh:0,dayh:0,hour:0,min:0,sec:0,mins:0,time:-1,days:0,daysm:0,maghrib:0,wnow:0};
  const mdays = [0,31,28,31,30,31,30,31,31,30,31,30,31];
  const wdays = ["AHAD","ISNIN","SELASA","RABU","KHAMIS","JUMAAT","SABTU"];
  const mname = ["MASIHI","JAN","FEB","MAC","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const hname = ["HIJRAH","MUHARRAM","SAFAR","RAB.AWAL","RAB.AKHIR","JAM.AWAL","JAM.AKHIR","REJAB","SYA`BAN","RAMADHAN","SYAWAL","ZULKAEDAH","ZULHIJJAH"];
  const wname = ["MASA","SUBUH","SYURUK","ZOHOR","ASAR","MAGHRIB","ISYAK"];
  const cname = ["K.LUMPUR","MEKAH","MADINAH","AL-AQSA"];
  const dirPath = './';

  var slides = [];
  var countdownData = [];
  var countdownFilter = [];
  var umumData = [];
  var umumActive = [];

  var codezone = '';
  var firstFlag = true;
  var masukWaktu = false;
  var player;
  var playing = false;
  var elPopUp;
  var animeRan=0;
  var dot = false;
  var maxPage = 0;
  var beepSound = null;
  var audioReady = false;
  var audioCtx;
  var countBeep = -1;

  function NUM2(dd){if(parseInt(dd)<10) return "0"+dd;return ""+dd;}
  function MinToTime(dd){dd = parseInt(dd);return (dd / 60) * 100 + (dd % 60);}
  function TimeToMin(dd){dd = parseInt(dd);return (dd / 100) * 60 + (dd % 100);}
  function TimeToVal(txt){var atxt = txt.split(":"), min = parseInt(atxt[0])*100 + parseInt(atxt[1]);return min;}
  function ValToTime(dd){dd = parseInt(dd);return ""+parseInt(min /100) + ":" + NUM2(min % 100);}
  function TimeToTime(dd){var h = parseInt(dd / 100),m = parseInt(dd % 100);if(h == 0) {h = 12;} else if(h > 12) {h -= 12;}return ""+ h + ":" + NUM2(m);}
  function pauseVid() {player.pause();player.currentTime = 0;playing = false;}
  function startv(){playVid();$('#start').hide();}
  function playVid() {player.play(); player.muted = false; playing = true;}

  function HijriDate() {
    var DayH = 24;      //01 Sabtu
    var MonH = 9;       //Jan
    var YearH = 1420;   //2000
    var DaysH = DateTime.daysm;
    if(DateTime.maghrib <= DateTime.mins && DateTime.mins < 1440) DaysH++;

    // DayH = sysData.hdata[0];    // start day (24)
    // var SetF = 29 - DayH;       // first month days
    var SetF = 31 - DayH;
    var DatP = 1, BitP = 0;
    var SetS = sysData.hdata[DatP];
    while(DaysH > 0){
      if(SetS & 0x01){SetF++;}
      if(DaysH>SetF){
        DayH = 0;
        DaysH = DaysH - SetF;
        MonH = MonH + 1;
        if(MonH === 13){MonH = 1;YearH = YearH + 1;}
        SetS = (SetS >> 1);
        SetF = 29;
        BitP++;
        if(BitP == 8){DatP++;BitP = 0;SetS = sysData.hdata[DatP];}
      }else{DayH = DayH + DaysH;DaysH = 0;}
    }
    DateTime.yearh = YearH;
    DateTime.monh = MonH;
    DateTime.dayh = DayH;
    // console.log(YearH,MonH,DayH);
  }
  function GetYearDays(year,mon,day){var days = day;for(var i=1;i<mon;i++) days += mdays[i];var daysm = days, yy = (year % 100);if (yy > 0) {daysm += (yy * 365) + parseInt((yy - 1) / 4) + 1;}return [days,daysm];}
  function GetDateTime(){
    let currentDate = new Date();
    let dow = currentDate.getDay();
    let day = currentDate.getDate();
    let mon = currentDate.getMonth()+1;
    let year = currentDate.getFullYear();
    let hour = currentDate.getHours();
    let min = currentDate.getMinutes();
    let sec = currentDate.getSeconds();

    let time = hour * 100 + min;
    if(DateTime.time == time) return false;
    DateTime.dow = dow; DateTime.time = time;
    DateTime.year = year; DateTime.mon = mon; DateTime.day = day;
    DateTime.hour = hour; DateTime.min = min; DateTime.sec = sec;
    DateTime.mins = hour * 60 + min;
    var arr_days = GetYearDays(year,mon,day);
    DateTime.days = arr_days[0];
    DateTime.daysm = arr_days[1];
    return true;
  }
  function GetDiff2(dts){
    let dt = moment(dts.split("|")[0]).format("YYYY-MM-DD HH:mm");
    let [asDay,asHour,asMin] = GetDiff(dt);
    if(asDay < 0) return (asDay * -1) + ' Hari Lagi';
    if(asHour < 0) return (asHour * -1) + ' Jam Lagi';
    if(asMin < 0) return (asMin * -1) + ' Minit Lagi';
    if(asMin === 0) return 'Sedang berlangsung';
    return false;
  }
  function GetDiff(dt){
    let now = moment(new Date()).utcOffset(8) //todays date
    let end = moment(dt).utcOffset(8) // another date
    let asDay = now.diff(end,'days');// Math.round(diff.asDays());
    let asHour = now.diff(end,'hours');// Math.round(diff.asHours());
    let asMin = now.diff(end,'minutes');// Math.round(diff.asMinutes());
    return [asDay,asHour,asMin]
  }

  function ShowWaktu(){
    $("#day1").html(NUM2(DateTime.day));
    $("#hari").html(wdays[DateTime.dow])
    $("#date1").html(mname[DateTime.mon]+" "+DateTime.year);
    var maghrib = 0, min1=0, min2=0, wnow = 0, mins = DateTime.mins;
    for(var i=1; i<=6; i++){
      var masa = sysData.wdata[DateTime.days][i];
      if(i < 6){
        min1 = TimeToMin(masa);
        min2 = TimeToMin(sysData.wdata[DateTime.days][i+1]);
        if(mins >= min1 && mins < min2) wnow = i;
      }else{
        min1 = TimeToMin(masa);
        min2 = TimeToMin(sysData.wdata[DateTime.days][1]);
        if(mins >= min1 && mins < min2) wnow = i;
      }
      if(i == 5) maghrib = TimeToMin(masa);
      $("#masa"+i).html(TimeToTime(masa));
    }
    var wnxt = wnow + 1;
    if(wnxt > 6) wnxt = 1;
    $("#nama0").html(wname[wnxt]);
    $("#masa0").html(TimeToTime(sysData.wdata[DateTime.days][wnxt]));

    $(".waktu").removeClass('next')
    $("#masa" + wnxt).closest('.waktu').addClass('next')

    // console.log(wnxt,wname[wnxt],DateTime.days,sysData.wdata[DateTime.days],DateTime)
    if(sysData.wdata[DateTime.days][wnxt] === DateTime.time && document.querySelector('.waktu.solattime') === null) {
      $("#masa" + wnxt).closest('.waktu').addClass('solattime')
      masukWaktu = true;
      countBeep = 0;
    }
    if(sysData.wdata[DateTime.days][wnxt] !== DateTime.time && document.querySelector('.waktu.solattime') !== null) {
      $(".waktu.solattime").removeClass('solattime').removeClass('blink')
      masukWaktu = false;
      countBeep = -1;
    }

    DateTime.maghrib = maghrib;
    HijriDate();
    $("#day2").html(NUM2(DateTime.dayh));
    $("#bulan").html(hname[DateTime.monh])
    $("#date2").html(`${DateTime.yearh}H`);
  }
  function ParseWaktu(text){
    var atext = text.split("\r\n");
    var btext = atext[1].split("=");
    var ctext = btext[1];
    var hdata = [24];
    for(var i=0,j=ctext.length;i<j;i+=2){
      var dd = parseInt(ctext.substr(i,2),16);
      hdata.push(dd);
    }
    var wdata = [0];
    for(var i=2,j=atext.length;i<j;i++){
      var dtext = atext[i].split("\t");
      if(dtext.length == 8){
        var data = [];
        for(var k=1;k<8;k++){data.push(TimeToVal(dtext[k]));}
        data.push(dtext[0])
        wdata.push(data);
      }
    }
    sysData.hdata=hdata;
    sysData.wdata=wdata;
  }
  function showCountdown(){
    let tbody = document.querySelectorAll('#rowcountdown tr')
    function init(){
      let rw = -1;
      let rows =  countdownData.filter(r=>{
        let aRow = r.split("|")
        let btxt = aRow[0].split('-');
        let dt = [btxt[2],btxt[1],btxt[0]].join('-')
        let [asDays] = GetDiff(dt)
        return (!isNaN(asDays) && asDays < 0)
      }).reduce((rws,i,n,a)=>{
        let aRow = i.split("|")
        let btxt = aRow[0].split('-');
        let dt = [btxt[2],btxt[1],btxt[0]].join('-')
        let [asDays] = GetDiff(dt)
        aRow.splice(0,1)
        aRow.push(asDays*-1)
        if((n % 6)===0){rw++;rws[rw] = []}
        rws[rw].push(aRow)
        return rws;
      },[])

      countdownFilter = rows;

      get();
    }
    function get(){
      // reset
      for(let i=0;i<6;i++){tbody[i].innerHTML = `<td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>`}
      // then load data
      countdownFilter[iPray.countdown].forEach((r,pos)=>{
        let tr = '<tr>';
        let cdays = 0
        tr += `<td><div class="txtcntdwn animated fadeInRight delay-1s">${r[2]}</div></td>`
        tr += `<td><div class="txtcntdwn animated fadeInRight delay-1s">${r[0]}</div></td>`
        tr += `<td><div class="txtcntdwn animated fadeInRight delay-1s">${r[1]}</div></td>`
        tr += `<td><div class="txtcntdwn animated fadeInRight delay-1s tc">${r[3]}</div></td>`
        tr += '</tr>'
        tbody[pos].innerHTML = tr
      })
    }
    return {
      init: init,
      get:get,
    }
  }
  function showVid(){
    const _slider = slides[iPray.slide];
    let objVid = `<div class="animated slideInLeft videoPlay" id="elPopUp"><video id="${_slider.id}" muted="true" class="wfull">
        <source src="${_slider.filename}" type="video/mp4">
        <source src="${_slider.filename}" type="video/ogg">
        Your browser does not support the audio element.
    </video></div>`;
    $('body').append(objVid)
    player = document.getElementById(_slider.id);
    elPopUp = document.getElementById('elPopUp');
    // player.load()
    player.addEventListener('ended', (event) => { playing = false; iPray.time=0 });
    playVid();
  }
  function showIfra(){
    const _slider = slides[iPray.slide];
    let objVid = `<div class="animated slideInLeft videoPlay iframeShow" id="elPopUp"><iframe class="cover" src="${_slider.filename}" scrolling="no" align="top" frameborder="0">No Iframes</iframe></div>`;
    $('body').append(objVid)
    elPopUp = document.getElementById('elPopUp');
  }
  function showAzan(){
    try {
      playDoubleBeep();
      countBeep++;
    } catch (error) {
      console.log('Error playing beep:', error);
    }

    // Tampilkan pesan
    $('#datebar').removeClass('dnone')
    $('#masabar').removeClass('dnone')
    $('#timebar').addClass('dnone');
    $('#msgbar').addClass('dnone');

    return false;
  }

  function showAnnouncement(){
    function get(){
      // Hapus animasi lama sebelum menambah animasi baru
      document.querySelectorAll('.txtum').forEach((i) => {
        i.classList.remove('fadeInRight');
        i.classList.remove('fadeOutLeft');
      });
      // Tambah animasi fadeInRight untuk data baru
      document.querySelectorAll('.txtum').forEach((i,n)=>{
        i.textContent = umumActive[iPray.umum][n];
        if(iPray.umum === 0){
          i.classList.add(`delay-1s`,'fadeInRight');
        } else {
          i.classList.add('fadeInRight');
        }
      });
      // Setelah beberapa saat, ganti menjadi fadeOutLeft
      if(iPray.umum < (umumActive.length-1)){
        setTimeout(() => {
          document.querySelectorAll('.txtum').forEach((i,n) => {
            i.classList.remove(`delay-1s`,'fadeInRight');
            i.classList.add('fadeOutLeft');
          });
        }, 5000); // Ganti setelah 5 detik
      }
    }
    function init(){
      umumActive = umumData.filter(r=> (r.length > 0 && GetDiff2(r) !== false)).map(r => [...r.split("|").filter((f,n)=>n>0),GetDiff2(r)]);
      get();
    }
    return {init:init,get:get}
  }

  async function PageShow(){
    var rand = random()
    var page = iPray.page + 1;
    var attr = 0;
    if(page > maxPage) page = 0;
    if($('.page').hasClass('disabled')) page ++;
    if(animeRan === rand) animeRan = random()
    iPray.page = page;
    iPray.time = iPray.timer[page];
    attr = iPray.attr[page];

    if(page == 0) rand = 0
    $('.pages.show').removeClass(animated[animeRan]).removeClass('show')
    // $('.page'+page).addClass(animated[rand]).addClass('show')
    $('.page'+page).addClass('fadeInLeft').addClass('show')
    animeRan = rand;

    (attr & 1) ? $('#datebar').removeClass('dnone') : $('#datebar').addClass('dnone');
    (attr & 2) ? $('#masabar').removeClass('dnone') : $('#masabar').addClass('dnone');
    (attr & 4) ? $('#timebar').removeClass('dnone') : $('#timebar').addClass('dnone');
    (attr & 8 && iPray.stsmsg === 1) ? $('#msgbar').removeClass('dnone') : $('#msgbar').addClass('dnone');

    $('body').removeClass()

    switch(iPray.page){
    case 0: // home
      $('body').css('backgroundImage', 'url(images/mta.JPG)');
      break;
    case 1: // announcement
      if(umumData.length === 0) {await PageShow(); return;}
      iPray.umum = 0;
      $('body').css('backgroundImage', 'url(images/picture2.jpg)');
      showAnnouncement().init()
      break;
    case 2: // slider
      iPray.slide = 0;
      playing = false;
      player = null;
      if(slides.length === 0) {await PageShow(); return;}
      imageSlider.reload();
      if(slides[0].isVid === 1) showVid()
      if(slides[0].isVid === 2) showIfra()
      break;
    case 3: // countdown
      if(countdownFilter.length === 0) {await PageShow(); return;}
      $('body').css('backgroundImage', 'url(images/picture2.jpg)');
      showCountdown().init()
      break;
    case 4: // world prayer
      // WorldPrayer();
      break;
    }
  }
  async function ShowTime(){
    dot = !dot;
    if(GetDateTime()){ShowWaktu()}
    var jam = parseInt(DateTime.time/100);
    var min = parseInt(DateTime.time%100);
    if(jam == 0) jam = 12; else if(jam > 12) jam -= 12;
    if(iPray.stsmsg === 0) $('#msgbar').addClass('dnone')
    $("#jam1,#jam2").html(jam);
    $("#min1,#min2").html(NUM2(min));
    if(dot){
      $('.waktu.solattime.blink').removeClass('blink')
      $("#dot1,#dot2").removeClass('blink');

      if(iPray.time > 0) iPray.time--;
      if(iPray.time === 0){
        //
        if(document.querySelector('#msgbar.need-play') !== null ){$('#msgbar').removeClass('need-play'); document.getElementById('msgbar').start();}
        if(masukWaktu) {
          if(countBeep > -1 && countBeep < 5) showAzan();
          return;
        }
        // if($(elPopUp).length && countBeep !== -1 ) return;
        // if($(elPopUp).length && playing === false) $(elPopUp).remove();
        if($(elPopUp).length && iPray.page !== 2) $(elPopUp).remove()
        //
        if(iPray.page === 1 && iPray.umum < (umumActive.length-1)){ 
          iPray.umum++; 
          iPray.time=iPray.timer[1];
          showAnnouncement().get();
          return;
        }
        if(iPray.page === 2 && playing){return;}
        if(iPray.page === 2 && iPray.slide < (slides.length-1)){
          iPray.time = iPray.timer[2];
          iPray.slide++;
          const _slider = slides[iPray.slide];
          if(_slider.isVid === 1 && _slider.filename.toString().indexOf('.mp4') !== -1) showVid()
          if(_slider.isVid === 2) showIfra()
          if(_slider.isVid === 0 && $(elPopUp).length) $(elPopUp).remove()
          imageSlider.next();
          return;
        }
        if(iPray.page === 3 && iPray.countdown < (countdownFilter.length -1)){iPray.countdown++;iPray.time = iPray.timer[3];showCountdown().get();return;}

        await PageShow();
      }
    } else {
      $("#dot1,#dot2").addClass('blink');
      $('.waktu.solattime').addClass('blink')
    }
  }
  async function ReadWaktu() {
    let response = await fetch("./takwim.txt");
    if(response.status !== 200) { throw new Error("Server Error");  }
    let text = await response.text();
    ParseWaktu(text);
    ShowWaktu();
    await ShowTime();
    //PageShow();
  }

  async function readFile(filename){let con = await fetch(filename);let txt = await con.text();return txt;}
  async function GetData(filePath) {
    try {
      const loadFile = await readFile(filePath);
      function parseBlocks(text) {
        const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        const blocks = [];
        const lines = normalizedText.split('\n');
        
        let currentBlock = null;
        let currentContent = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].replace(/\r/g, '').trim();
          if (line.startsWith('//')) {
            if (currentBlock !== null) {blocks.push({name: currentBlock,content: currentContent});}
            currentBlock = line.substring(2).trim();
            currentContent = [];
          }
          else if (line === '' && currentBlock !== null) {continue;}
          else if (line !== '' && currentBlock !== null) {currentContent.push(line);}
        }
        
        if (currentBlock !== null) {blocks.push({name: currentBlock,content: currentContent});}
        
        return blocks;
      }
      
      const blocks = parseBlocks(loadFile);
      function findBlock(name) {return blocks.find(block => block.name.toUpperCase().includes(name.toUpperCase()));}
      
      const slides = [];
      
      const zoneBlock = findBlock('ZONE');
      const zone = zoneBlock && zoneBlock.content.length > 0 ? zoneBlock.content[0].trim() : '';
      
      const noticeBlock = findBlock('PEMBERITAHUAN');
      const news = noticeBlock && noticeBlock.content.length > 0 
        ? noticeBlock.content
          .filter(m => m && m.toString().trim().length > 0)
          .map(m => `<li class="textmsg">${m.trim()}</li>`)
          .join('')
        : '';
      
      const announceBlock = findBlock('PENGUMUMAN');
      const announce = announceBlock ? announceBlock.content : [];
      
      const slideBlock = findBlock('SLIDESHOW');
      const slider = slideBlock && slideBlock.content.length > 0 
        ? slideBlock.content
          .filter(s => s && s.trim() !== '' && !s.includes('0:img,1:vid,2:iframe')) // Buang baris yang hanya berisi nota
          .map((s, n) => {
            const aCol = s.toString().trim().split("|");
            let filePath = aCol[0] ? aCol[0].trim() : '';
            slides.push({id: 'slidvid' + n, isVid: 0, filename: filePath});
            
            if (aCol.length > 1) {
              const slideType = parseInt(aCol[1] ? aCol[1].trim() : '0');
              switch (slideType) {
                case 1: 
                  slides[n].isVid = 1;
                  if (aCol.length > 2) filePath = aCol[2] ? aCol[2].trim() : '';
                  break; // video
                case 2: 
                  slides[n].isVid = 2;
                  if (aCol.length > 2) filePath = aCol[2] ? aCol[2].trim() : '';
                  break; // iframe
              }
            }
            
            return `<img src="${filePath}" alt="" />`;
          }).join('')
        : '';
      
      const countdownBlock = findBlock('COUNTDOWN');
      const even = countdownBlock ? countdownBlock.content.map(item => item.trim()) : [];
      
      const programBlock = findBlock('PROGRAM');
      const program = programBlock ? programBlock.content.map(item => item.trim()) : [];
      
      const result = {'zone': zone,'news': news,'announce': announce,'slider': slider,'slides': slides,'even': even,'program': program};
      
      return result;
      
    } catch (error) {
      console.error("Error processing file:", error);
      console.error("Error details:", error.stack);
      
      return {'zone': '','news': '',announce: [],slider: '',slides: [],even: [],program: []};
    }
  }

  async function GetConfig(){
    const loadFile = await readFile(dirPath + 'config.txt')
    const rawData = loadFile.split("\n")??[]
    const aConf = rawData.reduce(function(result,item,index,array){let atext = item.split('=');if(item !== '' && item.indexOf('//',0)) {result[atext[0]] = atext[1]}return result},{})
    const dlyView = rawData.filter((m,n)=>m.indexOf('TMR_VW') !== -1).map(m=>parseInt(m.split('=')[1]))
    const attrView = rawData.filter((m,n)=>m.indexOf('ATT_VW') !== -1).map(m=>parseInt(m.split('=')[1]))

    iPray.timer = dlyView;
    iPray.attr = attrView;
    iPray.stsmsg = parseInt(aConf.MSGSTS);
    iPray.azanvid = './azan.mp4';

    slides = [];
    umumData = [];
    countdownData = [];
    let imgs = ''
    let info = ''

    let res = await GetData(dirPath + 'data.txt')
    countdownData.push(...res.even)
    umumData.push(...res.announce)
    if(res.slider.length > 0)imgs += res.slider
    info += res.news
    $('#slider').html(imgs)
    $("#msgbar").html(`<ul class="marquee">${info}</ul>`)
  }

  function playBeep() {
    beepSound = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");  
    beepSound.muted = false;
    beepSound.play();
  }

  function playDoubleBeep1() {
    playBeep();
    
    // Tunggu 700 milidetik, lalu mainkan beep lagi
    setTimeout(function() {
      playBeep();
      countBeep++;
    }, 700);
  }

  function playDoubleBeep() {
    if (!audioCtx) return;
  
    function beep(delay = 0) {
      const osc = audioCtx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 800;
      osc.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + 0.1);
    }
  
    beep(0);
    beep(0.3); // beep kedua setelah 300ms
  }
  async function init(){
    
    // document.addEventListener('click', async function() {
      if (!audioReady) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioReady = true;
        console.log("Audio context initialized.");
        playDoubleBeep(); // contoh beep pertama setelah izin
      }
      maxPage = $('.pages').length -1;
      iPray.page = maxPage;
      GetDateTime();
      await GetConfig();
      await ReadWaktu();
      setInterval(ShowTime,500);
      // iPray.page = 0;
      // await PageShow()
    // }, { once: true });

  }

  return {init: init}
})()
present.init()