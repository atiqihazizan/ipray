const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { getDataDirectory, getMediaDirectory } = require('../util/dataDirs')
const { dataFiles } = require('../util/fileWatcher')

function createApiServer() {
  const app = express()

  app.use(cors()); app.use(bodyParser.json()); app.use(bodyParser.text())

  // Serve media from external root-level 'sliders' directory (same level as data)
  app.use('/sliders', express.static(getMediaDirectory()))
  // Keep images/css/fonts/audio if still needed from public
  app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images')))
  app.use('/css', express.static(path.join(__dirname, '..', 'public', 'css')))
  app.use('/fonts', express.static(path.join(__dirname, '..', 'public', 'fonts')))
  app.use('/audio', express.static(path.join(__dirname, '..', 'public', 'audio')))

  const API_TOKEN = process.env.IPRAY_API_TOKEN || 'ipray-secret-token-2024'
  const authenticate = (req, res, next) => { const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token; if (token === API_TOKEN) next(); else res.status(401).json({ error: 'Unauthorized' }) }

  const storage = multer.diskStorage({ destination: (req, file, cb) => { const uploadDir = getMediaDirectory(); if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }); cb(null, uploadDir) }, filename: (req, file, cb) => { const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname); cb(null, uniqueName) } })
  const upload = multer({ storage, fileFilter: (req, file, cb) => { const allowedTypes = /jpeg|jpg|png|gif|webp/; const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase()); const mimetype = allowedTypes.test(file.mimetype); if (mimetype && extname) cb(null, true); else cb(new Error('Only image files are allowed')) }, limits: { fileSize: 5 * 1024 * 1024 } })

  app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' }))

  app.post('/api/upload-image', authenticate, upload.single('image'), (req, res) => { try { if (!req.file) return res.status(400).json({ error: 'No image file provided' }); res.json({ success: true, filename: req.file.filename, originalName: req.file.originalname, size: req.file.size }) } catch (error) { res.status(500).json({ error: error.message }) } })

  app.get('/api/images', authenticate, (req, res) => { try { const slidersDir = getMediaDirectory(); if (!fs.existsSync(slidersDir)) return res.json([]); const files = fs.readdirSync(slidersDir).filter(file => /(jpg|jpeg|png|gif|webp)$/i.test(file)).map(file => ({ filename: file, path: `/sliders/${file}`, size: fs.statSync(path.join(slidersDir, file)).size, created: fs.statSync(path.join(slidersDir, file)).birthtime })); res.json(files) } catch (error) { res.status(500).json({ error: error.message }) } })

  app.delete('/api/images/:filename', authenticate, (req, res) => { try { const filename = req.params.filename; const filePath = path.join(getMediaDirectory(), filename); if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Image not found' }); fs.unlinkSync(filePath); res.json({ success: true, message: 'Image deleted successfully' }) } catch (error) { res.status(500).json({ error: error.message }) } })

  app.get('/api/data', authenticate, (req, res) => { try { const response = {}; const dataDir = getDataDirectory(); for (const file of dataFiles) { const filePath = path.join(dataDir, file); if (fs.existsSync(filePath)) response[file] = fs.readFileSync(filePath, 'utf8') } res.json(response) } catch (error) { res.status(500).json({ error: error.message }) } })

  app.get('/api/data/:filename', authenticate, (req, res) => { try { const filename = req.params.filename; const filePath = path.join(getDataDirectory(), filename); if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' }); const content = fs.readFileSync(filePath, 'utf8'); res.json({ filename, content }) } catch (error) { res.status(500).json({ error: error.message }) } })

  app.put('/api/data/:filename', authenticate, (req, res) => { try { const filename = req.params.filename; const content = req.body.content || req.body; if (!content) return res.status(400).json({ error: 'Content is required' }); const filePath = path.join(getDataDirectory(), filename); if (!dataFiles.includes(filename)) return res.status(400).json({ error: 'Invalid filename' }); fs.writeFileSync(filePath, content, 'utf8'); res.json({ success: true, message: 'File updated successfully', filename, timestamp: new Date().toISOString() }) } catch (error) { res.status(500).json({ error: error.message }) } })

  app.put('/api/data', authenticate, (req, res) => { try { const updates = req.body; const results = []; const dataDir = getDataDirectory(); for (const [filename, content] of Object.entries(updates)) { const filePath = path.join(dataDir, filename); if (!dataFiles.includes(filename)) { results.push({ filename, error: 'Invalid filename' }); continue } try { fs.writeFileSync(filePath, content, 'utf8'); results.push({ filename, success: true }) } catch (error) { results.push({ filename, error: error.message }) } } res.json({ success: true, message: 'Batch update completed', results, timestamp: new Date().toISOString() }) } catch (error) { res.status(500).json({ error: error.message }) } })

  const PORT = process.env.IPRAY_API_PORT || 1847
  const server = app.listen(PORT, () => {
    console.log(`IPRAY API Server running on port ${PORT}`)
    console.log(`API Token: ${API_TOKEN}`)
    console.log('Available endpoints:')
    console.log(`  GET  http://localhost:${PORT}/api/health`)
    console.log(`  GET  http://localhost:${PORT}/api/data?token=${API_TOKEN}`)
    console.log(`  GET  http://localhost:${PORT}/api/data/:filename?token=${API_TOKEN}`)
    console.log(`  PUT  http://localhost:${PORT}/api/data/:filename`)
    console.log(`  PUT  http://localhost:${PORT}/api/data`)
  })

  return { server, API_TOKEN }
}

module.exports = { createApiServer }


