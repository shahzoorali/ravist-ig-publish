function authMiddleware(req, res, next) {
  const requiredKey = process.env.SERVICE_API_KEY;
  if (!requiredKey) return next();  // disabled

  const provided = req.headers['x-api-key'];
  if (!provided)          return res.status(401).json({ success: false, error: 'Missing X-API-Key header.' });
  if (provided !== requiredKey) return res.status(403).json({ success: false, error: 'Invalid API key.' });

  next();
}

module.exports = { authMiddleware };
