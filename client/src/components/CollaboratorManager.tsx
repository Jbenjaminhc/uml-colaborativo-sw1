import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Select,
  MenuItem,
  Typography,
  Box,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { CollaboratorInfo } from '../types';
import useAlert from './alert/useAlert';
import { AlertType } from './alert/AlertContext';

interface Props {
  diagramId: string;
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
}

export default function CollaboratorManager({
  diagramId,
  open,
  onClose,
  isOwner,
}: Props) {
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAlert } = useAlert();

  useEffect(() => {
    if (open) {
      fetchCollaborators();
    }
  }, [open, diagramId]);

  const fetchCollaborators = async () => {
    try {
      const res = await axios.get(`/api/diagram/${diagramId}/collaborators`);
      setCollaborators(res.data);
    } catch (error) {
      setAlert('Error al obtener colaboradores', AlertType.ERROR);
    }
  };

  const handleAdd = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await axios.post(`/api/diagram/${diagramId}/collaborators`, {
        email,
        role: 'editor',
      });
      setAlert('Colaborador añadido', AlertType.SUCCESS);
      setEmail('');
      fetchCollaborators();
    } catch (error: any) {
      setAlert(
        error.response?.data?.message || 'Error al añadir colaborador',
        AlertType.ERROR
      );
    }
    setLoading(false);
  };

  const handleRemove = async (userId: string) => {
    try {
      await axios.delete(`/api/diagram/${diagramId}/collaborators/${userId}`);
      setAlert('Colaborador eliminado', AlertType.SUCCESS);
      fetchCollaborators();
    } catch (error) {
      setAlert('Error al eliminar colaborador', AlertType.ERROR);
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    try {
      await axios.put(`/api/diagram/${diagramId}/collaborators/${userId}`, {
        role,
      });
      setAlert('Rol actualizado', AlertType.SUCCESS);
      fetchCollaborators();
    } catch (error) {
      setAlert('Error al actualizar rol', AlertType.ERROR);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Gestionar Colaboradores</DialogTitle>
      <DialogContent>
        {isOwner && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 3 }}>
            <TextField
              size="small"
              label="Email del usuario"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              variant="contained"
              onClick={handleAdd}
              disabled={loading || !email}
            >
              Añadir
            </Button>
          </Box>
        )}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Colaboradores actuales
        </Typography>
        <List>
          {collaborators.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No hay colaboradores
            </Typography>
          )}
          {collaborators.map((collab) => (
            <ListItem key={collab.userId}>
              <ListItemText
                primary={collab.username}
                secondary={collab.email}
              />
              <ListItemSecondaryAction
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Select
                  size="small"
                  value={collab.role}
                  onChange={(e) =>
                    handleChangeRole(collab.userId, e.target.value)
                  }
                  disabled={!isOwner}
                >
                  <MenuItem value="editor">Editor</MenuItem>
                  <MenuItem value="viewer">Viewer</MenuItem>
                </Select>
                {isOwner && (
                  <IconButton
                    edge="end"
                    onClick={() => handleRemove(collab.userId)}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
