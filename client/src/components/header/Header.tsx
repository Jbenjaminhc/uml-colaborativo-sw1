import BugReportIcon from '@mui/icons-material/BugReport';
import EditIcon from '@mui/icons-material/Edit';
import { Logout } from '@mui/icons-material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ShareIcon from '@mui/icons-material/Share';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CodeIcon from '@mui/icons-material/Code';
import ChatIcon from '@mui/icons-material/Chat';
import SchemaIcon from '@mui/icons-material/Schema';
import DataObjectIcon from '@mui/icons-material/DataObject';
import UploadIcon from '@mui/icons-material/Upload';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '@mui/material/styles';
import {
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  Box,
  Badge,
} from '@mui/material';
import { useSocket } from '../../context/SocketContext';
import { useRef, useEffect } from 'react';
import { useState, useContext } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import logo from '../../assets/UML2.png';
import '../../styles/Header.css';
import RenameModal from '../forms/modals/RenameModal';
import ShareMenu from './ShareMenu';
import ExportSpringBootDialog from '../dialogs/ExportSpringBootDialog';
import { ColorModeContext } from '../../App';
import useAlert from '../alert/useAlert';
import { AlertType } from '../alert/AlertContext';

type HeaderProps = {
  name: string | undefined;
  isEditor?: boolean;
  handleRename?: (name: string) => void;
  children?: React.ReactNode;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
};

function Header({ name, isEditor = false, handleRename, children, onToggleChat, isChatOpen }: HeaderProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [anchorElXmi, setAnchorElXmi] = useState<null | HTMLElement>(null);
  const [openShare, setOpenShare] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [renameModalName, setRenameModalName] = useState<string | undefined>();

  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);

  const user = localStorage.getItem('authToken');
  const navigate = useNavigate();
  const { diagramId } = useParams();
  const { setAlert } = useAlert();

  const handleOpenRename = () => {
    if (isEditor) {
      setRenameModalName(name);
    }
  };

  const handleRenameClose = (newName: string | undefined) => {
    if (newName && handleRename) {
      handleRename(newName);
    }
    setRenameModalName(undefined);
  };

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleShare = () => {
    setOpenShare(true);
    handleClose();
  };

  const handleDocs = () => {
    window.open('https://github.com/jlaksana/UML2Code/wiki', '_blank');
  };

  const handleBug = () => {
    window.open(
      'https://github.com/jlaksana/UML2Code/issues/new?assignees=&labels=&projects=&template=bug_report.md&title=',
      '_blank'
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    handleClose();
    navigate('/');
  };

  const handleExportXmi = async () => {
    if (!diagramId) return;
    setAlert('Exportando XMI...', AlertType.INFO);
    try {
      const response = await axios.get(`/api/diagram/${diagramId}/export/xmi`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `diagram-${diagramId}.xmi`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setAlert('XMI exportado exitosamente', AlertType.SUCCESS);
    } catch (e) {
      setAlert(
        'No se pudo exportar el XMI. Inténtalo de nuevo',
        AlertType.ERROR
      );
    }
  };

  const handleExportJson = async () => {
    if (!diagramId) return;
    setAlert('Exportando JSON...', AlertType.INFO);
    try {
      const response = await axios.get(
        `/api/diagram/${diagramId}/export/json`,
        { responseType: 'blob' }
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

  const handleImportXmi = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (diagramId) formData.append('diagramId', diagramId);

    setAlert('Importando diagrama XMI...', AlertType.INFO);
    try {
      const res = await axios.post('/api/diagram/import/xmi', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAlert('¡Diagrama importado exitosamente!', AlertType.SUCCESS);

      // Si estamos en un diagrama y lo sobreescribimos, recargamos para que React Flow obtenga los nuevos datos
      if (diagramId) {
        window.location.reload();
      } else {
        navigate(`/${res.data.diagramId}/edit`);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Error al importar XMI. Comprueba el formato del archivo.';
      setAlert(msg, AlertType.ERROR);
    }
    event.target.value = '';
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
      const res = await axios.post('/api/diagram/import/json', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAlert('¡Diagrama importado exitosamente!', AlertType.SUCCESS);

      if (diagramId) {
        window.location.reload();
      } else {
        navigate(`/${res.data.diagramId}/edit`);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Error al importar JSON. Comprueba el formato del archivo.';
      setAlert(msg, AlertType.ERROR);
    }
    // reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  return (
    <div
      className="header"
      style={{
        backgroundColor:
          theme.palette.mode === 'dark'
            ? 'rgba(18, 18, 18, 0.85)'
            : 'rgba(255, 255, 255, 0.85)',
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <div className="left" style={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip title="Volver al Dashboard" placement="right">
          <IconButton
            color="inherit"
            onClick={() => navigate('/dashboard')}
            sx={{
              mr: 1,
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
              },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
      </div>
      <div className="center">
        <Tooltip
          title={isEditor ? 'Renombrar diagrama' : ''}
          placement="bottom"
        >
          <div
            className={`header-title-container ${isEditor ? 'editable' : ''}`}
            onClick={handleOpenRename}
          >
            <Typography variant="h6" className="header-title" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              {name || 'Diagrama sin título'}
            </Typography>
            {isEditor && (
              <EditIcon fontSize="small" className="header-edit-icon" />
            )}
          </div>
        </Tooltip>
      </div>
      <div className="right">
        <IconButton
          sx={{ mx: { xs: 0.5, sm: 1 } }}
          onClick={colorMode.toggleColorMode}
          color="inherit"
        >
          {theme.palette.mode === 'dark' ? (
            <Brightness7Icon />
          ) : (
            <Brightness4Icon />
          )}
        </IconButton>
        {user && isEditor && (
          <>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DataObjectIcon />}
              onClick={(e) => setAnchorElXmi(e.currentTarget)}
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                borderRadius: '8px',
                textTransform: 'none',
                px: 2,
                py: 0.5,
                mr: 1,
              }}
            >
              XMI
            </Button>
            <Menu
              anchorEl={anchorElXmi}
              open={Boolean(anchorElXmi)}
              onClose={() => setAnchorElXmi(null)}
            >
              <MenuItem component="label">
                <ListItemIcon>
                  <UploadIcon fontSize="small" />
                </ListItemIcon>
                Importar
                <input
                  type="file"
                  hidden
                  accept=".xmi,.xml"
                  onChange={(e) => {
                    setAnchorElXmi(null);
                    handleImportXmi(e);
                  }}
                />
              </MenuItem>
              <MenuItem onClick={() => { setAnchorElXmi(null); handleExportXmi(); }}>
                <ListItemIcon>
                  <SchemaIcon fontSize="small" />
                </ListItemIcon>
                Exportar
              </MenuItem>
            </Menu>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CodeIcon />}
              onClick={() => setExportDialogOpen(true)}
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                borderRadius: '8px',
                textTransform: 'none',
                px: 2,
                py: 0.5,
                mr: 1,
              }}
            >
              Spring Boot
            </Button>
          </>
        )}
        {children}
        {user && isEditor && (
          <ChatNotificationButton isChatOpen={isChatOpen} onToggleChat={onToggleChat} />
        )}
        {user && (
          <Button
            variant="contained"
            size="small"
            startIcon={<ShareIcon />}
            onClick={handleShare}
            sx={{ 
              borderRadius: '8px', 
              textTransform: 'none', 
              px: { xs: 1, sm: 2 }, 
              py: 0.5,
              mr: { xs: 0.5, sm: 1 },
              minWidth: { xs: 'auto', sm: 'unset' },
              '& .MuiButton-startIcon': { margin: { xs: 0, sm: 'auto' }, marginRight: { sm: 1 } },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Compartir
            </Box>
          </Button>
        )}
        <IconButton
          aria-label="more"
          size="large"
          sx={{ padding: { xs: '8px', sm: '12px' } }}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleOpen}
        >
          <MoreVertIcon />
        </IconButton>
        <Menu
          id="basic-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
        >
          {user && isEditor && [
            <MenuItem key="import-xmi" sx={{ display: { xs: 'flex', md: 'none' } }} component="label">
              <ListItemIcon>
                <UploadIcon fontSize="small" />
              </ListItemIcon>
              Importar XMI
              <input
                type="file"
                hidden
                accept=".xmi,.xml"
                onChange={(e) => {
                  handleClose();
                  handleImportXmi(e);
                }}
              />
            </MenuItem>,
            <MenuItem key="export-xmi" sx={{ display: { xs: 'flex', md: 'none' } }} onClick={() => { handleClose(); handleExportXmi(); }}>
              <ListItemIcon>
                <SchemaIcon fontSize="small" />
              </ListItemIcon>
              Exportar XMI
            </MenuItem>,
            <MenuItem key="export-spring" sx={{ display: { xs: 'flex', md: 'none' } }} onClick={() => { handleClose(); setExportDialogOpen(true); }}>
              <ListItemIcon>
                <CodeIcon fontSize="small" />
              </ListItemIcon>
              Exportar Spring Boot
            </MenuItem>
          ]}
          <MenuItem onClick={handleDocs}>
            <ListItemIcon>
              <MenuBookIcon fontSize="small" />
            </ListItemIcon>
            Documentación
          </MenuItem>
          <MenuItem onClick={handleBug}>
            <ListItemIcon>
              <BugReportIcon fontSize="small" />
            </ListItemIcon>
            Reportar Error
          </MenuItem>
          {user && (
            <MenuItem onClick={() => { handleClose(); navigate('/profile'); }}>
              <ListItemIcon>
                <Box component="span" sx={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" style={{ fontSize: '1.25rem', fill: 'currentColor' }}>
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
                  </svg>
                </Box>
              </ListItemIcon>
              Mi Perfil
            </MenuItem>
          )}
          {user && (
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Cerrar sesión
            </MenuItem>
          )}
        </Menu>
      </div>
      <ShareMenu
        open={openShare}
        handleClose={() => setOpenShare(false)}
        isEditor={isEditor}
      />
      <RenameModal
        prevName={renameModalName}
        handleClose={handleRenameClose}
        diagramId={diagramId as string}
      />
      <ExportSpringBootDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        diagramId={diagramId || ''}
        diagramName={name || ''}
      />
    </div>
  );
}

export default Header;

function ChatNotificationButton({ isChatOpen, onToggleChat }: { isChatOpen?: boolean; onToggleChat?: () => void }) {
  const { chatMessages } = useSocket();
  const [lastReadLength, setLastReadLength] = useState(chatMessages.length);

  // Sync the read counter whenever the chat is open
  useEffect(() => {
    if (isChatOpen) {
      setLastReadLength(chatMessages.length);
    }
  }, [isChatOpen, chatMessages.length]);

  const unreadCount = isChatOpen ? 0 : chatMessages.length - lastReadLength;

  return (
    <Tooltip title="Abrir Live Chat">
      <IconButton onClick={onToggleChat} color="primary" sx={{ mr: 1 }}>
        <Badge badgeContent={Math.max(0, unreadCount)} color="error">
          <ChatIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
