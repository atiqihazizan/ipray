const machineId = crypto.randomUUID()
const socket = io('http://mahsites.com:3120');
const rootPath = require('electron-root-path').rootPath;
const filepath = rootPath + '/iprayw/resources/';
const fs = require('fs')
const setting = (function(){
  var msgtext,countdown,btnsavemsg,btnsavecountdown;
  var txtslides,txtvideos,tblconfig,btnsaveconf;
  var userid = '';

  async function configure(){
    const file = await fileServer('conf.ini')
    let atext = [],otext = {},aIndex = []

    atext = (await file.get()).split("\n")
    otext = atext.reduce(function(result,item,index,array){
      let arr = item.split('=');
      if(arr.length > 1) {result[arr[0]] = arr[1]; aIndex.push(index)}
      else result;
      return result
    },{})

    // txtslides.value = otext.APP_SLIDES
    // txtvideos.value = otext.APP_VIDEO

    let tr = '';
    tr += `<tr class="text-center"><td class="text-left">Timming Slide</td>`
    tr += `<td>${otext.TMR_SLIDE0}</td>`
    tr += `<td>${otext.TMR_SLIDE1}</td>`
    tr += `<td>${otext.TMR_SLIDE2}</td>`
    tr += `<td>${otext.TMR_SLIDE3}</td>`
    tr += `<td>${otext.TMR_SLIDE4}</td></tr>`
    tr += `<tr class="text-center"><td class="text-left">Attribute Slide</td>`
    tr += `<td>${otext.ATTR_SLIDE0}</td>`
    tr += `<td>${otext.ATTR_SLIDE1}</td>`
    tr += `<td>${otext.ATTR_SLIDE2}</td>`
    tr += `<td>${otext.ATTR_SLIDE3}</td>`
    tr += `<td>${otext.ATTR_SLIDE4}</td></tr>`
    tblconfig.innerHTML = tr

    btnsaveconf.addEventListener('click', e => {
      e.preventDefault()
      let data = atext.slice(0)
      let slide = txtslides.value
      if(slide.length < data[aIndex[0]].length)
        data[aIndex[0]] = txtslides.value
      console.log(data)
    })
  }
  async function countDown(){
    const file = await fileServer('countdown.ini')
    countdown.textContent = await file.get()
    btnsavecountdown.addEventListener('click',function(e){
      e.preventDefault();
      file.set(countdown.value,data =>{})
      send({rt:2,mechid: machineId,data:countdown.value})
    })
  }
  async function messageInfo(){
    const file = await fileServer('announcement.ini')
    msgtext.value = await file.get()
    btnsavemsg.addEventListener('click',function(e){
      e.preventDefault();
      file.set(msgtext.value,data=>{});
      send({rt:1,mechid: machineId,data:msgtext.value})
    })
  }
  async function fileServer(filename){
    return {
      get:async ()=>{const promise = await new Promise((resolve, reject) => {fs.readFile(filepath + filename, (err, data) => {if (err) reject(err); else resolve(data.toString());});});return promise;},
      set:(data,callback) => fs.writeFile( filepath + filename, data, (err) => {if (err) { console.log(err); return; } if(callback)callback(data)})
    }
  }
  function send(data){socket.emit("update",data)}
  async function init(){
    countdown = document.getElementById('countdown')
    msgtext = document.getElementById('msgtext')
    txtslides = document.getElementById('txtslides')
    txtvideos = document.getElementById('txtvideos')
    tblconfig = document.getElementById('tblconfig')

    btnsaveconf = document.getElementById('btnsaveconf')
    btnsavecountdown = document.getElementById('btnsavecountdown')
    btnsavemsg = document.getElementById('btnsavemsg')

    console.log(machineId)
    // console.log(rootPath)
    socket.on('connect',() => {console.log("connected as " + socket.id); userid=socket.id})

    // const location = path.join(rootPath, 'package.json');
    // const pkgInfo = fs.readFileSync(location, { encoding: 'utf8' });
    // try { fs.writeFileSync(rootPath + '/iprayw/resources/announcement.ini', 'the text to write in the file', 'utf-8'); alert('successfull')}
    // catch(e) { alert('Failed to save the file !'); }

    socket.on('latest-data', async result => {
      if(result.rt != 100) return null;
      console.log(result)
    })

    await configure()
    await countDown()
    await messageInfo()
  }
  return {init: init}
})()

setting.init()