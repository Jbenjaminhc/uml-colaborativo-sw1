import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Modal,
  Paper,
  Tab,
  TextField,
  Tooltip,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEntitiesDispatch } from '../../../context/EntitiesContext';
import '../../../styles/FormModals.css';
import { useSocket } from '../../../context/SocketContext';
import { useHistory } from '../../../context/HistoryContext';
import { Attribute, Constant, Entity, Klass, Method } from '../../../types';
import { AlertType } from '../../alert/AlertContext';
import useAlert from '../../alert/useAlert';
import AttributesInput from '../inputs/AttributesInput';
import ConstantsInput from '../inputs/ConstantsInput';
import MethodsInput from '../inputs/MethodsInput';
import { removeWhiteSpace } from './utils';

type ClassModalProps = {
  open: boolean;
  handleClose: () => void;
  // defined only when editing existing class
  id?: string;
  data?: Klass;
};

const classHelperText = `Las clases son los componentes básicos de su programa. 
  Contienen un nombre y pueden tener constantes, atributos y métodos. Si es abstracta, marque la casilla Abstracta.\n
  Notas: Las constantes siempre son estáticas, se recomienda que los atributos sean privados y no puede especificar parámetros para los métodos.`;

function ClassModal({ open, handleClose, id, data }: ClassModalProps) {
  const [tabValue, setTabValue] = useState('1');
  const [name, setName] = useState(data?.name || '');
  const [isAbstract, setIsAbstract] = useState(data?.isAbstract || false);
  const [constants, setConstants] = useState<Constant[]>(data?.constants || []);
  const [attributes, setAttributes] = useState<Attribute[]>(
    data?.attributes || []
  );
  const [methods, setMethods] = useState<Method[]>(data?.methods || []);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    'Ningún campo puede estar vacío'
  );
  const [loading, setLoading] = useState(false);

  const entitiesDispatch = useEntitiesDispatch();
  const { diagramId } = useParams();
  const { setAlert } = useAlert();
  const { emitEntityCreated, emitEntityUpdated, emitEntityDeleted } = useSocket();
  const { pushCommand } = useHistory();

  useEffect(() => {
    setLoading(true);
    if (data) {
      setName(data.name);
      setIsAbstract(data.isAbstract);
      setConstants(data.constants || []);
      setAttributes(data.attributes || []);
      setMethods(data.methods || []);
    }
    setLoading(false);
  }, [data]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
  };

  const close = () => {
    // reset all fields
    // dont reset if editing
    if (!id || !data) {
      setName('');
      setIsAbstract(false);
      setConstants([]);
      setAttributes([]);
      setMethods([]);
    } else {
      setName(data.name);
      setIsAbstract(data.isAbstract);
      setConstants(data.constants || []);
      setAttributes(data.attributes || []);
      setMethods(data.methods || []);
    }
    setTabValue('1');
    setError(false);
    handleClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(false);
    setLoading(true);

    const klass: Klass = {
      name: removeWhiteSpace(name),
      isAbstract,
      constants: constants.map((constant) => ({
        ...constant,
        name: removeWhiteSpace(constant.name),
      })),
      attributes: attributes.map((attribute) => ({
        ...attribute,
        name: removeWhiteSpace(attribute.name),
      })),
      methods: methods.map((method) => ({
        ...method,
        name: removeWhiteSpace(method.name),
      })),
    };
    if (id) {
      // editing existing class
      try {
        const res = await axios.put(
          `/api/class/${id}?diagramId=${diagramId}`,
          klass
        );
        const updatedKlass = res.data as Entity;
        entitiesDispatch({ type: 'UPDATE_ENTITY', payload: updatedKlass });
        emitEntityUpdated(updatedKlass);

        const previousState = data;
        if (previousState) {
          pushCommand({
            undo: async () => {
              const resUndo = await axios.put(`/api/class/${id}?diagramId=${diagramId}`, previousState).catch(() => null);
              if (resUndo) {
                entitiesDispatch({ type: 'UPDATE_ENTITY', payload: resUndo.data });
                emitEntityUpdated(resUndo.data);
              }
            },
            redo: async () => {
              const resRedo = await axios.put(`/api/class/${id}?diagramId=${diagramId}`, klass).catch(() => null);
              if (resRedo) {
                entitiesDispatch({ type: 'UPDATE_ENTITY', payload: resRedo.data });
                emitEntityUpdated(resRedo.data);
              }
            }
          });
        }

        setAlert('Clase actualizada exitosamente', AlertType.SUCCESS);
        close();
      } catch (err: any) {
        setError(true);
        setErrorMessage(err.response?.data?.message || 'Error');
      }
    } else {
      // adding new class
      try {
        const res = await axios.post(
          `/api/class?diagramId=${diagramId}`,
          klass
        );
        const newKlass = res.data as Entity;
        entitiesDispatch({ type: 'ADD_ENTITY', payload: newKlass });
        emitEntityCreated(newKlass);

        pushCommand({
          undo: async () => {
            await axios.delete(`/api/entity/${newKlass.id}?diagramId=${diagramId}`).catch(() => null);
            entitiesDispatch({ type: 'DELETE_ENTITY', id: newKlass.id });
            emitEntityDeleted(newKlass.id);
          },
          redo: async () => {
            // We pass id to explicitly preserve it!
            const payloadWithId = { ...klass, id: newKlass.id };
            const resRedo = await axios.post(`/api/class?diagramId=${diagramId}`, payloadWithId).catch(() => null);
            if (resRedo) {
              entitiesDispatch({ type: 'ADD_ENTITY', payload: resRedo.data });
              emitEntityCreated(resRedo.data);
            }
          }
        });

        setAlert('Clase creada exitosamente', AlertType.SUCCESS);
        close();
      } catch (err: any) {
        setError(true);
        setErrorMessage(err.response?.data?.message || 'Error');
      }
    }
    setLoading(false);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="Class Form"
      aria-describedby="Specify the contents of a class"
    >
      <Paper component="form" className="modal-content entity-content" onSubmit={handleSubmit}>
        <div>
          <h2>
            {id ? 'Editar' : 'Crear'} Clase&nbsp;
            <Tooltip title={classHelperText}>
              <InfoOutlinedIcon fontSize="small" />
            </Tooltip>
          </h2>
          <TextField
            variant="standard"
            label="Nombre de la Clase"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            error={error}
            helperText={error ? errorMessage : ''}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={isAbstract}
                onChange={(e) => setIsAbstract(e.target.checked)}
                sx={{ paddingLeft: 2 }}
              />
            }
            label="Abstracta"
          />
          <TabContext value={tabValue}>
            <Box
              sx={{ borderBottom: 1, borderColor: 'divider', paddingTop: 2.5 }}
            >
              <TabList
                onChange={handleTabChange}
                aria-label="añadir propiedades a la clase"
              >
                <Tab label="Constantes" value="1" />
                <Tab label="Atributos" value="2" />
                <Tab label="Métodos" value="3" />
              </TabList>
            </Box>
            <TabPanel value="1" sx={{ padding: 0, paddingTop: '1em' }}>
              <ConstantsInput
                constants={constants}
                setConstants={setConstants}
              />
            </TabPanel>
            <TabPanel value="2" sx={{ padding: 0, paddingTop: '1em' }}>
              <AttributesInput
                attributes={attributes}
                setAttributes={setAttributes}
              />
            </TabPanel>
            <TabPanel value="3" sx={{ padding: 0, paddingTop: '1em' }}>
              <MethodsInput methods={methods} setMethods={setMethods} />
            </TabPanel>
          </TabContext>
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

export default ClassModal;
