const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { uploadQueue } = require('../queue/uploadQueue');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage()
});

// Penting: Multer mesti jalan dulu supaya req.body ada clientId (multipart/form-data)
router.post('/upload', upload.single('file'), requireAuth, async (req, res) => {
  try {
    const { clientId, folder } = req.body;
    const file = req.file;

    if (!clientId || !folder) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    if (!file) {
      return res.status(400).json({ error: 'file is required' });
    }

    const job = await uploadQueue.add('upload', {
      clientId,
      originalName: file.originalname,
      buffer: file.buffer,
      folder: folder
    });

    return res.status(202).json({
      message: 'Upload queued',
      jobId: job.id
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[UploadRoute] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/upload', requireAuth, async (req, res) => {
  try {
    const { clientId, fileName, folder } = req.body;

    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    if (!fileName || !folder) return res.status(400).json({ error: 'fileName and folder are required' });

    const job = await uploadQueue.add('delete', { clientId, fileName, folder });

    return res.status(202).json({
      message: 'Delete queued',
      jobId: job.id
    });

  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[UploadRoute] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

