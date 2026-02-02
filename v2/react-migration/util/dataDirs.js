const path = require('path')
const fs = require('fs')

function getDataDirectory() {
  const isDev = process.env.NODE_ENV === 'development'
  const dataPath = isDev ? path.join(__dirname, '..', 'data') : path.join(process.resourcesPath, '..', 'data')
  
  return dataPath
}

function getBundledDataDirectory() {
  const isDev = process.env.NODE_ENV === 'development'
  return isDev ? path.join(__dirname, '..', 'data') : path.join(process.resourcesPath, 'data')
}

function getMediaDirectory() {
  const isDev = process.env.NODE_ENV === 'development'
  const isStart = process.env.npm_lifecycle_event === 'start'
  const isBuild = process.env.NODE_ENV === 'production' && !isStart
  
  let mediaPath
  if (isDev) {
    // Development mode: public/sliders
    mediaPath = path.join(__dirname, '..', 'public', 'sliders')
  } else if (isStart) {
    // Start mode: public/sliders
    mediaPath = path.join(__dirname, '..', 'public', 'sliders')
  } else {
    // Build mode: sliders di luar asar (extraResources)
    mediaPath = path.join(process.resourcesPath, 'app.asar', 'ipray',  'sliders')
  }
  
  return mediaPath
}

function getSlidersDirectory() {
  const isDev = process.env.NODE_ENV === 'development'
  const slidersPath = isDev ? path.join(__dirname, '..', 'sliders') : path.join(process.resourcesPath, '..', 'sliders')
  return slidersPath
}

function getVideosDirectory() {
  const isDev = process.env.NODE_ENV === 'development'
  const videosPath = isDev ? path.join(__dirname, '..', 'videos') : path.join(process.resourcesPath, '..', 'videos')
  return videosPath
}

function getIframesDirectory() {
  const isDev = process.env.NODE_ENV === 'development'
  const iframesPath = isDev ? path.join(__dirname, '..', 'iframes') : path.join(process.resourcesPath, '..', 'iframes')
  return iframesPath
}

function ensureDataFilesExist() {
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) return true
  try {
    const externalDataDir = getDataDirectory()
    const bundledDataDir = getBundledDataDirectory()
    if (!fs.existsSync(externalDataDir)) fs.mkdirSync(externalDataDir, { recursive: true })
    const requiredFiles = [
      'system-config.txt',
      'prayer-times.txt',
      'religious-events.txt',
      'weekly-lectures.txt',
      'masjid-programs.txt',
      'scroll-messages.txt',
      'media-slides.txt'
    ]
    let filesCopied = 0
    for (const filename of requiredFiles) {
      const externalFilePath = path.join(externalDataDir, filename)
      const bundledFilePath = path.join(bundledDataDir, filename)
      if (!fs.existsSync(externalFilePath) && fs.existsSync(bundledFilePath)) { fs.copyFileSync(bundledFilePath, externalFilePath); filesCopied++ }
    }
    if (filesCopied > 0) console.log(`Initialized ${filesCopied} data files in external directory`)
    return true
  } catch (error) {
    console.error('Error ensuring data files exist:', error)
    return false
  }
}

module.exports = { getDataDirectory, getBundledDataDirectory, getMediaDirectory, getSlidersDirectory, getVideosDirectory, getIframesDirectory, ensureDataFilesExist }


