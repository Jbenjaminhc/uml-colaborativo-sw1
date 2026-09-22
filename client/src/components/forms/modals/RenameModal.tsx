import { Button, Modal, TextField, Paper } from '@mui/material';
import axios from 'axios';
import { useContext, useRef } from 'react';
import { AlertType } from '../../alert/AlertContext';
import useAlert from '../../alert/useAlert';
import { SocketContext } from '../../../context/SocketContext';

type Props = {
  prevName: string | undefined;
  handleClose: (name: string | undefined) => void;
  diagramId: string;
};

function RenameModal({ prevName, handleClose, diagramId }: Props) {
  const name = useRef<HTMLInputElement>();

  const { setAlert } = useAlert();
  const socketCtx = useContext(SocketContext);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newName = name.current?.value.trim();
      if (!newName) return;
      await axios.put(`/api/diagram/${diagramId}/rename`, {
        name: newName,
      });
      socketCtx?.emitDiagramRenamed(newName);
      setAlert('Diagrama renombrado', AlertType.SUCCESS);
      handleClose(newName);
    } catch (error) {
      setAlert(
        'Error al renombrar el diagrama. Por favor, inténtalo de nuevo.',
        AlertType.ERROR
      );
      handleClose(undefined);
    }
  };

  return (
    <Modal open={prevName !== undefined} onClose={() => handleClose(undefined)}>
      <Paper className="modal-content">
        <h2>Renombrar Diagrama</h2>
        <form className="rename-modal" onSubmit={handleRename}>
          <TextField
            required
            inputRef={name}
            id="rename-name-field"
            label="Nombre"
            variant="outlined"
            defaultValue={prevName}
            fullWidth
          />
          <div className="buttons">
            <Button
              variant="outlined"
              color="primary"
              onClick={() => handleClose(undefined)}
            >
              Cancelar
            </Button>
            <Button variant="contained" color="primary" type="submit">
              Renombrar
            </Button>
          </div>
        </form>
      </Paper>
    </Modal>
  );
}

export default RenameModal;
