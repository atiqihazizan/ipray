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
  var azanPlay = false;
  var player;
  var playing = false;
  var elPopUp;
  var animeRan=0;
  var dot = false;
  var maxPage = 0;

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
    let now = moment(new Date()).zone('Asia/Kuala_Lumpur') //todays date
    let end = moment(dt).zone('Asia/Kuala_Lumpur') // another date
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
    if(sysData.wdata[DateTime.days][wnxt] === DateTime.time && document.querySelector('.waktu.solattime') === null) $("#masa" + wnxt).closest('.waktu').addClass('solattime')
    if(sysData.wdata[DateTime.days][wnxt] !== DateTime.time && document.querySelector('.waktu.solattime') !== null) $(".waktu.solattime").removeClass('solattime').removeClass('blink')

    DateTime.maghrib = maghrib;
    HijriDate();
    $("#day2").html(NUM2(DateTime.dayh));
    $("#bulan").html(hname[DateTime.monh])
    $("#date2").html(`${DateTime.yearh}H`);
  }
  function ParseWaktu(text){
    var atext = text.split("\r\n");
    // console.log(atext.length);
    var btext = atext[1].split("=");
    var ctext = btext[1];
    var hdata = [24];
    // console.log(ctext.length);
    for(var i=0,j=ctext.length;i<j;i+=2){
      var dd = parseInt(ctext.substr(i,2),16);
      // console.log(dd,ctext.substr(i,2),i,j)
      hdata.push(dd);
    }
    var wdata = [0];
    for(var i=2,j=atext.length;i<j;i++){
      var dtext = atext[i].split("\t");
      // console.log(dtext)
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
    const id = 'azanpopup'
    let objVid = `<div class="animated slideInLeft videoPlay bg-black" id="elPopUp"><video id="${id}" muted="true" class="wfull">
        <source src="${iPray.azanvid}" type="video/mp4">
        <source src="${iPray.azanvid}" type="video/ogg">
        Your browser does not support the audio element.
    </video></div>`;
    $('body').append(objVid)
    player = document.getElementById(id);
    elPopUp = document.getElementById('elPopUp');
    // player.load()
    azanPlay = true;
    player.addEventListener('ended', (event) => { playing = false; azanPlay = false;  $('#msgbar').addClass('need-play'); });
    playVid();

    $('#datebar').removeClass('dnone')
    $('#masabar').removeClass('dnone')
    $('#timebar').addClass('dnone');
    $('#msgbar').addClass('dnone');

    return false;
  }
  function showAnnouncement(){
    function get(){
      document.querySelectorAll('.txtum').forEach((i,n)=>{i.textContent = umumActive[iPray.umum][n];i.classList.add('fadeInRight')})
    }
    function init(){
      umumActive = umumData.filter(r=> (r.length > 0 && GetDiff2(r) !== false)).map(r => [...r.split("|").filter((f,n)=>n>0),GetDiff2(r)]);
      get();
    }
    return {
      init:init,
      get:get,
    }
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
    $('.page'+page).addClass(animated[rand]).addClass('show')
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
        if(document.querySelector('.waktu.solattime') !== null && azanPlay === false ) return showAzan();
        if($(elPopUp).length && azanPlay === true) return;
        if($(elPopUp).length && playing === false) $(elPopUp).remove();
        if($(elPopUp).length && iPray.page !== 2) $(elPopUp).remove()
        //
        if(iPray.page === 1 && iPray.umum < (umumActive.length-1)){ iPray.umum++; iPray.time=iPray.timer[1];showAnnouncement().get();return;}
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
  async function GetData(filePath){
    const loadFile = await readFile(filePath)
    const aBlock = loadFile.split("\n\n")
    const aGroup = aBlock.map(b => b.split("\n").slice(1))
    const news = function (){return aGroup[1].filter((m,n)=>m.toString().length>0).map((m,n) => `<li class="textmsg">${m}</li>`).join('')}()
    const slider = function(){
      const aRow = aGroup[3].map(m=> {const item = m.split('=');let txt = item[0];if(item.length > 2) txt = item.join('');return txt;})
      return aRow.map((s,n) => {
        const aCol = s.toString().split("|");
        let filePath = aCol[0];
        slides.push({id:'slidvid'+n,isVid:0,filename:filePath});
        switch (parseInt(aCol[1])){
          case 1:slides[n].isVid = 1;filePath = aCol[2];break; // video
          case 2:slides[n].isVid = 2;filePath = aCol[2];break; // iframe
        }
        return `<img src="${filePath}" alt="" />`
      }).join('')
    }()

    return {'zone':aGroup[0][0], 'news':news??'', 'announce':aGroup[2]??[], 'slider':slider, 'even':aGroup[4]||[], 'program':aGroup[5]??[]}
  }
  async function GetData(filePath) {
    try {
      const loadFile = await readFile(filePath);
      const aBlock = loadFile.split("\n\n");
      const aGroup = aBlock.map(b => b.split("\n").slice(1));
      
      // Define slides array
      const slides = [];
      
      // Process news
      const news = aGroup[1]
        .filter(m => m.toString().length > 0)
        .map(m => `<li class="textmsg">${m}</li>`)
        .join('');
      
      // Process slider/slideshow
      const slider = (() => {
        if (!aGroup[3] || aGroup[3].length === 0) return '';
        
        const aRow = aGroup[3].map(m => {
          const item = m.split('=');
          let txt = item[0];
          if (item.length > 2) txt = item.join('');
          return txt;
        });
        
        return aRow.map((s, n) => {
          const aCol = s.toString().split("|");
          let filePath = aCol[0];
          slides.push({id: 'slidvid' + n, isVid: 0, filename: filePath});
          
          switch (parseInt(aCol[1] || '0')) {
            case 1: 
              slides[n].isVid = 1;
              filePath = aCol[2] || '';
              break; // video
            case 2: 
              slides[n].isVid = 2;
              filePath = aCol[2] || '';
              break; // iframe
          }
          
          return `<img src="${filePath}" alt="" />`;
        }).join('');
      })();
  
      return {
        'zone': aGroup[0] && aGroup[0][0] ? aGroup[0][0] : '',
        'news': news || '',
        'announce': aGroup[2] || [],
        'slider': slider,
        'slides': slides, // Return the slides array
        'even': aGroup[4] || [],
        'program': aGroup[5] || []
      };
    } catch (error) {
      console.error("Error processing file:", error);
      return {
        'zone': '',
        'news': '',
        'announce': [],
        'slider': '',
        'slides': [],
        'even': [],
        'program': []
      };
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
    console.log(res); return;
    countdownData.push(...res.even)
    umumData.push(...res.announce)
    if(res.slider.length > 0)imgs += res.slider
    info += res.news
    $('#slider').html(imgs)
    $("#msgbar").html(`<ul class="marquee">${info}</ul>`)
  }

  async function init(){
    maxPage = $('.pages').length -1;
    iPray.page = maxPage;
    GetDateTime();
    await GetConfig();
    await ReadWaktu();
    setInterval(ShowTime,500);
    // iPray.page = 0;
    // await PageShow()
  }
  return {init: init}
})()
present.init()