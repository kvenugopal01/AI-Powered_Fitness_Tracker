// server.js — BFit AI Fitness Assistant Backend
// Stack: Express · MongoDB (Mongoose) · Socket.IO
require('dotenv').config();

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const { connectDB, disconnectDB } = require('./config/db');
const profileRoutes = require('./routes/profile');
const dailyRoutes   = require('./routes/daily');
const aiRoutes      = require('./routes/ai');
const authRoutes    = require('./routes/auth');
const errorHandler  = require('./middleware/errorHandler');

// ── App & HTTP server ────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ── Socket.IO ────────────────────────────────────────────────────────────────
// Mirrors the events consumed by RealtimeService in realtimeService.ts
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : '*',
    methods: ['GET', 'POST'],
  },
});

// Track connected clients for the `presence` event
let onlineCount = 0;

io.on('connection', (socket) => {
  onlineCount++;

  // Broadcast updated presence count to all clients
  io.emit('presence', { count: onlineCount });

  // Relay workout:update events to all OTHER connected clients
  // (The Angular RealtimeService both emits and listens on this event)
  socket.on('workout:update', (data) => {
    socket.broadcast.emit('workout:update', data);
  });

  socket.on('disconnect', () => {
    onlineCount = Math.max(0, onlineCount - 1);
    io.emit('presence', { count: onlineCount });
  });
});

// ── Global middleware ────────────────────────────────────────────────────────

// Security headers (loosen CSP for the Angular app assets if needed)
app.use(
  helmet({
    contentSecurityPolicy: false, // Angular handles its own CSP
    crossOriginEmbedderPolicy: false,
  })
);

// CORS for REST API
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// HTTP request logger (dev: colourful; production: combined)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// JSON body parser (up to 10 MB to accommodate base64 images)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate limiting ────────────────────────────────────────────────────────────

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Tighter limiter for AI routes (Gemini calls can be expensive)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit reached. Please wait a moment before trying again.' },
});

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api', apiLimiter);
app.use('/api/profile', profileRoutes);
app.use('/api/daily',   dailyRoutes);
app.use('/api/ai',      aiLimiter, aiRoutes);

// ── Health-check endpoint ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    uptime:    process.uptime(),
  });
});

// ── Serve Angular frontend (production build) ────────────────────────────────
// When the Angular app is built (`ng build --configuration production`),
// copy the output from dist/bfit/browser into public/ next to this server.js.
const STATIC_DIR = path.join(__dirname, 'public');
app.use(express.static(STATIC_DIR));

// SPA fallback — any unknown route serves index.html so Angular's router works
app.get('*', (req, res) => {
  const indexFile = path.join(STATIC_DIR, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      // Static dir not present (dev mode) — just return a helpful message
      res.status(200).json({
        message: 'BFit API is running. Frontend static files not found in /public.',
        docs:    'See README.md for build & deployment instructions.',
      });
    }
  });
});

// ── Centralised error handler (must be last) ─────────────────────────────────
app.use(errorHandler);

// ── Bootstrap ────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);

(async () => {
  await connectDB();

  // ── Maintenance: Drop old index if it exists ────────────────────────────────
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    if (collections.some(c => c.name === 'users')) {
      await mongoose.connection.db.collection('users').dropIndex('userId_1').catch(() => {});
    }
  } catch (e) {
    // Ignore error if index doesn't exist
  }

  server.listen(PORT, () => {
    console.log(`\n🚀 BFit server running on: http://localhost:${PORT}`);
    console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
  });
})();

// ── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n⚠️   ${signal} received — shutting down gracefully…`);
  server.close(async () => {
    await disconnectDB();
    console.log('✅  Server closed.');
    process.exit(0);
  });
  // Force-exit after 10 s if connections linger
  setTimeout(() => process.exit(1), 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
