const express = require('express');
const { getClientList } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/clients
 * Kembalikan senarai client + token dari CLIENT_TOKENS (.env).
 * Hanya dibenarkan dari same-origin (panel setting sahaja).
 */
router.get('/clients', (req, res) => {
  const referer = req.get('Referer') || '';
  const host = req.get('Host') || '';
  if (referer && host && !referer.includes(host)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const clients = getClientList();
  return res.json({ clients });
});

module.exports = router;
