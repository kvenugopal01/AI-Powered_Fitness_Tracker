// middleware/errorHandler.js
// Centralised Express error-handling middleware

/**
 * Formats Mongoose validation errors into a friendly message.
 */
function formatMongooseError(err) {
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return { status: 400, message: messages.join('; ') };
  }
  if (err.code === 11000) {
    // Duplicate key
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return { status: 409, message: `Duplicate value for ${field}.` };
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const mongoErr = formatMongooseError(err);
  if (mongoErr) {
    return res.status(mongoErr.status).json({ error: mongoErr.message });
  }

  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Don't leak stack traces in production
  const body = { error: message };
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    body.stack = err.stack;
  }

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} — ${status}: ${message}`);
  res.status(status).json(body);
}

module.exports = errorHandler;
