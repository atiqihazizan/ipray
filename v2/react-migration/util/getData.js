// const { app } = require('electron'); 
// const rootPath = app.getAppPath();

const path = require('path'); 
const isDev = process.env.NODE_ENV === 'development';
const rootPath = isDev ? path.join(__dirname, '..') : path.join(process.resourcesPath, '..');

const createGetData = ({ readFile, getImageBase64, getMediaDirectory, getSlidersDirectory, getVideosDirectory, getIframesDirectory, fileExists }) => {
  function processSlideData(data) {
    const defaultSlides = `img|image-slider-1.jpeg|Kaabah|5
img|image-slider-2.webp|Masjid Aqsa|5
img|image-slider-3.jpg|Masjid Nabawi|5
img|image-slider-4.jpg|Masjid Haram|5
img|image-slider-5.jpg|Masjid Qiblatain|5`
    const exampleData = 'img|first-slider.JPG|Masjid Tuan Abdullah|0.5'
    const isArrayInput = Array.isArray(data)
    const hasValidData = isArrayInput ? data.length > 0 : (data && data.trim() !== '' && data.split('\n').some(line => { const t = line.trim(); return t !== '' && !t.startsWith('//') }))
    const existingData = hasValidData ? data : defaultSlides
    
    // Hanya tambah exampleData jika tiada existingData atau existingData adalah defaultSlides
    const shouldAddExample = !hasValidData || (!isArrayInput && data === defaultSlides)
    const preData = shouldAddExample ? (isArrayInput ? [exampleData, ...existingData] : `${exampleData}\n${existingData}`) : existingData

    const lines = Array.isArray(preData) ? preData : preData.split('\n')
    const validLines = lines.filter(line => { const t = (line || '').toString().trim(); return t !== '' && !t.startsWith('//') })
    const slideData = validLines.length > 0 ? validLines : defaultSlides.split('\n')
    return slideData
      .filter(line => { const trimmed = line.trim(); return trimmed !== '' && !trimmed.startsWith('//') })
      .map(line => {
        const parts = line.split('|')
        if (parts.length < 3) return null
        const [type, fileName, description, duration] = parts
        const slideDuration = duration ? parseFloat(duration) : 5
        let imgSrc = fileName
        let imgSrcBlob = null
        const isUrl = /^https?:\/\//i.test(fileName)
        
        // Check jika ini defaultSlides atau exampleData (gunakan public/sliders)
        const isDefaultOrExample = line.includes('image-slider-') || line.includes('first-slider.JPG')
        let absPath = null
        
        // Handle berdasarkan TYPE (bukan extension)
        if (type === 'img') {
          // Image type: handle local files sahaja (URL akan guna imgSrc)
          if (!isUrl && getMediaDirectory) {
            const rel = fileName.replace(/^\/+/, '').replace(/^public\//, '').replace(/^sliders\//, '')
            
            if (isDefaultOrExample) {
              absPath = `${getMediaDirectory()}/${rel}`
            } else {
              absPath = getSlidersDirectory ? `${getSlidersDirectory()}/${rel}` : `${path.join(__dirname, '..', 'sliders')}/${rel}`
            }
            const ext = (fileName.split('.').pop() || '').toLowerCase()
            const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : ext === 'bmp' ? 'image/bmp' : ext === 'svg' ? 'image/svg+xml' : 'application/octet-stream'
            imgSrcBlob = { absPath, mime }
          }
        } else if (type === 'vid') {
          // Video type: handle local files sahaja (URL akan guna imgSrc)
          if (!isUrl && getVideosDirectory) {
            const rel = fileName.replace(/^\/+/, '').replace(/^public\//, '').replace(/^videos\//, '')
            const ext = (fileName.split('.').pop() || '').toLowerCase()
            const mime = ext === 'mp4' ? 'video/mp4' : ext === 'webm' ? 'video/webm' : ext === 'ogg' ? 'video/ogg' : ext === 'avi' ? 'video/x-msvideo' : ext === 'mov' ? 'video/quicktime' : ext === 'mkv' ? 'video/x-matroska' : 'application/octet-stream'
            absPath = `${getVideosDirectory()}/${rel}`
            imgSrcBlob = { absPath, mime }
          }
        } else if (type === 'iframe') {
          // Iframe type: handle local HTML files sahaja (URL akan guna imgSrc directly)
          if (!isUrl && getIframesDirectory) {
            const rel = fileName.replace(/^\/+/, '').replace(/^public\//, '').replace(/^iframes\//, '')
            absPath = `${getIframesDirectory()}/${rel}`
            imgSrcBlob = { absPath, mime: 'text/html' }
          }
        }
        return { type, fileName, imgSrc, imgSrcBlob, description, duration: slideDuration, isVid: type === 'vid' ? 1 : type === 'iframe' ? 2 : 0, id: `slidvid${fileName.replace(/\.[^/.]+$/, "")}`, path: absPath }
      })
      .filter(item => item !== null)
      .filter(slide => {
        const isUrl = /^https?:\/\//i.test(slide.fileName)
        
        // URL selalu valid (tidak perlu check file existence)
        if (isUrl) return true
        
        // Check file existence berdasarkan TYPE
        if (fileExists) {
          const hasPath = slide.fileName.includes('/')
          const rel = (hasPath ? slide.fileName.replace(/^\/+/, '').replace(/^public\//, '').replace(/^sliders\//, '').replace(/^videos\//, '').replace(/^iframes\//, '') : slide.fileName)
          
          // Check berdasarkan type field
          if (slide.type === 'vid' && getVideosDirectory) {
            const absPath = `${getVideosDirectory()}/${rel}`
            return fileExists(absPath)
          }
          
          if (slide.type === 'iframe' && getIframesDirectory) {
            const absPath = `${getIframesDirectory()}/${rel}`
            return fileExists(absPath)
          }
          
          if (slide.type === 'img' && getMediaDirectory) {
            const isDefaultOrExample = slide.fileName.includes('image-slider-') || slide.fileName.includes('first-slider.JPG')
            let absPath
            
            if (isDefaultOrExample) {
              absPath = `${getMediaDirectory()}/${rel}`
            } else {
              absPath = getSlidersDirectory ? `${getSlidersDirectory()}/${rel}` : `${path.join(__dirname, '..', 'sliders')}/${rel}`
            }
            return fileExists(absPath)
          }
        }
        
        return true
      })
  }

  return function getData(dataType) {
    const dataFileMap = {
      'religious': 'religious-events.txt',
      'kuliah': 'weekly-lectures.txt',
      'program': 'masjid-programs.txt',
      'slide': 'media-slides.txt',
      'scroll': 'scroll-messages.txt',
    }

    if (dataType === 'slide') {
      try {
        const raw = readFile(dataFileMap['slide']) || ''
        const processed = processSlideData(raw)
        return processed
      } catch (error) {
        console.error('[getData] error:', error)
        return []
      }
    }

    const filename = dataFileMap[dataType]
    if (filename) return readFile(filename)
    return null
  }
}

module.exports = { createGetData }


