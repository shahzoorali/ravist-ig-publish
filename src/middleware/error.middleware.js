function errorHandler(err, _req, res, _next) {
  console.error('[error]', err.message, err.details ?? '');
  res.status(err.statusCode ?? 500).json({
    success: false,
    error:   err.message ?? 'Internal server error',
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = { errorHandler };
