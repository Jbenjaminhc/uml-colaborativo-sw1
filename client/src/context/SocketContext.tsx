import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { ActiveUser, Entity, Relationship, ChatMessage } from '../types';
import { useEntitiesDispatch } from './EntitiesContext';
import { useRelationshipsDispatch } from './RelationshipsContext';
import useAlert from '../components/alert/useAlert';
import { AlertType } from '../components/alert/AlertContext';

interface SocketContextType {
  socket: Socket | null;
  activeUsers: ActiveUser[];
  emitEntityCreated: (entity: Entity) => void;
  emitEntityUpdated: (entity: Entity) => void;
  emitEntityDeleted: (entityId: string) => void;
  emitEntityMoved: (
    entityId: string,
    position: { x: number; y: number }
  ) => void;
  emitEntitiesMoved: (updates: { entityId: string; position: { x: number; y: number } }[]) => void;
  emitRelationshipCreated: (relationship: Relationship) => void;
  emitRelationshipUpdated: (relationship: Relationship) => void;
  emitRelationshipDeleted: (relationshipId: string) => void;
  emitDiagramRenamed: (name: string) => void;
  emitDiagramCleared: () => void;
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string) => void;
  emitUserActivity: (action: string, target?: string) => void;
}

export const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({
  diagramId,
  children,
}: {
  diagramId: string | undefined;
  children: ReactNode;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const entitiesDispatch = useEntitiesDispatch();
  const relationshipsDispatch = useRelationshipsDispatch();
  const { setAlert } = useAlert();

  useEffect(() => {
    if (!diagramId) return;

    const token = localStorage.getItem('authToken');
    let newSocket: Socket | null = null;

    const timeoutId = setTimeout(() => {
      newSocket = io(import.meta.env.VITE_API_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      setSocket(newSocket);

      newSocket.on('connect', () => {
        newSocket?.emit('diagram:join', { diagramId });
      });

      newSocket.on('chat:message', (message: ChatMessage) => {
        setChatMessages((prev) => [...prev, message]);
      });

      newSocket.on('entity:created', (entity: Entity) => {
        entitiesDispatch({ type: 'ADD_ENTITY', payload: entity });
      });

      newSocket.on('entity:updated', (entity: Entity) => {
        entitiesDispatch({ type: 'UPDATE_ENTITY', payload: entity });
      });

      newSocket.on('entity:deleted', (entityId: string) => {
        entitiesDispatch({ type: 'DELETE_ENTITY', id: entityId });
      });

      newSocket.on(
        'entity:moved',
        ({
          entityId,
          position,
        }: {
          entityId: string;
          position: { x: number; y: number };
        }) => {
          entitiesDispatch({
            type: 'UPDATE_ENTITY_POSITION',
            payload: { id: entityId, position },
          });
        }
      );

      newSocket.on(
        'entities:moved',
        (updates: { entityId: string; position: { x: number; y: number } }[]) => {
          updates.forEach((update) => {
            entitiesDispatch({
              type: 'UPDATE_ENTITY_POSITION',
              payload: { id: update.entityId, position: update.position },
            });
          });
        }
      );

      newSocket.on('relationship:created', (relationship: Relationship) => {
        relationshipsDispatch({
          type: 'ADD_RELATIONSHIP',
          payload: relationship,
        });
      });

      newSocket.on('relationship:updated', (relationship: Relationship) => {
        relationshipsDispatch({
          type: 'UPDATE_RELATIONSHIP',
          payload: relationship,
        });
      });

      newSocket.on('relationship:deleted', (relationshipId: string) => {
        relationshipsDispatch({
          type: 'DELETE_RELATIONSHIP',
          id: relationshipId,
        });
      });

      newSocket.on('diagram:cleared', () => {
        entitiesDispatch({ type: 'SET_ENTITIES', payload: [] });
        relationshipsDispatch({ type: 'SET_RELATIONSHIPS', payload: [] });
      });

      newSocket.on('diagram:presence-updated', (users: ActiveUser[]) => {
        setActiveUsers(users);
      });

      newSocket.on('diagram:imported', () => {
        window.location.reload();
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (newSocket) {
        newSocket.emit('diagram:leave', { diagramId });
        newSocket.disconnect();
      }
    };
  }, [diagramId, entitiesDispatch, relationshipsDispatch]);

  const emitEntityCreated = (entity: Entity) =>
    socket?.emit('entity:created', { diagramId, entity });
  const emitEntityUpdated = (entity: Entity) =>
    socket?.emit('entity:updated', { diagramId, entity });
  const emitEntityDeleted = (entityId: string) =>
    socket?.emit('entity:deleted', { diagramId, entityId });
  const emitEntityMoved = (
    entityId: string,
    position: { x: number; y: number }
  ) => socket?.emit('entity:moved', { diagramId, entityId, position });
  const emitEntitiesMoved = (updates: { entityId: string; position: { x: number; y: number } }[]) => 
    socket?.emit('entities:moved', { diagramId, updates });
  const emitRelationshipCreated = (relationship: Relationship) =>
    socket?.emit('relationship:created', { diagramId, relationship });
  const emitRelationshipUpdated = (relationship: Relationship) =>
    socket?.emit('relationship:updated', { diagramId, relationship });
  const emitRelationshipDeleted = (relationshipId: string) =>
    socket?.emit('relationship:deleted', { diagramId, relationshipId });
  const emitDiagramRenamed = (name: string) =>
    socket?.emit('diagram:renamed', { diagramId, name });
  const emitDiagramCleared = () =>
    socket?.emit('diagram:cleared', { diagramId });

  const emitUserActivity = (action: string, target?: string) => {
    socket?.emit('user:activity', { diagramId, activity: { action, target } });
  };

  const sendChatMessage = (text: string) => {
    if (!socket) return;
    
    const currentUser = activeUsers.find((u) => u.socketId === socket.id);
    if (!currentUser) return;
    
    const message: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.userId,
      username: currentUser.username,
      color: currentUser.color,
      text,
      timestamp: Date.now(),
    };
    
    setChatMessages((prev) => [...prev, message]);
    socket.emit('chat:message', { diagramId, message });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        activeUsers,
        emitEntityCreated,
        emitEntityUpdated,
        emitEntityDeleted,
        emitEntityMoved,
        emitEntitiesMoved,
        emitRelationshipCreated,
        emitRelationshipUpdated,
        emitRelationshipDeleted,
        emitDiagramRenamed,
        emitDiagramCleared,
        chatMessages,
        sendChatMessage,
        emitUserActivity,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
