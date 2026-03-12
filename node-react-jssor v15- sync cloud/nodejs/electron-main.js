const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');

const PUBLIC_PORT = 3000;
const SETTING_PORT = 3001;

let mainWindow = null;

/**
 * Determine if running packaged (asar) or dev (electron .)
 * Packaged: app.isPackaged === true, process.resourcesPath points to resources/
 * Dev: app.isPackaged === false
 */
function getExternalDir() {
  if (app.isPackaged) {
    return path.dirname(process.execPath);
  }
  return process.cwd();
}

function waitForServer(port, maxRetries = 30) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const check = () => {
      const req = http.get(`http://localhost:${port}`, (res) => {
        resolve();
      });
      req.on('error', () => {
        retries++;
        if (retries >= maxRetries) {
          reject(new Error(`Server on port ${port} not ready after ${maxRetries} retries`));
        } else {
          setTimeout(check, 500);
        }
      });
      req.setTimeout(2000, () => {
        req.destroy();
        retries++;
        if (retries >= maxRetries) {
          reject(new Error(`Server on port ${port} timeout after ${maxRetries} retries`));
        } else {
          setTimeout(check, 500);
        }
      });
    };
    check();
  });
}

let contextMenu = null;

function buildContextMenu() {
  contextMenu = Menu.buildFromTemplate([
    // {
    //   label: 'Fullscreen',
    //   accelerator: 'F11',
    //   click: () => {
    //     if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
    //   }
    // },
    // { type: 'separator' },
    // {
    //   label: 'Open Setting (Browser)',
    //   click: () => {
    //     const { shell } = require('electron');
    //     shell.openExternal(`http://localhost:${SETTING_PORT}`);
    //   }
    // },
    // {
    //   label: 'Open Public (Browser)',
    //   click: () => {
    //     const { shell } = require('electron');
    //     shell.openExternal(`http://localhost:${PUBLIC_PORT}`);
    //   }
    // },
    // { type: 'separator' },
    // {
    //   label: 'Reload',
    //   accelerator: 'CmdOrCtrl+R',
    //   click: () => {
    //     if (mainWindow) mainWindow.reload();
    //   }
    // },
    // {
    //   label: 'DevTools',
    //   accelerator: 'F12',
    //   click: () => {
    //     if (mainWindow) mainWindow.webContents.toggleDevTools();
    //   }
    // },
    // { type: 'separator' },
    {
      label: 'Exit',
      accelerator: 'CmdOrCtrl+Q',
      click: () => {
        app.quit();
      }
    }
  ]);

  Menu.setApplicationMenu(null);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    kiosk: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(`http://localhost:${PUBLIC_PORT}`);

  // Hide cursor via CSS inject selepas page load
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS('* { cursor: none !important; }');
  });

  // Right-click context menu
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
    if (contextMenu) contextMenu.popup({ window: mainWindow });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  const externalDir = getExternalDir();
  process.env.ELECTRON_MODE = 'true';
  process.env.ELECTRON_EXE_DIR = externalDir;

  buildContextMenu();
  require('./main');

  try {
    console.log('Waiting for servers to start...');
    await waitForServer(PUBLIC_PORT);
    console.log(`Public server ready on port ${PUBLIC_PORT}`);
    createWindow();
    console.log(`Setting panel accessible at http://localhost:${SETTING_PORT}`);
  } catch (error) {
    console.error('Failed to start servers:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
