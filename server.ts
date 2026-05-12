import express from 'express';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { cleanEnv, str, port } from 'envalid';
import jwt from 'jsonwebtoken';

// Validate environment variables early
const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  JWT_SECRET: str(),
  PORT: port({ default: 3000 }),
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

import authRoutes from './server/routes/auth.js';
import apiRoutes from './server/routes/api.js';
import notificationRoutes from './server/routes/notifications.js';

async function startServer() {
  const app = express();
  const PORT = env.PORT;

  const server = http.createServer(app);
  const io = new IOServer(server, { 
    cors: { 
      origin: '*'
    } 
  });
  app.locals.io = io;
  app.set('io', io);

  const onlineUsers = new Map();
  app.locals.onlineUsers = onlineUsers;

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
    crossOriginEmbedderPolicy: false
  }));
  app.use(cors());
  app.use(express.json());
  app.set('trust proxy', 1);

  app.use('/uploads', express.static(path.join(__dirname, 'server', 'uploads')));

  app.use('/auth', authRoutes);
  console.log('Mounting API routes at /api');
  app.use('/api', apiRoutes);
  app.use('/api/notifications', notificationRoutes);

  // Debug route
  if (process.env.NODE_ENV !== 'production') {
    app.get('/api/debug-routes', (req, res) => {
      const routes = [];
      app._router.stack.forEach((middleware) => {
          if(middleware.route){ // routes registered directly on the app
              routes.push(middleware.route);
          } else if(middleware.name === 'router'){ // router middleware 
              middleware.handle.stack.forEach((handler) => {
                  if (handler.route) routes.push(handler.route);
              });
          }
      });
      res.json(routes);
    });
  }

  const authenticateSocket = (socket, token) => {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      socket.user = payload;
      onlineUsers.set(socket.id, {
        id: payload.id,
        name: payload.name || 'Unknown',
        role: payload.role,
        socketId: socket.id,
        lastSeen: new Date().toISOString()
      });
      io.emit('online_users_count', onlineUsers.size);
    } catch (err) {
      console.error('Socket auth failed', err.message);
    }
  };

  io.on('connection', (socket) => {
    console.log('Socket connected', socket.id);
    const handshakeToken = socket.handshake?.auth?.token;
    if (handshakeToken) {
      authenticateSocket(socket, handshakeToken);
    }
    
    socket.on('authenticate', (data) => {
      const token = data && typeof data === 'object' ? data.token : data;
      if (token) {
        authenticateSocket(socket, token);
      }
    });

    socket.on('join', (room) => { 
      if (socket.user) {
        // Basic authorization: users can join their own ID room, or role-based rooms if they have that role
        if (room === socket.user.id || room === socket.user.role || socket.user.role === 'admin') {
          socket.join(room); 
        }
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      io.emit('online_users_count', onlineUsers.size);
      console.log('Socket disconnected', socket.id);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
