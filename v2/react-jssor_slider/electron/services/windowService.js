const { BrowserWindow, Menu, app } = require('electron');

/**
 * Window Service
 * Menguruskan window creation dan context menu
 */

class WindowService {
  constructor() {
    this.mainWindow = null;
    this.publicPort = null;
    this.accessToken = null;
    this.devMode = false;
  }

  /**
   * Initialize service dengan configuration
   */
  init(config) {
    this.publicPort = config.publicPort;
    this.accessToken = config.accessToken;
    this.devMode = config.devMode;
  }

  /**
   * Create context menu
   */
  createContextMenu(onExit) {
    const template = [];
    
    // Add DevTools menu ONLY in development mode
    if (this.devMode) {
      template.push({
        label: 'Toggle DevTools (Main)',
        click: () => {
          if (this.mainWindow) {
            if (this.mainWindow.webContents.isDevToolsOpened()) {
              this.mainWindow.webContents.closeDevTools();
            } else {
              this.mainWindow.webContents.openDevTools();
            }
          }
        }
      });
      template.push({
        type: 'separator'
      });
    }
    
    // Exit menu (always available)
    template.push({
      label: 'Exit',
      click: onExit
    });
    
    return Menu.buildFromTemplate(template);
  }

  /**
   * Create main window
   */
  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1920,
      height: 1080,
      frame: false, // Buang frame
      // kiosk: true, // Fullscreen/kiosk mode
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        devTools: this.devMode, // Enable DevTools hanya di development
      },
      autoHideMenuBar: true,
      show: false,
    });

    // Setup context menu (right-click menu)
    const contextMenu = this.createContextMenu(() => {
      app.quit();
    });
    
    // Show context menu ONLY in development mode
    this.mainWindow.webContents.on('context-menu', (e, params) => {
      if (this.devMode) {
        contextMenu.popup();
      }
      // Production: No context menu (no right-click)
    });

    // Token header tidak diperlukan - server hanya localhost
    // this.mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    //   { urls: [`http://localhost:${this.publicPort}/*`] },
    //   (details, callback) => {
    //     details.requestHeaders['X-Access-Token'] = this.accessToken;
    //     callback({ requestHeaders: details.requestHeaders });
    //   }
    // );

    // Load dari localhost server
    this.mainWindow.loadURL(`http://localhost:${this.publicPort}`);

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      // Auto-open DevTools jika dev mode enabled
      // if (this.devMode) {
      //   this.mainWindow.webContents.openDevTools();
      // }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  /**
   * Get main window
   */
  getMainWindow() {
    return this.mainWindow;
  }

  /**
   * Close main window
   */
  closeWindow() {
    if (this.mainWindow) {
      this.mainWindow.close();
      this.mainWindow = null;
    }
  }
}

// Export singleton instance
const windowService = new WindowService();
module.exports = windowService;
