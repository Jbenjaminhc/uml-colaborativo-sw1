import { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Divider,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LoadingButton from '@mui/lab/LoadingButton';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashHeader from '../header/DashHeader';
import useAlert from '../alert/useAlert';
import { AlertType } from '../alert/AlertContext';
import { setDocumentTitle } from '../../utils';

function Profile() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { setAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  setDocumentTitle('Mi Perfil');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      setUsername(res.data.username);
      setEmail(res.data.email);
    } catch (err) {
      setAlert('Error al cargar el perfil', AlertType.ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await axios.put('/api/user/profile', { username, email }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      localStorage.setItem('username', res.data.username);
      setAlert('Perfil actualizado correctamente', AlertType.SUCCESS);
    } catch (err: any) {
      setAlert(err.response?.data?.message || 'Error al actualizar el perfil', AlertType.ERROR);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setAlert('Las contraseñas no coinciden', AlertType.ERROR);
      return;
    }
    setSavingPassword(true);
    try {
      await axios.put('/api/user/password', { currentPassword, newPassword }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      setAlert('Contraseña actualizada correctamente', AlertType.SUCCESS);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setAlert(err.response?.data?.message || 'Error al actualizar contraseña', AlertType.ERROR);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await axios.delete('/api/user/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      setAlert('Cuenta eliminada exitosamente', AlertType.SUCCESS);
      navigate('/');
    } catch (err: any) {
      setAlert(err.response?.data?.message || 'Error al eliminar la cuenta', AlertType.ERROR);
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <DashHeader />
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography>Cargando perfil...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <DashHeader />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ mb: 2, textTransform: 'none' }}
          color="inherit"
        >
          Volver al Dashboard
        </Button>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
          Mi Perfil
        </Typography>

        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
            Información de la Cuenta
          </Typography>
          <form onSubmit={handleUpdateProfile}>
            <TextField
              label="Nombre de Usuario"
              variant="outlined"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 3 }}
              required
            />
            <TextField
              label="Correo Electrónico"
              variant="outlined"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 3 }}
              required
            />
            <LoadingButton
              type="submit"
              variant="contained"
              loading={savingProfile}
              sx={{ textTransform: 'none', fontWeight: 'bold' }}
            >
              Guardar Cambios
            </LoadingButton>
          </form>
        </Paper>

        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
            Seguridad
          </Typography>
          <form onSubmit={handleUpdatePassword}>
            <TextField
              label="Contraseña Actual"
              variant="outlined"
              type="password"
              fullWidth
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              sx={{ mb: 3 }}
              required
            />
            <TextField
              label="Nueva Contraseña"
              variant="outlined"
              type="password"
              fullWidth
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              sx={{ mb: 3 }}
              required
              inputProps={{ minLength: 8 }}
            />
            <TextField
              label="Confirmar Nueva Contraseña"
              variant="outlined"
              type="password"
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              sx={{ mb: 3 }}
              required
              inputProps={{ minLength: 8 }}
            />
            <LoadingButton
              type="submit"
              variant="contained"
              loading={savingPassword}
              sx={{ textTransform: 'none', fontWeight: 'bold' }}
            >
              Cambiar Contraseña
            </LoadingButton>
          </form>
        </Paper>

        <Paper elevation={3} sx={{ p: 4, borderRadius: 2, border: '1px solid', borderColor: 'error.main' }}>
          <Typography variant="h6" fontWeight="bold" color="error" sx={{ mb: 2 }}>
            Zona de Peligro
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Una vez que elimines tu cuenta, no hay vuelta atrás. Todos tus diagramas y datos asociados serán eliminados permanentemente. Por favor, asegúrate de estar seguro.
          </Typography>
          <Button
            variant="outlined"
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 'bold' }}
          >
            Eliminar mi cuenta
          </Button>
        </Paper>
      </Container>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>¿Estás completamente seguro?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Esta acción no se puede deshacer. Esto eliminará permanentemente tu cuenta
            y todos tus diagramas.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancelar
          </Button>
          <LoadingButton
            color="error"
            onClick={handleDeleteAccount}
            loading={deleting}
          >
            Sí, eliminar mi cuenta
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Profile;
