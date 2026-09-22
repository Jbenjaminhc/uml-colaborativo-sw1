/* eslint-disable react/jsx-props-no-spreading */
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
  Autocomplete,
  Button,
  Modal,
  TextField,
  Tooltip,
  Typography,
  Paper,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Connection } from 'reactflow';
import { useRelationshipsDispatch } from '../../../context/RelationshipsContext';
import { Relationship, RelationshipType } from '../../../types';
import { AlertType } from '../../alert/AlertContext';
import useAlert from '../../alert/useAlert';
import LongRelationshipInput from '../inputs/LongRelationshipInput';
import ShortRelationshipInput from '../inputs/ShortRelationshipInput';

import { useSocket } from '../../../context/SocketContext';
import { useEntities } from '../../../context/EntitiesContext';
import { useHistory } from '../../../context/HistoryContext';

const relationshipTypes: RelationshipType[] = [
  'Implementation',
  'Inheritance',
  'Association',
  'Aggregation',
  'Composition',
  'Dependency',
];

const getContentByType = (
  type: RelationshipType | null,
  source: string,
  setSource: (s: string) => void,
  target: string,
  setTarget: (t: string) => void,
  label: string,
  setLabel: (l: string) => void,
  srcMultiplicity: string,
  setSrcMultiplicity: (sm: string) => void,
  tgtMultiplicity: string,
  setTgtMultiplicity: (tm: string) => void
) => {
  switch (type) {
    case 'Association':
    case 'Aggregation':
    case 'Composition':
      return (
        <LongRelationshipInput
          type={type}
          source={source}
          setSource={setSource}
          target={target}
          setTarget={setTarget}
          label={label}
          setLabel={setLabel}
          srcMultiplicity={srcMultiplicity}
          setSrcMultiplicity={setSrcMultiplicity}
          tgtMultiplicity={tgtMultiplicity}
          setTgtMultiplicity={setTgtMultiplicity}
        />
      );
    case 'Dependency':
    case 'Inheritance':
    case 'Implementation':
      return (
        <ShortRelationshipInput
          type={type}
          source={source}
          setSource={setSource}
          target={target}
          setTarget={setTarget}
        />
      );
    default:
      return null;
  }
};

type RelationshipModalProps = {
  open: boolean;
  handleClose: () => void;
  initialConnection?: Connection | null;
};

const relationshipHelperText = `Las relaciones son las conexiones entre clases. 
        Contienen un tipo, origen y destino. El origen y destino son las clases que están conectadas por la relación.`;

function RelationshipModal({
  open,
  handleClose,
  initialConnection,
}: RelationshipModalProps) {
  const [type, setType] = useState<RelationshipType | null>(null);
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [sourceHandle, setSourceHandle] = useState<string | null>(null);
  const [targetHandle, setTargetHandle] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [srcMultiplicity, setSrcMultiplicity] = useState('');
  const [tgtMultiplicity, setTgtMultiplicity] = useState('');
  const [errorMessage, setErrorMessage] = useState();
  const [loading, setLoading] = useState(false);

  const relationshipsDispatch = useRelationshipsDispatch();
  const { diagramId } = useParams();
  const { setAlert } = useAlert();
  const { emitRelationshipCreated, emitRelationshipDeleted } = useSocket();
  const { pushCommand } = useHistory();
  const entities = useEntities();

  useEffect(() => {
    if (
      initialConnection &&
      initialConnection.source &&
      initialConnection.target
    ) {
      const sourceEntity = entities.find(
        (e) => e.id === initialConnection.source
      );
      const targetEntity = entities.find(
        (e) => e.id === initialConnection.target
      );

      if (sourceEntity) setSource(sourceEntity.data.name);
      if (targetEntity) setTarget(targetEntity.data.name);
      if (initialConnection.sourceHandle) setSourceHandle(initialConnection.sourceHandle);
      if (initialConnection.targetHandle) setTargetHandle(initialConnection.targetHandle);
    }
  }, [initialConnection, entities]);

  const close = () => {
    setType(null);
    setSource('');
    setTarget('');
    setSourceHandle(null);
    setTargetHandle(null);
    setLabel('');
    setSrcMultiplicity('');
    setTgtMultiplicity('');
    setErrorMessage(undefined);
    handleClose();
  };

  const handleTypeChange = (
    e: React.SyntheticEvent<Element, Event>,
    value: RelationshipType | null
  ) => {
    setType(value);
    if (!initialConnection) {
      setSource('');
      setTarget('');
    }
    setLabel('');
    setSrcMultiplicity('');
    setTgtMultiplicity('');
    setErrorMessage(undefined);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(undefined);
    setLoading(true);

    const relationship: any = {
      type,
      source,
      target,
      label,
      srcMultiplicity,
      tgtMultiplicity,
    };

    if (sourceHandle) relationship.sourceHandle = sourceHandle;
    if (targetHandle) relationship.targetHandle = targetHandle;

    try {
      const res = await axios.post(
        `/api/relationship?diagramId=${diagramId}`,
        relationship
      );
      const newRelationship = res.data as Relationship;
      relationshipsDispatch({
        type: 'ADD_RELATIONSHIP',
        payload: newRelationship,
      });
      emitRelationshipCreated(newRelationship);

      pushCommand({
        undo: async () => {
          await axios.delete(`/api/relationship/${newRelationship.id}?diagramId=${diagramId}`).catch(() => null);
          relationshipsDispatch({ type: 'DELETE_RELATIONSHIP', id: newRelationship.id });
          emitRelationshipDeleted(newRelationship.id);
        },
        redo: async () => {
          const payloadWithId = { ...relationship, id: newRelationship.id };
          const resRedo = await axios.post(`/api/relationship?diagramId=${diagramId}`, payloadWithId).catch(() => null);
          if (resRedo) {
            relationshipsDispatch({ type: 'ADD_RELATIONSHIP', payload: resRedo.data });
            emitRelationshipCreated(resRedo.data);
          }
        }
      });

      setAlert('Relación creada exitosamente', AlertType.SUCCESS);
      close();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Error');
    }
    setLoading(false);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="Relationship Form"
      aria-describedby="Specify the contents of a relationship"
    >
      <Paper
        component="form"
        className="modal-content relationship-content"
        onSubmit={handleSubmit}
      >
        <div>
          <h2>
            Crear Relación&nbsp;
            <Tooltip title={relationshipHelperText}>
              <HelpOutlineIcon fontSize="small" />
            </Tooltip>
          </h2>
          <Autocomplete
            autoComplete
            autoHighlight
            options={relationshipTypes}
            value={type}
            onChange={handleTypeChange}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tipo"
                variant="standard"
                required
                error={errorMessage !== undefined}
                helperText={errorMessage}
              />
            )}
          />
          {getContentByType(
            type,
            source,
            setSource,
            target,
            setTarget,
            label,
            setLabel,
            srcMultiplicity,
            setSrcMultiplicity,
            tgtMultiplicity,
            setTgtMultiplicity
          )}
        </div>
        <div className="buttons">
          <Button variant="text" onClick={close} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="text" type="submit" disabled={loading}>
            Aceptar
          </Button>
        </div>
      </Paper>
    </Modal>
  );
}

export function RelationshipEditModal({
  open,
  handleClose,
  id,
  relationshipType,
}: RelationshipModalProps & {
  id: string;
  relationshipType: RelationshipType;
}) {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [label, setLabel] = useState('');
  const [srcMultiplicity, setSrcMultiplicity] = useState('');
  const [tgtMultiplicity, setTgtMultiplicity] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [initialRelationship, setInitialRelationship] = useState<Relationship | null>(null);

  const relationshipsDispatch = useRelationshipsDispatch();
  const { diagramId } = useParams();
  const { setAlert } = useAlert();
  const { emitRelationshipUpdated } = useSocket();
  const { pushCommand } = useHistory();

  useEffect(() => {
    const getRelationship = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `/api/relationship/${id}?diagramId=${diagramId}`
        );
        const relationship = res.data as Relationship;
        setInitialRelationship(relationship);
        setSource(relationship.source);
        setTarget(relationship.target);
        setLabel(relationship.data?.label || '');
        setSrcMultiplicity(relationship.data?.srcMultiplicity || '');
        setTgtMultiplicity(relationship.data?.tgtMultiplicity || '');
      } catch (err: any) {
        setErrorMessage(
          'Error del servidor. Por favor, inténtalo de nuevo o reporta este error.'
        );
      }
      setLoading(false);
    };
    if (open) {
      getRelationship();
    }
  }, [diagramId, id, open]);

  const close = () => {
    setSource('');
    setTarget('');
    setLabel('');
    setSrcMultiplicity('');
    setTgtMultiplicity('');
    setErrorMessage(undefined);
    handleClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(undefined);
    setLoading(true);

    const relationship = {
      type: relationshipType,
      source,
      target,
      label,
      srcMultiplicity,
      tgtMultiplicity,
    };

    try {
      const res = await axios.put(
        `/api/relationship/${id}?diagramId=${diagramId}`,
        relationship
      );
      const updatedRelationship = res.data as Relationship;
      relationshipsDispatch({
        type: 'UPDATE_RELATIONSHIP',
        payload: updatedRelationship,
      });
      emitRelationshipUpdated(updatedRelationship);

      if (initialRelationship) {
        pushCommand({
          undo: async () => {
            const undoPayload = {
              type: initialRelationship.type,
              source: initialRelationship.source,
              target: initialRelationship.target,
              label: initialRelationship.data?.label,
              srcMultiplicity: initialRelationship.data?.srcMultiplicity,
              tgtMultiplicity: initialRelationship.data?.tgtMultiplicity,
            };
            const resUndo = await axios.put(`/api/relationship/${id}?diagramId=${diagramId}`, undoPayload).catch(() => null);
            if (resUndo) {
              relationshipsDispatch({ type: 'UPDATE_RELATIONSHIP', payload: resUndo.data });
              emitRelationshipUpdated(resUndo.data);
            }
          },
          redo: async () => {
            const resRedo = await axios.put(`/api/relationship/${id}?diagramId=${diagramId}`, relationship).catch(() => null);
            if (resRedo) {
              relationshipsDispatch({ type: 'UPDATE_RELATIONSHIP', payload: resRedo.data });
              emitRelationshipUpdated(resRedo.data);
            }
          }
        });
      }

      setAlert('Relación actualizada exitosamente', AlertType.SUCCESS);
      close();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Error');
    }
    setLoading(false);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="Edit Relationship Form"
      aria-describedby="Edit the contents of a relationship"
    >
      <Paper
        component="form"
        className="modal-content relationship-content"
        onSubmit={handleSubmit}
      >
        <div>
          <h2>
            Editar Relación&nbsp;
            <Tooltip title={relationshipHelperText}>
              <HelpOutlineIcon fontSize="small" />
            </Tooltip>
          </h2>
          {errorMessage && (
            <Typography variant="subtitle2" gutterBottom color="error">
              Error: {errorMessage}
            </Typography>
          )}
          {getContentByType(
            relationshipType,
            source,
            setSource,
            target,
            setTarget,
            label,
            setLabel,
            srcMultiplicity,
            setSrcMultiplicity,
            tgtMultiplicity,
            setTgtMultiplicity
          )}
        </div>
        <div className="buttons">
          <Button variant="text" onClick={close} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="text" type="submit" disabled={loading}>
            Aceptar
          </Button>
        </div>
      </Paper>
    </Modal>
  );
}

export default RelationshipModal;
