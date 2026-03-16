function parseClientTokens(envValue) {
  const map = new Map();
  if (!envValue) return map;

  envValue.split(',').forEach(pair => {
    const [clientId, token] = pair.split(':').map(s => s && s.trim());
    if (clientId && token) {
      map.set(clientId, token);
    }
  });
  return map;
}

const clientTokens = parseClientTokens(process.env.CLIENT_TOKENS || '');

function getExpectedToken(clientId) {
  return clientTokens.get(clientId) || null;
}

function extractTokenFromRequest(req) {
  return (
    req.headers['x-auth-token'] ||
    (req.body && req.body.authToken) ||
    null
  );
}

function requireAuth(req, res, next) {
  const { clientId } = req.body || {};
  const token = extractTokenFromRequest(req);

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  const expected = getExpectedToken(clientId);
  if (!expected || token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

function validateSocketAuth(payload) {
  const { clientId, authToken } = payload || {};

  console.log(clientId, authToken);
  if (!clientId || !authToken) return false;

  const expected = getExpectedToken(clientId);
  return !!expected && authToken === expected;
}

module.exports = {
  requireAuth,
  validateSocketAuth
};


