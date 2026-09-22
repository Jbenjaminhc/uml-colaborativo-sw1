import AddIcon from '@mui/icons-material/Add';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import SearchIcon from '@mui/icons-material/Search';
import UploadIcon from '@mui/icons-material/Upload';
import {
  Box,
  Button,
  LinearProgress,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  InputAdornment,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';
import { io } from 'socket.io-client';
import { setDocumentTitle } from '../utils';
import DashGrid from './DashGrid';
import DashTable from './DashTable';
import { AlertType } from './alert/AlertContext';
import useAlert from './alert/useAlert';
import DashHeader from './header/DashHeader';

function Dashboard() {
  const theme = useTheme();
  // interceptor that adds auth token to every request
  const authToken = localStorage.getItem('authToken');
  axios.defaults.headers.common.Authorization = `Bearer ${authToken}`;

  setDocumentTitle('Dashboard');

  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (
      (localStorage.getItem('dashboardViewMode') as 'grid' | 'list') || 'grid'
    );
  });

  const navigate = useNavigate();
  const { setAlert } = useAlert();

  const handleViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: 'grid' | 'list' | null
  ) => {
    if (newView !== null) {
      setViewMode(newView);
      localStorage.setItem('dashboardViewMode', newView);
    }
  };

  useEffect(() => {
    const getDiagrams = async () => {
      try {
        const res = await axios.get('/api/diagram');
        res.data.sort(
          (a: any, b: any) =>
            new Date(b.modified).getTime() - new Date(a.modified).getTime()
        );
        setDiagrams(res.data);
        setLoading(false);
      } catch (err) {
        setAlert(
          'No se pudieron obtener los diagramas. Por favor, recarga.',
          AlertType.ERROR
        );
      }
    };

    getDiagrams();

    let newSocket: any;
    // Timeout para evitar que React Strict Mode cierre el socket inmediatamente (lo que causa error en consola)
    const timeoutId = setTimeout(() => {
      newSocket = io(import.meta.env.VITE_API_URL, {
        auth: { token: authToken },
        transports: ['websocket', 'polling'],
      });

      newSocket.on('diagram:dashboard-updated', () => {
        getDiagrams(); // refetch when shared or renamed
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (newSocket) newSocket.disconnect();
    };
  }, [setAlert, authToken]);

  const handleImportXmi = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setAlert('Importando diagrama XMI...', AlertType.INFO);
    try {
      const res = await axios.post('/api/diagram/import/xmi', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAlert('¡Diagrama importado exitosamente!', AlertType.SUCCESS);
      navigate(`/${res.data.diagramId}/edit`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al importar XMI. Comprueba el formato del archivo.';
      setAlert(msg, AlertType.ERROR);
    }
    // reset input
    event.target.value = '';
  };

  const handleNew = async () => {
    try {
      const diagram = await axios.post('/api/diagram', {
        userId: localStorage.getItem('userId'),
      });
      navigate(`/${diagram.data.id}/edit`);
      setAlert('¡Nuevo diagrama creado!', AlertType.SUCCESS);
    } catch (err) {
      setAlert(
        'Error al crear nuevo diagrama. Por favor, inténtalo de nuevo.',
        AlertType.ERROR
      );
    }
  };

  const handleDeleteDiagram = (diagramId: string) => {
    setDiagrams(diagrams.filter((diagram: any) => diagram.id !== diagramId));
  };

  const handleRenameDiagram = (diagramId: string, name: string) => {
    setDiagrams(
      diagrams.map((diagram: any) =>
        diagram.id === diagramId ? { ...diagram, name } : diagram
      ) as never[]
    );
  };

  const filteredDiagrams = diagrams.filter((diagram: any) =>
    diagram.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="page"
      style={{ backgroundColor: theme.palette.background.default, minHeight: '100vh' }}
    >
      <DashHeader />
      <div className="dashboard">
        <div className="dashboard-title">
          <div>
            <Typography variant="h4" fontWeight="bold" color="primary.dark">
              Mis Diagramas
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Gestiona y colabora en tus proyectos UML
            </Typography>
          </div>
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            alignItems: { xs: 'stretch', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            flexWrap: 'wrap',
            width: { xs: '100%', md: 'auto' },
            justifyContent: 'flex-end',
            flex: 1
          }}>
            <TextField
              placeholder="Buscar diagramas..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                sx: { backgroundColor: theme.palette.background.paper, borderRadius: '8px' },
              }}
              sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { md: '250px' }, flexGrow: { xs: 1, md: 0 } }}
            />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' }, justifyContent: { xs: 'space-between', sm: 'flex-start' } }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewChange}
                aria-label="view mode"
                size="small"
                sx={{ backgroundColor: theme.palette.background.paper, height: '40px' }}
              >
                <ToggleButton value="list" aria-label="list view">
                  <ViewListIcon />
                </ToggleButton>
                <ToggleButton value="grid" aria-label="grid view">
                  <GridViewIcon />
                </ToggleButton>
              </ToggleButtonGroup>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  component="label"
                  startIcon={<UploadIcon />}
                  sx={{ borderRadius: '8px', textTransform: 'none', px: { xs: 2, sm: 3 }, height: '40px' }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Importar XMI</Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>XMI</Box>
                  <input type="file" hidden accept=".xmi,.xml" onChange={handleImportXmi} />
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleNew}
                  sx={{ borderRadius: '8px', textTransform: 'none', px: { xs: 2, sm: 3 }, height: '40px' }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Nuevo Proyecto</Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Nuevo</Box>
                </Button>
              </Box>
            </Box>
          </Box>
        </div>

        {filteredDiagrams.length === 0 && !loading ? (
          <Box sx={{ mt: 8, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="h6">No se encontraron diagramas</Typography>
            {searchQuery && (
              <Typography variant="body2">
                Prueba buscando con otro término.
              </Typography>
            )}
          </Box>
        ) : viewMode === 'grid' ? (
          <DashGrid
            diagrams={filteredDiagrams}
            handleDeleteDiagram={handleDeleteDiagram}
            handleRenameDiagram={handleRenameDiagram}
          />
        ) : (
          <DashTable
            diagrams={filteredDiagrams}
            handleDeleteDiagram={handleDeleteDiagram}
            handleRenameDiagram={handleRenameDiagram}
          />
        )}

        {loading && (
          <Box sx={{ width: '100%', margin: 5 }}>
            <LinearProgress />
          </Box>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
