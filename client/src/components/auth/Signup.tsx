import { LoadingButton } from '@mui/lab';
import { Button, Paper, TextField, Typography, Box, useTheme } from '@mui/material';
import axios from 'axios';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/UML2.png';
import '../../styles/Login.css';
import { setDocumentTitle } from '../../utils';

function Signup() {
  const [email, setEmail] = useState('');
  const username = useRef<HTMLInputElement>();
  const password = useRef<HTMLInputElement>();
  const password2 = useRef<HTMLInputElement>();
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  const theme = useTheme();
  setDocumentTitle('Sign Up');

  const handleSignup = async (event: React.FormEvent) => {
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
      await axios.post('/api/auth/signup', {
        email,
        username: username.current?.value,
        password: password.current?.value,
      });
      setShowVerify(true);
      setLoading(false);
    } catch (e: any) {
      setError(true);
      setErrorMessage(e.response.data.message);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await axios.get(`/api/auth/resend-verification-email/${email}`);
    } catch (e: any) {
      setError(true);
      setErrorMessage(e.response.data.message);
    }
  };

  return (
    <Box className="auth-page" sx={{ backgroundColor: 'background.default' }}>
      <Paper className="start-menu" elevation={3}>
        <div>
          <img src={logo} className="logo" alt="UML2Code Logo" />
          <Typography variant="h5" fontWeight="bold" sx={{ mt: 1, mb: 2 }}>
            Crear nueva cuenta
          </Typography>
        </div>
        {showVerify ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
            <Typography variant="h6" color="primary" fontWeight="bold">
              ¡Casi listo!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Por favor verifica tu correo. Recibirás un enlace de verificación en breve.
            </Typography>
            <div style={{ width: '100%', height: '1px', backgroundColor: theme.palette.divider, margin: '1rem 0' }} />
            <Typography variant="body2" color="text.secondary">¿No recibiste el correo?</Typography>
            <Button variant="outlined" onClick={handleResend} fullWidth sx={{ borderRadius: '12px', py: 1 }}>
              Reenviar correo
            </Button>
            <Link to="/login" style={{ color: theme.palette.primary.main, textDecoration: 'none', fontWeight: 500, marginTop: '1rem' }}>
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form className="start-form" onSubmit={handleSignup}>
            <TextField
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              label="Correo Electrónico"
              variant="outlined"
              type="email"
              fullWidth
              required
              error={error}
              helperText={errorMessage}
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
            <TextField
              inputRef={username}
              label="Nombre de Usuario"
              variant="outlined"
              fullWidth
              required
              error={error}
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
            <TextField
              inputRef={password}
              label="Contraseña"
              variant="outlined"
              type="password"
              fullWidth
              required
              error={error}
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
              sx={{ borderRadius: '12px', py: 1.2, mt: 1, textTransform: 'none', fontSize: '1.05rem', fontWeight: 'bold' }}
            >
              Registrarse
            </LoadingButton>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              ¿Ya tienes una cuenta? <Link to="/login" style={{ color: theme.palette.primary.main, textDecoration: 'none', fontWeight: 500 }}>Inicia sesión aquí</Link>
            </Typography>
          </form>
        )}
      </Paper>
    </Box>
  );
}

export default Signup;
