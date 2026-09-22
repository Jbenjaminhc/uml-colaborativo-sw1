import { useCallback } from 'react';
import { useEntitiesDispatch } from '../context/EntitiesContext';
import { useRelationshipsDispatch } from '../context/RelationshipsContext';
import { useSocket } from '../context/SocketContext';
import { useHistory } from '../context/HistoryContext';
import { Entity, Relationship } from '../types';

export function useDiagramActions() {
  const entitiesDispatch = useEntitiesDispatch();
  const relationshipsDispatch = useRelationshipsDispatch();
  const socket = useSocket();
  const history = useHistory();

  const addEntity = useCallback((entity: Entity) => {
    // 1. Ejecutar localmente y enviar al socket
    entitiesDispatch({ type: 'ADD_ENTITY', payload: entity });
    socket.emitEntityCreated(entity);

    // 2. Registrar en historial
    history.pushCommand({
      undo: () => {
        entitiesDispatch({ type: 'DELETE_ENTITY', id: entity.id });
        socket.emitEntityDeleted(entity.id);
      },
      redo: () => {
        entitiesDispatch({ type: 'ADD_ENTITY', payload: entity });
        socket.emitEntityCreated(entity);
      },
    });
  }, [entitiesDispatch, socket, history]);

  const deleteEntity = useCallback((entity: Entity) => {
    entitiesDispatch({ type: 'DELETE_ENTITY', id: entity.id });
    socket.emitEntityDeleted(entity.id);

    history.pushCommand({
      undo: () => {
        entitiesDispatch({ type: 'ADD_ENTITY', payload: entity });
        socket.emitEntityCreated(entity);
      },
      redo: () => {
        entitiesDispatch({ type: 'DELETE_ENTITY', id: entity.id });
        socket.emitEntityDeleted(entity.id);
      },
    });
  }, [entitiesDispatch, socket, history]);

  const updateEntity = useCallback((oldEntity: Entity, newEntity: Entity) => {
    entitiesDispatch({ type: 'UPDATE_ENTITY', payload: newEntity });
    socket.emitEntityUpdated(newEntity);

    history.pushCommand({
      undo: () => {
        entitiesDispatch({ type: 'UPDATE_ENTITY', payload: oldEntity });
        socket.emitEntityUpdated(oldEntity);
      },
      redo: () => {
        entitiesDispatch({ type: 'UPDATE_ENTITY', payload: newEntity });
        socket.emitEntityUpdated(newEntity);
      },
    });
  }, [entitiesDispatch, socket, history]);

  const moveEntity = useCallback((entityId: string, oldPosition: {x: number, y: number}, newPosition: {x: number, y: number}) => {
    // Nota: El movimiento inicial ya fue emitido por el Drag/Drop, así que no emitimos el REDO inicialmente aquí
    // a menos que este hook sea el único lugar donde se mueva.
    // Usualmente moveEntity se llama AL FINALIZAR el drag.
    history.pushCommand({
      undo: () => {
        entitiesDispatch({ type: 'UPDATE_ENTITY_POSITION', payload: { id: entityId, position: oldPosition } });
        socket.emitEntityMoved(entityId, oldPosition);
      },
      redo: () => {
        entitiesDispatch({ type: 'UPDATE_ENTITY_POSITION', payload: { id: entityId, position: newPosition } });
        socket.emitEntityMoved(entityId, newPosition);
      },
    });
  }, [entitiesDispatch, socket, history]);

  const addRelationship = useCallback((relationship: Relationship) => {
    relationshipsDispatch({ type: 'ADD_RELATIONSHIP', payload: relationship });
    socket.emitRelationshipCreated(relationship);

    history.pushCommand({
      undo: () => {
        relationshipsDispatch({ type: 'DELETE_RELATIONSHIP', id: relationship.id });
        socket.emitRelationshipDeleted(relationship.id);
      },
      redo: () => {
        relationshipsDispatch({ type: 'ADD_RELATIONSHIP', payload: relationship });
        socket.emitRelationshipCreated(relationship);
      },
    });
  }, [relationshipsDispatch, socket, history]);

  const deleteRelationship = useCallback((relationship: Relationship) => {
    relationshipsDispatch({ type: 'DELETE_RELATIONSHIP', id: relationship.id });
    socket.emitRelationshipDeleted(relationship.id);

    history.pushCommand({
      undo: () => {
        relationshipsDispatch({ type: 'ADD_RELATIONSHIP', payload: relationship });
        socket.emitRelationshipCreated(relationship);
      },
      redo: () => {
        relationshipsDispatch({ type: 'DELETE_RELATIONSHIP', id: relationship.id });
        socket.emitRelationshipDeleted(relationship.id);
      },
    });
  }, [relationshipsDispatch, socket, history]);

  const updateRelationship = useCallback((oldRel: Relationship, newRel: Relationship) => {
    relationshipsDispatch({ type: 'UPDATE_RELATIONSHIP', payload: newRel });
    socket.emitRelationshipUpdated(newRel);

    history.pushCommand({
      undo: () => {
        relationshipsDispatch({ type: 'UPDATE_RELATIONSHIP', payload: oldRel });
        socket.emitRelationshipUpdated(oldRel);
      },
      redo: () => {
        relationshipsDispatch({ type: 'UPDATE_RELATIONSHIP', payload: newRel });
        socket.emitRelationshipUpdated(newRel);
      },
    });
  }, [relationshipsDispatch, socket, history]);

  return {
    addEntity,
    deleteEntity,
    updateEntity,
    moveEntity,
    addRelationship,
    deleteRelationship,
    updateRelationship,
  };
}
