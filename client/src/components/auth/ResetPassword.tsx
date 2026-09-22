import LoadingButton from '@mui/lab/LoadingButton';
import { TextField, Typography, Paper, Box, useTheme } from '@mui/material';
import axios from 'axios';
import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import logo from '../../assets/UML2.png';
import { setDocumentTitle } from '../../utils';

function ResetPassword() {
  const password = useRef<HTMLInputElement>();
  const password2 = useRef<HTMLInputElement>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  setDocumentTitle('Reset Password');

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(false);
    try {
      if (password.current?.value !== password2.current?.value) {
        setError(true);
        setErrorMessage('Las contraseñas no coinciden');
        setLoading(false);
        return;
      }
      await axios.put('/api/auth/reset-password', {
        token: searchParams.get('token'),
        password: password.current?.value,
      });
      setLoading(false);
      setSuccess(true);
    } catch (e: any) {
      setError(true);
      setErrorMessage(e.response.data.message);
      setLoading(false);
    }
  };

  return (
    <Box className="auth-page" sx={{ backgroundColor: 'background.default' }}>
      <Paper className="start-menu" elevation={3}>
        <div>
          <img src={logo} className="logo" alt="UML2Code Logo" />
          <Typography variant="h5" fontWeight="bold" sx={{ mt: 1, mb: 1 }}>
            Restablecer contraseña
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ingresa tu nueva contraseña a continuación.
          </Typography>
        </div>
        
        {success ? (
          <div style={{ padding: '1rem', backgroundColor: theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.1)' : '#e8f5e9', borderRadius: '12px', color: theme.palette.mode === 'dark' ? '#81c784' : '#2e7d32', width: '100%', marginBottom: '1rem' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              ¡Contraseña actualizada!
            </Typography>
            <Typography variant="body2">
              Tu contraseña ha sido restablecida exitosamente.
            </Typography>
          </div>
        ) : (
          <form className="start-form" onSubmit={handleReset}>
            <TextField
              inputRef={password}
              label="Nueva Contraseña"
              variant="outlined"
              type="password"
              fullWidth
              required
              error={error}
              helperText={error ? errorMessage : ''}
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
            <TextField
              inputRef={password2}
              label="Reingresar Contraseña"
              variant="outlined"
              type="password"
              fullWidth
              required
              error={error}
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
            <LoadingButton
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              loading={loading}
              loadingIndicator="Cargando…"
              disabled={success}
              sx={{ borderRadius: '12px', py: 1.2, mt: 1, textTransform: 'none', fontSize: '1.05rem', fontWeight: 'bold' }}
            >
              Restablecer contraseña
            </LoadingButton>
          </form>
        )}
        
        <Link to="/login" style={{ color: theme.palette.primary.main, textDecoration: 'none', fontWeight: 500, marginTop: '1rem' }}>
          Volver al inicio de sesión
        </Link>
      </Paper>
    </Box>
  );
}

export default ResetPassword;
