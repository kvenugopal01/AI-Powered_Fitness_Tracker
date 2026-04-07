import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const angularApp = new AngularNodeAppEngine();

// Real-time presence tracking
let onlineUsers = 0;

io.on('connection', (socket) => {
  onlineUsers++;
  io.emit('presence', { count: onlineUsers });
  console.log('User connected. Total online:', onlineUsers);

  socket.on('disconnect', () => {
    onlineUsers--;
    io.emit('presence', { count: onlineUsers });
    console.log('User disconnected. Total online:', onlineUsers);
  });

  // Shared workout updates (optional but good for "real-time" feel)
  socket.on('workout:update', (data) => {
    socket.broadcast.emit('workout:update', data);
  });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on port 3000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = 3000;
  httpServer.listen(port, () => {
    console.log(`Node Express server with Socket.io listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
