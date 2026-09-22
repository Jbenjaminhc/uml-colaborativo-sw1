import LinkIcon from '@mui/icons-material/Link';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import {
  Button,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Paper,
} from '@mui/material';
import Modal from '@mui/material/Modal';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CollaboratorManager from '../CollaboratorManager';

type ShareMenuProps = {
  open: boolean;
  handleClose: () => void;
  isEditor: boolean;
};

function ShareMenu({ open, handleClose, isEditor }: ShareMenuProps) {
  const [isPublic, setIsPublic] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);

  const { diagramId } = useParams();

  useEffect(() => {
    const getPrivacy = async () => {
      try {
        const result = await axios.get(`/api/diagram/${diagramId}/privacy`);
        setIsPublic(result.data.isPublic);
      } catch (error) {
        setIsPublic(false);
      }
    };
    if (open && isEditor) getPrivacy();
  }, [diagramId, isEditor, open]);

  const handleSwitch = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await axios.put(`/api/diagram/${diagramId}/privacy`, {
      isPublic: event.target.checked,
    });
    setIsPublic((prev) => !prev);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/${diagramId}/view`
    );
  };

  return (
    <>
      <Modal open={open} onClose={handleClose}>
        <Paper className="modal-content">
          <h2>Compartir este Diagrama</h2>
          <div className="share-menu">
            <div>
              <FormControlLabel
                control={
                  <Switch
                    checked={isPublic || !isEditor}
                    onChange={handleSwitch}
                    disabled={!isEditor}
                  />
                }
                label="Público"
              />
              {isEditor ? (
                <Typography variant="body2">
                  Hacer un diagrama público permite que cualquier usuario pueda
                  ver este diagrama. No permite la edición pública.
                </Typography>
              ) : (
                <Typography variant="body2">
                  Este diagrama puede ser visto públicamente. Copia el enlace
                  abajo
                </Typography>
              )}
              {(isPublic || !isEditor) && (
                <Button
                  variant="outlined"
                  startIcon={<LinkIcon />}
                  onClick={handleCopy}
                  sx={{ marginTop: '1rem', mr: 1 }}
                >
                  Copiar enlace
                </Button>
              )}
              {isEditor && (
                <Button
                  variant="outlined"
                  startIcon={<GroupAddIcon />}
                  onClick={() => setCollabOpen(true)}
                  sx={{ marginTop: '1rem' }}
                >
                  Colaboradores
                </Button>
              )}
            </div>
            <Button
              variant="contained"
              sx={{ marginTop: '1rem', float: 'right' }}
              onClick={handleClose}
            >
              Listo
            </Button>
          </div>
        </Paper>
      </Modal>
      {diagramId && (
        <CollaboratorManager
          open={collabOpen}
          onClose={() => setCollabOpen(false)}
          diagramId={diagramId}
          isOwner={isEditor}
        />
      )}
    </>
  );
}

export default ShareMenu;
