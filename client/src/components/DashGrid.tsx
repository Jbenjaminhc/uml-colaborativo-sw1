import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SchemaIcon from '@mui/icons-material/Schema';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Chip,
  Box,
  Tooltip,
} from '@mui/material';
import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Diagram } from '../types';
import { AlertType } from './alert/AlertContext';
import useAlert from './alert/useAlert';
import RenameModal from './forms/modals/RenameModal';

// Extended type for Diagram to include optional shared info
type DashDiagram = Diagram & {
  ownerId?: string;
  ownerName?: string;
};

type Props = {
  diagrams: DashDiagram[];
  handleDeleteDiagram: (diagramId: string) => void;
  handleRenameDiagram: (diagramId: string, name: string) => void;
};

const parseDate = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

function DashGrid({
  diagrams,
  handleDeleteDiagram,
  handleRenameDiagram,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(
    null
  );
  const open = Boolean(anchorEl);

  const [renameModalName, setRenameModalName] = useState<string | undefined>();
  const [renameDiagramId, setRenameDiagramId] = useState<string | undefined>();

  const navigate = useNavigate();
  const { setAlert } = useAlert();

  const handleOpenMenu = (
    event: React.MouseEvent<HTMLElement>,
    diagramId: string
  ) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedDiagramId(diagramId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedDiagramId(null);
  };

  const handleOpenDiagram = (diagramId: string) => {
    navigate(`/${diagramId}/edit`);
  };

  const handleRename = () => {
    if (!selectedDiagramId) return;
    const diagram = diagrams.find((d) => d.id === selectedDiagramId);
    setRenameDiagramId(selectedDiagramId);
    setRenameModalName(diagram?.name || '');
    handleCloseMenu();
  };

  const handleRenameClose = (name: string | undefined) => {
    if (name && renameDiagramId) {
      handleRenameDiagram(renameDiagramId, name);
    }
    setRenameModalName(undefined);
    setRenameDiagramId(undefined);
  };

  const handleDelete = async () => {
    if (!selectedDiagramId) return;
    try {
      await axios.delete(`/api/diagram/${selectedDiagramId}`);
      setAlert('Diagrama eliminado', AlertType.SUCCESS);
      handleDeleteDiagram(selectedDiagramId);
    } catch (err) {
      setAlert(
        'Error al eliminar el diagrama. Por favor, inténtalo de nuevo.',
        AlertType.ERROR
      );
    }
    handleCloseMenu();
  };

  const currentUserId = localStorage.getItem('userId');

  return (
    <>
      <div className="diagram-grid">
        {diagrams.map((diagram, index) => {
          const isShared = diagram.ownerId && diagram.ownerId !== currentUserId;
          // select a gradient dynamically based on index to make it look colorful
          const gradientClass = `cover-gradient-${(index % 4) + 1}`;

          return (
            <Card key={diagram.id} className="diagram-card">
              <CardActionArea
                onClick={() => handleOpenDiagram(diagram.id)}
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                }}
              >
                <div className={`diagram-card-cover ${gradientClass}`}>
                  <SchemaIcon sx={{ fontSize: 60, opacity: 0.8 }} />
                  {isShared && (
                    <Chip
                      label={`De: ${diagram.ownerName || 'Amigo'}`}
                      size="small"
                      color="secondary"
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        fontWeight: 'bold',
                      }}
                    />
                  )}
                </div>
                <CardContent className="diagram-card-content">
                  <Typography
                    variant="h6"
                    component="div"
                    sx={{
                      fontWeight: 600,
                      mb: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {diagram.name}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      color: 'text.secondary',
                      gap: 0.5,
                    }}
                  >
                    <AccessTimeIcon fontSize="small" />
                    <Typography variant="body2">
                      Modificado el {parseDate(diagram.modified)}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>

              <div className="diagram-card-actions">
                <Tooltip title="Opciones">
                  <IconButton onClick={(e) => handleOpenMenu(e, diagram.id)}>
                    <MoreVertIcon />
                  </IconButton>
                </Tooltip>
              </div>
            </Card>
          );
        })}
      </div>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={() => {
            handleOpenDiagram(selectedDiagramId!);
            handleCloseMenu();
          }}
        >
          <ListItemIcon>
            <OpenInBrowserIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Abrir</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleRename}>
          <ListItemIcon>
            <DriveFileRenameOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Renombrar</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteForeverIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Eliminar</ListItemText>
        </MenuItem>
      </Menu>

      <RenameModal
        prevName={renameModalName}
        handleClose={handleRenameClose}
        diagramId={renameDiagramId as string}
      />
    </>
  );
}

export default DashGrid;
