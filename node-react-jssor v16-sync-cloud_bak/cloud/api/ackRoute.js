const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/ack', requireAuth, async (req, res) => {
  try {
    const { clientId, file, status } = req.body || {};

    if (!clientId || !file || !status) {
      return res.status(400).json({
        error: 'clientId, file, and status are required'
      });
    }

    // eslint-disable-next-line no-console
    console.log('[ACK]', {
      clientId,
      file,
      status
    });

    return res.status(200).json({
      message: 'ACK received',
      clientId,
      file,
      status
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[AckRoute] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

