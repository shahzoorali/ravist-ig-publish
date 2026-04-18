require('dotenv').config();

const express = require('express');
const morgan  = require('morgan');

const publishRoutes      = require('./routes/publish.routes');
const healthRoutes       = require('./routes/health.routes');
const { errorHandler }   = require('./middleware/error.middleware');
const { authMiddleware } = require('./middleware/auth.middleware');

const app  = express();
const PORT = process.env.PORT || 3004;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/health', healthRoutes);
app.use('/api', authMiddleware, publishRoutes);

// ── Global error handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ── Boot ────────────────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀  ravist-ig-publish running on http://localhost:${PORT}`);
  console.log(`📋  Health          →  GET  http://localhost:${PORT}/health`);
  console.log(`📤  Publish         →  POST http://localhost:${PORT}/api/publish`);
  console.log(`👁   Preview caption →  POST http://localhost:${PORT}/api/preview-caption\n`);
});

module.exports = app;
