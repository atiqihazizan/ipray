const { app, BrowserWindow, Menu, globalShortcut, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { createWindow } = require('./window/createWindow')
const { getDataDirectory, getBundledDataDirectory, ensureDataFilesExist, getSlidersDirectory } = require('./util/dataDirs')
const { watchFiles } = require('./util/fileWatcher')
const { createApiServer } = require('./api/server')

if (!app.requestSingleInstanceLock()) app.quit()

let mainWindow; let apiServer

// removed: functions moved to util/window/api modules

function ensureMediaFoldersExist() {
  try {
    const slidersDir = getSlidersDirectory()
    const baseDir = path.dirname(slidersDir)
    const videoDir = path.join(baseDir, 'videos')
    const iframeDir = path.join(baseDir, 'iframes')
    ;[slidersDir, videoDir, iframeDir].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }) })
  } catch (e) {
    console.error('Error ensuring media folders exist:', e)
  }
}

// IPC handlers
ipcMain.on('reload-app', (event) => { if (mainWindow) mainWindow.reload() });
app.whenReady().then(() => { 
  const isDev = process.env.NODE_ENV === 'development'
  
  // Ensure data files exist in external location (production only)
  if (!isDev) {
    ensureDataFilesExist()
  }

  // Ensure media folders exist (sliders, video, iframe)
  ensureMediaFoldersExist()
  
  mainWindow = createWindow()
  const { server } = createApiServer()
  apiServer = server
  globalShortcut.register('CommandOrControl+Q', () => app.quit())
  
  if (isDev) { 
    globalShortcut.register('CommandOrControl+R', () => BrowserWindow.getFocusedWindow() && BrowserWindow.getFocusedWindow().reload())
    globalShortcut.register('Alt+CommandOrControl+I', () => BrowserWindow.getFocusedWindow() && BrowserWindow.getFocusedWindow().webContents.toggleDevTools())
  } 
  watchFiles(mainWindow)
})
app.on('window-all-closed', () => app.quit()); app.on('second-instance', () => {}); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
app.on('will-quit', () => { globalShortcut.unregisterAll(); if (apiServer) { apiServer.close(); apiServer = null } })
