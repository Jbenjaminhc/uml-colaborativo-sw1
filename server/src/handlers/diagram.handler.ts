import { Server, Socket } from 'socket.io';
import { DiagramModel } from '../models/diagram.model';
import { presenceService } from '../services/presence.service';

export const registerDiagramHandlers = (io: Server, socket: Socket) => {
  const { userId } = socket.data;
  const { username } = socket.data;

  socket.on('diagram:join', async ({ diagramId }) => {
    try {
      // Verify access
      const diagram = await DiagramModel.findOne({
        _id: diagramId,
        $or: [{ userId }, { 'collaborators.userId': userId }],
      });

      if (!diagram) {
        socket.emit('error', { message: 'Diagram not found or access denied' });
        return;
      }

      // Join room
      socket.join(diagramId);

      // Update presence
      const activeUser = presenceService.addUser(diagramId, {
        userId,
        username,
        socketId: socket.id,
      });

      // Broadcast updated presence to room
      const activeUsers = presenceService.getActiveUsers(diagramId);
      io.to(diagramId).emit('diagram:presence-updated', activeUsers);
    } catch (err) {
      socket.emit('error', { message: 'Failed to join diagram' });
    }
  });

  socket.on('diagram:leave', ({ diagramId }) => {
    socket.leave(diagramId);
    presenceService.removeUser(diagramId, socket.id);
    const activeUsers = presenceService.getActiveUsers(diagramId);
    io.to(diagramId).emit('diagram:presence-updated', activeUsers);
  });

  socket.on('entity:created', ({ diagramId, entity }) => {
    socket.to(diagramId).emit('entity:created', entity);
  });

  socket.on('entity:updated', ({ diagramId, entity }) => {
    socket.to(diagramId).emit('entity:updated', entity);
  });

  socket.on('entity:deleted', ({ diagramId, entityId }) => {
    socket.to(diagramId).emit('entity:deleted', entityId);
  });

  socket.on('entity:moved', ({ diagramId, entityId, position }) => {
    socket.to(diagramId).emit('entity:moved', { entityId, position });
  });

  socket.on('entities:moved', ({ diagramId, updates }) => {
    socket.to(diagramId).emit('entities:moved', updates);
  });

  socket.on('relationship:created', ({ diagramId, relationship }) => {
    socket.to(diagramId).emit('relationship:created', relationship);
  });

  socket.on('relationship:updated', ({ diagramId, relationship }) => {
    socket.to(diagramId).emit('relationship:updated', relationship);
  });

  socket.on('relationship:deleted', ({ diagramId, relationshipId }) => {
    socket.to(diagramId).emit('relationship:deleted', relationshipId);
  });

  socket.on('diagram:cleared', ({ diagramId }) => {
    socket.to(diagramId).emit('diagram:cleared');
  });

  socket.on('diagram:renamed', ({ diagramId, name }) => {
    socket.to(diagramId).emit('diagram:renamed', name);
  });

  socket.on('cursor:move', ({ diagramId, cursor }) => {
    socket
      .to(diagramId)
      .emit('cursor:move', { socketId: socket.id, ...cursor });
  });

  socket.on('chat:message', ({ diagramId, message }) => {
    socket.to(diagramId).emit('chat:message', message);
  });

  socket.on('user:activity', ({ diagramId, activity }) => {
    presenceService.updateUserActivity(diagramId, socket.id, activity);
    // Broadcast the updated users list so everyone gets the new activity
    const users = presenceService.getActiveUsers(diagramId);
    io.to(diagramId).emit('diagram:presence-updated', users);
  });

  socket.on('disconnecting', () => {
    // Leave all rooms and update presence
    const rooms = presenceService.getRoomsForSocket(socket.id);
    rooms.forEach((diagramId) => {
      presenceService.removeUser(diagramId, socket.id);
      const activeUsers = presenceService.getActiveUsers(diagramId);
      io.to(diagramId).emit('diagram:presence-updated', activeUsers);
    });
  });
};
