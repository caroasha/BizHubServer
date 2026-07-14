const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('./env');
const logger = require('../utils/logger');

// ============================================
// Socket.io Configuration
// ============================================

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 10000,
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const tenantId = socket.user?.tenantId;
    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
    }

    socket.on('join:module', (module) => {
      if (tenantId) {
        socket.join(`tenant:${tenantId}:${module}`);
      }
    });

    socket.on('leave:module', (module) => {
      if (tenantId) {
        socket.leave(`tenant:${tenantId}:${module}`);
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initSocket first.');
  }
  return io;
};

module.exports = { initSocket, getIO };