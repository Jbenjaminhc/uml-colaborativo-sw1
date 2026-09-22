import DownloadIcon from '@mui/icons-material/Download';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Box,
  Divider,
  Tooltip,
  IconButton,
  useTheme,
} from '@mui/material';
import axios from 'axios';
import { toPng } from 'html-to-image';
import { getLayoutedElements } from '../../utils/layout';
import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Connection,
  ConnectionMode,
  Controls,
  Edge,
  EdgeChange,
  MiniMap,
  NodeChange,
  applyEdgeChanges,
  applyNodeChanges,
  getRectOfNodes,
  getTransformForBounds,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/base.css';
import {
  useEntities,
  useEntitiesDispatch,
} from '../../context/EntitiesContext';
import { useSocket } from '../../context/SocketContext';
import { useHistory } from '../../context/HistoryContext';
import {
  useRelationships,
  useRelationshipsDispatch,
} from '../../context/RelationshipsContext';
import '../../styles/Editor.css';
import { Entity, Relationship } from '../../types';
import { AlertType } from '../alert/AlertContext';
import useAlert from '../alert/useAlert';
import AggregationEdge from './edges/AggregationEdge';
import AssociationEdge from './edges/AssociationEdge';
import CompositionEdge from './edges/CompositionEdge';
import DependencyEdge from './edges/DependencyEdge';
import ImplementationEdge from './edges/ImplementationEdge';
import InheritanceEdge from './edges/InheritanceEdge';
import RelationshipModal from '../forms/modals/RelationshipModal';
import ClassNode from './nodes/ClassNode';
import EnumNode from './nodes/EnumNode';
import InterfaceNode from './nodes/InterfaceNode';
import CursorOverlay from './CursorOverlay';

const nodeTypes = {
  class: ClassNode,
  interface: InterfaceNode,
  enum: EnumNode,
};

export const nodeColor = (node: Entity) => {
  switch (node.type) {
    case 'class':
      return '#D4F1F4';
    case 'interface':
      return '#b1f3b1';
    case 'enum':
      return '#ffcccb';
    default:
      return '#ffffff';
  }
};

const edgeTypes = {
  Inheritance: InheritanceEdge,
  Association: AssociationEdge,
  Dependency: DependencyEdge,
  Implementation: ImplementationEdge,
  Aggregation: AggregationEdge,
  Composition: CompositionEdge,
};

type Props = {
  ent: Entity[];
  rel: Relationship[];
  name?: string;
};

function DiagramEditor({ ent, rel, name }: Props) {
  const entities = useEntities();
  const entitiesDispatch = useEntitiesDispatch();
  const relationships = useRelationships();
  const relationshipsDispatch = useRelationshipsDispatch();
  const edgeUpdateSuccessful = useRef(true);

  const {
    socket,
    emitEntityMoved,
    emitEntitiesMoved,
    emitEntityDeleted,
    emitEntityCreated,
    emitRelationshipDeleted,
    emitRelationshipUpdated,
    emitRelationshipCreated,
    emitDiagramCleared,
    emitUserActivity,
  } = useSocket();

  const { diagramId } = useParams();
  const { setAlert } = useAlert();
  const { undo, redo, canUndo, canRedo, pushCommand } = useHistory();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const theme = useTheme();

  const [quickConnectData, setQuickConnectData] = useState<Connection | null>(
    null
  );

  const handleExportJson = async () => {
    if (!diagramId) return;
    setAlert('Exportando JSON...', AlertType.INFO);
    try {
      const response = await axios.get(
        `/api/diagram/${diagramId}/export/json`,
        {
          responseType: 'blob',
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = name
        ? name.replace(/[^a-zA-Z0-9_\-. ]/g, '_') + '.json'
        : `diagram-${diagramId}.json`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setAlert('JSON exportado exitosamente', AlertType.SUCCESS);
    } catch (e) {
      setAlert(
        'No se pudo exportar el JSON. Inténtalo de nuevo',
        AlertType.ERROR
      );
    }
  };

  const handleImportJson = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (diagramId) formData.append('diagramId', diagramId);

    setAlert('Importando diagrama JSON...', AlertType.INFO);
    try {
      await axios.post('/api/diagram/import/json', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAlert('¡Diagrama importado exitosamente!', AlertType.SUCCESS);
      window.location.reload();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Error al importar JSON. Comprueba el formato del archivo.';
      setAlert(msg, AlertType.ERROR);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const { getNodes, project } = useReactFlow();
  const lastEmitTime = useRef(0);
  const diagramRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!socket || !diagramId || !diagramRef.current) return;
    
    // throttle
    const now = Date.now();
    if (now - lastEmitTime.current < 50) return; // ~20fps
    lastEmitTime.current = now;

    const bounds = diagramRef.current.getBoundingClientRect();
    const pos = project({ 
      x: e.clientX - bounds.left, 
      y: e.clientY - bounds.top 
    });
    
    socket.emit('cursor:move', { diagramId, cursor: pos });
  }, [project, socket, diagramId]);

  const handleSelectionChange = useCallback(({ nodes, edges }: { nodes: any[], edges: any[] }) => {
    if (nodes.length > 0) {
      const nodeName = nodes[0].data?.name || 'una entidad';
      emitUserActivity('Editando', nodeName);
    } else if (edges.length > 0) {
      emitUserActivity('Editando', 'relación');
    } else {
      emitUserActivity('Observando');
    }
  }, [emitUserActivity]);

  const handleAutoLayout = async () => {
    if (!diagramId) return;

    const currentNodes = getNodes();
    const updates = getLayoutedElements(currentNodes, relationships, 'TB');
    if (updates.length === 0) return;

    const previousPositions = currentNodes.map((n) => ({
      entityId: n.id,
      position: { x: n.position.x, y: n.position.y },
    }));

    updates.forEach((u) => {
      entitiesDispatch({
        type: 'UPDATE_ENTITY_POSITION',
        payload: { id: u.entityId, position: u.position },
      });
    });
    emitEntitiesMoved(updates);

    try {
      await axios.put(`/api/diagram/${diagramId}/positions`, { updates });
      setAlert('Layout organizado mágicamente', AlertType.SUCCESS);

      pushCommand({
        undo: async () => {
          previousPositions.forEach((u) => {
            entitiesDispatch({
              type: 'UPDATE_ENTITY_POSITION',
              payload: { id: u.entityId, position: u.position },
            });
          });
          emitEntitiesMoved(previousPositions);
          await axios
            .put(`/api/diagram/${diagramId}/positions`, {
              updates: previousPositions,
            })
            .catch(() => null);
        },
        redo: async () => {
          updates.forEach((u) => {
            entitiesDispatch({
              type: 'UPDATE_ENTITY_POSITION',
              payload: { id: u.entityId, position: u.position },
            });
          });
          emitEntitiesMoved(updates);
          await axios
            .put(`/api/diagram/${diagramId}/positions`, { updates })
            .catch(() => null);
        },
      });
    } catch (e) {
      setAlert('Error al organizar el layout', AlertType.ERROR);
    }
  };

  const handleResetDiagram = async () => {
    setIsResetModalOpen(false);
    if (!diagramId) return;

    const snapshotEntities = [...entities];
    const snapshotRelationships = [...relationships];

    try {
      await axios.delete(`/api/diagram/${diagramId}/clear`);
      entitiesDispatch({ type: 'SET_ENTITIES', payload: [] });
      relationshipsDispatch({ type: 'SET_RELATIONSHIPS', payload: [] });
      emitDiagramCleared();

      pushCommand({
        undo: async () => {
          for (const ent of snapshotEntities) {
            const typeEndpoint =
              ent.type === 'class'
                ? 'class'
                : ent.type === 'enum'
                  ? 'enum'
                  : 'interface';
            await axios
              .post(`/api/${typeEndpoint}?diagramId=${diagramId}`, {
                ...ent.data,
                id: ent.id,
                position: ent.position,
              })
              .catch(() => null);
            entitiesDispatch({ type: 'ADD_ENTITY', payload: ent });
            emitEntityCreated(ent);
          }
          for (const rel of snapshotRelationships) {
            await axios
              .post(`/api/relationship?diagramId=${diagramId}`, {
                ...rel,
                id: rel.id,
              })
              .catch(() => null);
            relationshipsDispatch({ type: 'ADD_RELATIONSHIP', payload: rel });
            emitRelationshipCreated(rel);
          }
        },
        redo: async () => {
          await axios
            .delete(`/api/diagram/${diagramId}/clear`)
            .catch(() => null);
          entitiesDispatch({ type: 'SET_ENTITIES', payload: [] });
          relationshipsDispatch({ type: 'SET_RELATIONSHIPS', payload: [] });
          emitDiagramCleared();
        },
      });

      setAlert('Diagrama limpiado exitosamente', AlertType.SUCCESS);
    } catch (e) {
      setAlert('No se pudo limpiar el diagrama', AlertType.ERROR);
    }
  };

  useEffect(() => {
    entitiesDispatch({ type: 'SET_ENTITIES', payload: ent });
    relationshipsDispatch({ type: 'SET_RELATIONSHIPS', payload: rel });
  }, [entitiesDispatch, relationshipsDispatch, ent, rel]);

  const onNodesChange = useCallback(
    async (changes: NodeChange[]) =>
      entitiesDispatch({
        type: 'SET_ENTITIES',
        payload: applyNodeChanges(changes, entities),
      }),
    [entities, entitiesDispatch]
  );

  const dragStartPositions = useRef<{ [id: string]: { x: number; y: number } }>(
    {}
  );

  const onNodeDragStart = useCallback((event: MouseEvent, node: Entity) => {
    dragStartPositions.current[node.id] = {
      x: node.position.x,
      y: node.position.y,
    };
  }, []);

  const onNodeDragStop = useCallback(
    async (event: MouseEvent, node: Entity) => {
      event.stopPropagation();
      const oldPos = dragStartPositions.current[node.id];
      const newPos = { x: node.position.x, y: node.position.y };

      try {
        await axios.put(
          `/api/entity/${node.id}/position?diagramId=${diagramId}`,
          newPos
        );
        emitEntityMoved(node.id, newPos);

        if (oldPos && (oldPos.x !== newPos.x || oldPos.y !== newPos.y)) {
          pushCommand({
            undo: async () => {
              entitiesDispatch({
                type: 'UPDATE_ENTITY_POSITION',
                payload: { id: node.id, position: oldPos },
              });
              emitEntityMoved(node.id, oldPos);
              await axios
                .put(
                  `/api/entity/${node.id}/position?diagramId=${diagramId}`,
                  oldPos
                )
                .catch(() => null);
            },
            redo: async () => {
              entitiesDispatch({
                type: 'UPDATE_ENTITY_POSITION',
                payload: { id: node.id, position: newPos },
              });
              emitEntityMoved(node.id, newPos);
              await axios
                .put(
                  `/api/entity/${node.id}/position?diagramId=${diagramId}`,
                  newPos
                )
                .catch(() => null);
            },
          });
        }
      } catch (e) {
        setAlert(
          'Could not update position. Please try again',
          AlertType.ERROR
        );
      }
    },
    [diagramId, setAlert, emitEntityMoved, pushCommand, entitiesDispatch]
  );

  const onNodesDelete = useCallback(
    async (nodesToDelete: Entity[]) => {
      try {
        const nodeToDelete = nodesToDelete[0];

        // Find relationships connected to this node before we delete it
        const connectedEdges = relationships.filter(
          (edge) =>
            edge.source === nodeToDelete.id || edge.target === nodeToDelete.id
        );

        // Delete from backend first
        await axios.delete(
          `/api/entity/${nodeToDelete.id}?diagramId=${diagramId}`
        );
        for (const edge of connectedEdges) {
          await axios
            .delete(`/api/relationship/${edge.id}?diagramId=${diagramId}`)
            .catch(() => null);
        }

        entitiesDispatch({ type: 'DELETE_ENTITY', id: nodeToDelete.id });
        emitEntityDeleted(nodeToDelete.id);

        connectedEdges.forEach((edge) => {
          relationshipsDispatch({ type: 'DELETE_RELATIONSHIP', id: edge.id });
          emitRelationshipDeleted(edge.id);
        });

        pushCommand({
          undo: async () => {
            const typeEndpoint =
              nodeToDelete.type === 'class'
                ? 'class'
                : nodeToDelete.type === 'enum'
                  ? 'enum'
                  : 'interface';

            await axios
              .post(`/api/${typeEndpoint}?diagramId=${diagramId}`, {
                ...nodeToDelete.data,
                id: nodeToDelete.id,
                position: nodeToDelete.position,
              })
              .catch(() => null);
            entitiesDispatch({ type: 'ADD_ENTITY', payload: nodeToDelete });
            emitEntityCreated(nodeToDelete);

            for (const edge of connectedEdges) {
              const relPayload = { ...edge, id: edge.id };
              await axios
                .post(`/api/relationship?diagramId=${diagramId}`, relPayload)
                .catch(() => null);
              relationshipsDispatch({
                type: 'ADD_RELATIONSHIP',
                payload: edge,
              });
              emitRelationshipCreated(edge);
            }
          },
          redo: async () => {
            await axios
              .delete(`/api/entity/${nodeToDelete.id}?diagramId=${diagramId}`)
              .catch(() => null);
            entitiesDispatch({ type: 'DELETE_ENTITY', id: nodeToDelete.id });
            emitEntityDeleted(nodeToDelete.id);
            connectedEdges.forEach((edge) => {
              relationshipsDispatch({
                type: 'DELETE_RELATIONSHIP',
                id: edge.id,
              });
              emitRelationshipDeleted(edge.id);
            });
          },
        });

        setAlert('Entity successfully deleted', AlertType.SUCCESS);
      } catch (e) {
        setAlert('Could not delete entity. Try again', AlertType.ERROR);
      }
    },
    [
      diagramId,
      entitiesDispatch,
      relationshipsDispatch,
      setAlert,
      emitEntityDeleted,
      emitRelationshipDeleted,
      emitEntityCreated,
      emitRelationshipCreated,
      pushCommand,
      relationships,
    ]
  );

  const onConnect = useCallback((connection: Connection) => {
    setQuickConnectData(connection);
  }, []);

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      relationshipsDispatch({
        type: 'SET_RELATIONSHIPS',
        payload: applyEdgeChanges(changes, relationships),
      }),
    [relationships, relationshipsDispatch]
  );

  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback(
    async (oldEdge: Edge, newConnection: Connection) => {
      edgeUpdateSuccessful.current = true;
      const newEdge = {
        ...oldEdge,
        ...newConnection,
        id: oldEdge.id,
      } as Edge;
      try {
        relationshipsDispatch({
          type: 'UPDATE_RELATIONSHIP',
          payload: newEdge,
        });
        await axios.put(
          `/api/relationship/${oldEdge.id}/handle?diagramId=${diagramId}`,
          {
            type: oldEdge.type,
            ...newConnection,
          }
        );
        emitRelationshipUpdated(newEdge as Relationship);
      } catch (e) {
        setAlert('Cannot update relationship to that entity', AlertType.ERROR);
        relationshipsDispatch({
          type: 'UPDATE_RELATIONSHIP',
          payload: oldEdge,
        });
      }
    },
    [diagramId, relationshipsDispatch, setAlert, emitRelationshipUpdated]
  );

  const onEdgeUpdateEnd = useCallback(() => {
    if (!edgeUpdateSuccessful.current) {
      setAlert('Could not detect a port', AlertType.WARNING);
    }
    edgeUpdateSuccessful.current = true;
  }, [setAlert]);

  const onEdgesDelete = useCallback(
    async (edges: Edge[]) => {
      try {
        const edgeToDelete = edges[0] as Relationship;
        await axios.delete(
          `/api/relationship/${edgeToDelete.id}?diagramId=${diagramId}`
        );
        relationshipsDispatch({
          type: 'DELETE_RELATIONSHIP',
          id: edgeToDelete.id,
        });
        emitRelationshipDeleted(edgeToDelete.id);

        pushCommand({
          undo: async () => {
            const relPayload = { ...edgeToDelete, id: edgeToDelete.id };
            await axios
              .post(`/api/relationship?diagramId=${diagramId}`, relPayload)
              .catch(() => null);
            relationshipsDispatch({
              type: 'ADD_RELATIONSHIP',
              payload: edgeToDelete,
            });
            emitRelationshipCreated(edgeToDelete);
          },
          redo: async () => {
            await axios
              .delete(
                `/api/relationship/${edgeToDelete.id}?diagramId=${diagramId}`
              )
              .catch(() => null);
            relationshipsDispatch({
              type: 'DELETE_RELATIONSHIP',
              id: edgeToDelete.id,
            });
            emitRelationshipDeleted(edgeToDelete.id);
          },
        });

        setAlert('Relationship successfully deleted', AlertType.SUCCESS);
      } catch (e) {
        setAlert('Could not delete relationship. Try again', AlertType.ERROR);
      }
    },
    [
      diagramId,
      relationshipsDispatch,
      setAlert,
      emitRelationshipDeleted,
      emitRelationshipCreated,
      pushCommand,
    ]
  );

  const handleDownload = async () => {
    setAlert('Downloading diagram...', AlertType.INFO);
    const nodesBounds = getRectOfNodes(entities);
    const imageWidth = 1800;
    const imageHeight = 1200;
    const transform = getTransformForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.5,
      2
    );

    const viewport = document.querySelector(
      '.react-flow__viewport'
    ) as HTMLElement;
    if (viewport) {
      const dataUrl = await toPng(viewport, {
        backgroundColor: '#faf9f6',
        width: imageWidth,
        height: imageHeight,
        style: {
          width: String(imageWidth),
          height: String(imageHeight),
          transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
        },
      });

      const now = new Date();
      const link = document.createElement('a');
      link.download = `diagram${diagramId}-${now.toLocaleDateString()}.png`;
      link.href = dataUrl;
      link.click();
      setAlert('Diagram successfully downloaded', AlertType.SUCCESS);
    }
  };

  return (
    <div className="diagram" style={{ position: 'relative' }} onMouseMove={handleMouseMove} ref={diagramRef}>
      <CursorOverlay />
      <ReactFlow
        fitView
        nodes={entities}
        nodeTypes={nodeTypes}
        onSelectionChange={handleSelectionChange}
        onNodesChange={onNodesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onConnect={onConnect}
        edges={relationships}
        edgeTypes={edgeTypes}
        onEdgesChange={onEdgesChange}
        onEdgeUpdateStart={onEdgeUpdateStart}
        onEdgeUpdate={onEdgeUpdate}
        onEdgeUpdateEnd={onEdgeUpdateEnd}
        onEdgesDelete={onEdgesDelete}
        connectionMode={ConnectionMode.Loose}
      >
        <Background color="#444" variant={'dots' as BackgroundVariant} />
        <Controls />
        <MiniMap pannable zoomable position="top-right" nodeColor={nodeColor} />
      </ReactFlow>

      <Box
        sx={{
          position: 'absolute',
          bottom: { xs: 16, md: 24 },
          left: { xs: 16, sm: '50%' },
          transform: { xs: 'none', sm: 'translateX(-50%)' },
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: { xs: 'flex-start', sm: 'center' },
          flexWrap: 'nowrap',
          overflowX: 'auto',
          width: { xs: 'calc(100vw - 100px)', sm: 'max-content' },
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
          gap: { xs: 0.5, sm: 1 },
          padding: { xs: '8px', sm: '8px 16px' },
          borderRadius: '16px',
          background:
            theme.palette.mode === 'dark'
              ? 'rgba(0, 0, 0, 0.6)'
              : 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid',
          borderColor:
            theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(128, 128, 128, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Tooltip title="Deshacer (Ctrl+Z)">
          <span>
            <IconButton
              onClick={() => undo()}
              disabled={!canUndo}
              color="primary"
            >
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Rehacer (Ctrl+Y)">
          <span>
            <IconButton
              onClick={() => redo()}
              disabled={!canRedo}
              color="primary"
            >
              <RedoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Auto Layout (Magia)">
          <IconButton
            onClick={handleAutoLayout}
            sx={{
              color: theme.palette.mode === 'dark' ? '#ff9800' : '#ed6c02',
            }}
          >
            <AutoFixHighIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Limpiar Diagrama">
          <IconButton onClick={() => setIsResetModalOpen(true)} color="error">
            <DeleteSweepIcon />
          </IconButton>
        </Tooltip>

        <Divider
          orientation="vertical"
          flexItem
          sx={{
            mx: 1,
            borderColor:
              theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.2)'
                : 'rgba(0, 0, 0, 0.2)',
          }}
        />

        <Tooltip title="Guardar (Exportar JSON)">
          <IconButton
            onClick={handleExportJson}
            sx={{
              color: theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2',
            }}
          >
            <SaveIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Cargar (Importar JSON)">
          <IconButton
            component="label"
            sx={{
              color: theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2',
            }}
          >
            <UploadFileIcon />
            <input
              type="file"
              hidden
              accept=".json"
              onChange={handleImportJson}
            />
          </IconButton>
        </Tooltip>
        <Tooltip title="Descargar Diagrama (PNG)">
          <IconButton
            onClick={handleDownload}
            sx={{
              color: theme.palette.mode === 'dark' ? '#4caf50' : '#2e7d32',
            }}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <RelationshipModal
        open={!!quickConnectData}
        initialConnection={quickConnectData}
        handleClose={() => setQuickConnectData(null)}
      />

      <Dialog
        open={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
      >
        <DialogTitle>¿Limpiar Diagrama?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas limpiar todo el lienzo? Se borrarán
            todas las clases, interfaces, enums y relaciones. Esta acción se
            puede deshacer posteriormente.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsResetModalOpen(false)} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleResetDiagram} color="error" autoFocus>
            Limpiar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default DiagramEditor;
