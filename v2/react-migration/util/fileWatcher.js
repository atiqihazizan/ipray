const chokidar = require('chokidar')
const path = require('path')
const { getDataDirectory } = require('./dataDirs')

const dataFiles = [
  'system-config.txt',
  'prayer-times.txt',
  'religious-events.txt',
  'weekly-lectures.txt',
  'masjid-programs.txt',
  'scroll-messages.txt',
  'media-slides.txt'
]

const filesToWatch = dataFiles.map(file => path.join(getDataDirectory(), file))

let reloadTimeout = null
let fileWatcher = null

function watchFiles(mainWindow) {
  if (fileWatcher) { try { fileWatcher.close() } catch (_) {} fileWatcher = null }
  const triggerReload = () => { if (reloadTimeout) clearTimeout(reloadTimeout); reloadTimeout = setTimeout(() => { if (mainWindow) { mainWindow.reload(); mainWindow.webContents.send('file-changed') } reloadTimeout = null }, 1000) }
  fileWatcher = chokidar.watch(filesToWatch, { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 } })
  fileWatcher.on('change', () => triggerReload()); fileWatcher.on('add', () => triggerReload()); fileWatcher.on('unlink', () => triggerReload()); fileWatcher.on('error', (error) => console.error('Watcher error:', error))
  return fileWatcher
}

module.exports = { watchFiles, dataFiles }


