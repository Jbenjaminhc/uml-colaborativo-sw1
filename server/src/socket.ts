import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserModel } from './models/user.model';
import { registerDiagramHandlers } from './handlers/diagram.handler';

export function initializeSocketIO(httpServer: HttpServer): Server {
  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // JWT auth middleware
  io.use(async (socket, next) => {
    try {
      const { token } = socket.handshake.auth;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        type: string;
        userId: string;
      };
      if (decoded.type !== 'auth') return next(new Error('Invalid token type'));
      const user = await UserModel.findById(decoded.userId);
      if (!user || user.verified === false)
        return next(new Error('Unauthorized'));
      socket.data.userId = decoded.userId;
      socket.data.username = user.username;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.data.username} (${socket.id})`);

    // Join personal user room for dashboard updates
    if (socket.data.userId) {
      socket.join(`user:${socket.data.userId}`);
    }

    registerDiagramHandlers(io, socket);
    socket.on('disconnect', () => {
      console.log(
        `Socket disconnected: ${socket.data.username} (${socket.id})`
      );
    });
  });

  return io;
}
