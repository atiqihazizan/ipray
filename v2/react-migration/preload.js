const { contextBridge, ipcRenderer } = require('electron')
const fs = require('fs')
const path = require('path')
const { getDataDirectory, getBundledDataDirectory, getMediaDirectory, getSlidersDirectory, getVideosDirectory, getIframesDirectory, ensureDataFilesExist } = require('./util/dataDirs')

// Read file as ArrayBuffer for Blob URL usage in renderer
function readArrayBuffer(absPath) {
  try {
    if (!absPath) return null
    if (!fs.existsSync(absPath)) return null
    const buf = fs.readFileSync(absPath)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  } catch (_) {
    return null
  }
}

// Read image from media directory and return as data URL (Base64)
function getImageBase64(filename) {
  try {
    if (!filename) return null
    const lower = filename.toLowerCase()
    const isImage = /(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp|\.svg)$/.test(lower)
    if (!isImage) return null

    const rel = filename.replace(/^\.+\//, '').replace(/^public\//, '').replace(/^sliders\//, '')
    const absPath = path.isAbsolute(filename) ? filename : path.join(getMediaDirectory(), rel)
    if (!fs.existsSync(absPath)) return null

    const ext = path.extname(absPath).toLowerCase()
    const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : ext === '.bmp' ? 'image/bmp' : ext === '.svg' ? 'image/svg+xml' : 'application/octet-stream'
    const base64 = fs.readFileSync(absPath).toString('base64')
    return `data:${mime};base64,${base64}`
  } catch (error) {
    return null
  }
}

// File reading function
function readFile(filename) {
  try {
    let filePath
    
    // Check if filename already has full path or is relative
    if (path.isAbsolute(filename) || filename.startsWith('data/')) {
      // If it's already a full path or starts with 'data/', use as is
      filePath = filename.startsWith('data/') ? path.join(getDataDirectory(), filename.replace('data/', '')) : filename
    } else {
      // Use getDataDirectory() untuk path yang betul (external)
      filePath = path.join(getDataDirectory(), filename)
    }

    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8')
    }
    return null
  } catch (error) {
    console.error('Error reading file:', error)
    return null
  }
}

// Get data by type function (delegated to util)
const { createGetData } = require('./util/getData')
const getData = createGetData({ readFile, getImageBase64, getMediaDirectory, getSlidersDirectory, getVideosDirectory, getIframesDirectory, fileExists })

// Check if file exists
function fileExists(filename) {
  try {
    let filePath
    
    // Check if filename already has full path or is relative
    if (path.isAbsolute(filename) || filename.startsWith('data/')) {
      // If it's already a full path or starts with 'data/', use as is
      filePath = filename.startsWith('data/') ? path.join(__dirname, filename) : filename
    } else {
      // If it's just a filename, determine path based on mode
      const isDev = process.env.NODE_ENV === 'development'
      // Special handling for sliders/media
      const isMedia = filename.startsWith('public/sliders/') || filename.startsWith('./public/sliders/') || filename.startsWith('sliders/')
      if (isMedia) {
        const relative = filename.replace(/^\.\//, '').replace(/^public\//, '') // map public/sliders -> sliders
        filePath = path.join(getMediaDirectory(), relative.replace(/^sliders\//, ''))
      } else {
        if (isDev) {
          filePath = path.join(__dirname, 'data', filename)
        } else {
          filePath = path.join(process.resourcesPath, 'data', filename)
        }
      }
    }
    
    return fs.existsSync(filePath)
  } catch (error) {
    console.error('Error checking file:', error)
    return false
  }
}


// Get absolute path untuk resource files
function getResourcePath(filename) {
  try {
    // Check if filename already has full path
    if (path.isAbsolute(filename)) {
      return filename
    }
    
    // Determine path based on mode
    const isDev = process.env.NODE_ENV === 'development'
    // Special handling for sliders/media
    if (filename.startsWith('public/sliders/') || filename.startsWith('sliders/')) {
      const relative = filename.replace(/^public\//, '').replace(/^sliders\//, '')
      return path.join(getMediaDirectory(), relative)
    }
    return isDev ? path.join(__dirname,'sliders', filename) : path.join(process.resourcesPath, 'sliders', filename)
  } catch (error) {
    console.error('Error getting resource path:', error)
    return filename
  }
}

// File writing function
function writeFile(filename, content) {
  try {
    let filePath
    
    // Check if filename already has full path or is relative
    if (path.isAbsolute(filename) || filename.startsWith('data/')) {
      // If it's already a full path or starts with 'data/', use as is
      filePath = filename.startsWith('data/') ? path.join(__dirname, filename) : filename
    } else {
      // If it's just a filename, determine path based on mode
      const isDev = process.env.NODE_ENV === 'development'
      if (isDev) {
        filePath = path.join(__dirname, 'data', filename)
      } else {
        filePath = path.join(process.resourcesPath, 'data', filename)
      }
    }
    
    fs.writeFileSync(filePath, content, 'utf8')
    return true
  } catch (error) {
    console.error('Error writing file:', error)
    return false
  }
}

// Expose APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  readFile: readFile,
  writeFile: writeFile,
  getData: getData,
  fileExists: fileExists,
  getResourcePath: getResourcePath,
  getDataDirectory: getDataDirectory,
  getBundledDataDirectory: getBundledDataDirectory,
  getMediaDirectory: getMediaDirectory,
  getSlidersDirectory: getSlidersDirectory,
  getVideosDirectory: getVideosDirectory,
  getIframesDirectory: getIframesDirectory,
  getImageBase64: getImageBase64,
  readArrayBuffer: readArrayBuffer,
  ensureDataFilesExist: ensureDataFilesExist,
})

// Listen for file change events
ipcRenderer.on('file-changed', () => {
  // Dispatch custom event for React to listen
  window.dispatchEvent(new CustomEvent('file-changed'))
})
