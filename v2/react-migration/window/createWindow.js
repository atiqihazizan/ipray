const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  const preloadPath = path.join(__dirname, '..', 'preload.js')

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: preloadPath,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  })

  mainWindow.setMenuBarVisibility(false)
  Menu.setApplicationMenu(null)

  // Set CSP policy untuk Electron security
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https:; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
        ]
      }
    })
  })

  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
  } else {
    const indexPath = path.join(__dirname, '..', 'ipray', 'index.html')
    mainWindow.loadFile(indexPath)
  }

  // Context menu (right-click)
  const ctxMenuTemplate = [
    ...(isDev ? [{ label: 'Toggle DevTools', accelerator: 'Alt+CommandOrControl+I', click: () => mainWindow.webContents.toggleDevTools() }] : []),
    // { label: 'Toggle DevTools', accelerator: 'Alt+CommandOrControl+I', click: () => mainWindow.webContents.toggleDevTools() },
    { label: 'Reload', accelerator: 'CommandOrControl+R', click: () => mainWindow.reload() },
    { type: 'separator' },
    { label: 'Quit', accelerator: 'CommandOrControl+Q', click: () => app.quit() }
  ]
  const ctxMenu = Menu.buildFromTemplate(ctxMenuTemplate)
  mainWindow.webContents.on('context-menu', () => ctxMenu.popup({ window: mainWindow }))

  return mainWindow
}

module.exports = { createWindow }


