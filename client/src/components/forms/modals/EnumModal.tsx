import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import {
  Box,
  Button,
  Modal,
  Tab,
  TextField,
  Tooltip,
  Paper,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEntitiesDispatch } from '../../../context/EntitiesContext';
import '../../../styles/FormModals.css';
import { useSocket } from '../../../context/SocketContext';
import { Entity, Enum, EnumValue } from '../../../types';
import { AlertType } from '../../alert/AlertContext';
import useAlert from '../../alert/useAlert';
import ValuesInput from '../inputs/ValuesInput';
import { removeWhiteSpace } from './utils';

type EnumModalProps = {
  open: boolean;
  handleClose: () => void;
  // defined only when editing existing enum
  id?: string;
  data?: Enum;
};

const enumHelperText = `Las enumeraciones son un conjunto de constantes. Úselas para definir un conjunto de valores que se pueden usar en su programa. 
No puede asignar valores literales a cada constante en esta aplicación.`;

function EnumModal({ open, handleClose, id, data }: EnumModalProps) {
  const [name, setName] = useState(data?.name || '');
  const [values, setValues] = useState<EnumValue[]>(data?.values || []);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    'Ningún campo puede estar vacío'
  );
  const [loading, setLoading] = useState(false);

  const entitiesDispatch = useEntitiesDispatch();
  const { diagramId } = useParams();
  const { setAlert } = useAlert();
  const { emitEntityCreated, emitEntityUpdated } = useSocket();

  useEffect(() => {
    setLoading(true);
    if (data) {
      setName(data.name);
      setValues(data.values || []);
    }
    setLoading(false);
  }, [data]);

  const close = () => {
    // reset all fields
    // dont reset if editing
    if (!id || !data) {
      setName('');
      setValues([]);
    } else {
      setName(data.name);
      setValues(data.values || []);
    }
    setError(false);
    handleClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoading(true);

    const enumer = {
      name: removeWhiteSpace(name),
      values: values.map((v) => ({ ...v, name: removeWhiteSpace(v.name) })),
    };
    if (id) {
      // editing
      try {
        const res = await axios.put(
          `/api/enum/${id}?diagramId=${diagramId}`,
          enumer
        );
        const updatedEnum = (await res.data) as Entity;
        entitiesDispatch({ type: 'UPDATE_ENTITY', payload: updatedEnum });
        emitEntityUpdated(updatedEnum);
        setAlert('Enumeración actualizada exitosamente', AlertType.SUCCESS);
        close();
      } catch (err: any) {
        setError(true);
        setErrorMessage(err.response?.data?.message || 'Error');
      }
    } else {
      // creating
      try {
        const res = await axios.post(
          `/api/enum?diagramId=${diagramId}`,
          enumer
        );
        const newEnum = (await res.data) as Entity;
        entitiesDispatch({ type: 'ADD_ENTITY', payload: newEnum });
        emitEntityCreated(newEnum);
        setAlert('Enumeración creada exitosamente', AlertType.SUCCESS);
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
      aria-labelledby="Enum Form"
      aria-describedby="Specify the contents of a enum"
    >
      <Paper component="form" className="modal-content entity-content" onSubmit={handleSubmit}>
        <div>
          <h2>
            {id ? 'Editar' : 'Crear'} Enumeración&nbsp;
            <Tooltip title={enumHelperText}>
              <InfoOutlinedIcon fontSize="small" />
            </Tooltip>
          </h2>
          <TextField
            variant="standard"
            label="Nombre de la Enumeración"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            error={error}
            helperText={error ? errorMessage : ''}
          />
          <TabContext value="1">
            <Box
              sx={{ borderBottom: 1, borderColor: 'divider', paddingTop: 2.5 }}
            >
              <TabList aria-label="add properties to enum">
                <Tab label="Valores" value="1" />
              </TabList>
            </Box>
            <TabPanel value="1" sx={{ padding: 0, paddingTop: '1em' }}>
              <ValuesInput values={values} setValues={setValues} />
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

export default EnumModal;
