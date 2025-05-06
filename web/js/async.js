const conServer = (function(){
  const socket = io('http://mahsites.com:3120');
  const rootPath = require('electron-root-path').rootPath;
  const filepath = rootPath + '/iprayw/resources/';
  const fs = require('fs')

  function send(data){socket.emit("update",data)}
  async function fileServer(filename){
    return {
      get:async()=>{const promise = await new Promise((resolve, reject) => {fs.readFile(filepath + filename, (err, data) => {if (err) reject(err); else resolve(data.toString());});});return promise;},
      set:async(data,callback) => fs.writeFile( filepath + filename, data, (err) => {if (err) { console.log(err); return; } if(callback)callback(data)})
    }
  }

  async function init(){
    socket.on('connect',() => {console.log("connected as " + socket.id)})
    socket.on('latest-data', async result => {
      let obj = null;
      let mechid = result.mechid
      let resdata = result.data
      switch (result.rt) {
      case 1:
        obj = await fileServer('announcement.ini')
        if(mechid != machineId) obj.set(resdata,(data)=> {send({rt:100,serverid:mechid,mechid:machineId,data:'Update info successfull'})})
        $('#msgtext').text(resdata)
        break;
      case 2:
        obj = await fileServer('countdown.ini')
        if(mechid == machineId) obj.set(resdata,(data)=>{send({rt:100,serverid:mechid,mechid:machineId,data:'Update countdown successfull'})})
        cntdown = (resdata.split("\n")??[]).map((i,n)=>{ return i.split('|')});
        break;
      }
    })
  }
  return {
    init: init
  }
})()

conServer.init()