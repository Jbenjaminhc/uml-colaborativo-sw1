import LoadingButton from '@mui/lab/LoadingButton';
import { TextField, Typography, Paper, Box, useTheme } from '@mui/material';
import axios from 'axios';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/UML2.png';
import '../../styles/Login.css';
import { setDocumentTitle } from '../../utils';

function Login() {
  const email = useRef<HTMLInputElement>();
  const password = useRef<HTMLInputElement>();
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const theme = useTheme();
  setDocumentTitle('Login');

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(false);
    if (email.current?.value) {
      // call api to get diagram
      try {
        await axios
          .post(`/api/auth/login`, {
            email: email.current?.value,
            password: password.current?.value,
          })
          .then((res) => {
            localStorage.setItem('authToken', res.data.authToken);
            localStorage.setItem('userId', res.data.userId);
            localStorage.setItem('username', res.data.username);
            navigate(`/dashboard`);
          })
          .catch((err) => {
            if (err.response.data.message === 'User not verified') {
              // eslint-disable-next-line no-param-reassign
              err.response.data.message =
                'Usuario no verificado. Por favor revisa tu correo para el enlace de verificación.';
              axios.get(
                `/api/auth/resend-verification-email/${email.current?.value}`
              );
            }
            setError(true);
            setErrorMessage(err.response.data.message);
          });
      } catch (err) {
        setError(true);
        setErrorMessage('El servidor no responde');
      }
    } else {
      setError(true);
      setErrorMessage('Por favor ingresa tu correo');
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    navigate('/signup');
  };

  return (
    <Box className="auth-page" sx={{ backgroundColor: 'background.default' }}>
      <Paper className="start-menu" elevation={3}>
        <div>
          <img src={logo} className="logo" alt="UML2Code Logo" />
          <Typography variant="h5" fontWeight="bold" sx={{ mt: 1, mb: 2 }}>
            ¡Bienvenido de nuevo!
          </Typography>
        </div>
        <form className="start-form" onSubmit={handleLogin}>
          <TextField
            inputRef={email}
            label="Correo Electrónico"
            variant="outlined"
            type="email"
            fullWidth
            required
            error={error}
            helperText={error ? errorMessage : ''}
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
          <LoadingButton
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            loading={loading}
            loadingIndicator="Cargando…"
            sx={{ borderRadius: '12px', py: 1.2, mt: 1, textTransform: 'none', fontSize: '1.05rem', fontWeight: 'bold' }}
          >
            Iniciar Sesión
          </LoadingButton>
          <Typography variant="body2" color="text.secondary">
            ¿Olvidaste tu contraseña?{' '}
            <Link to="/send-reset-password" style={{ color: theme.palette.primary.main, textDecoration: 'none', fontWeight: 500 }}>
              Restablécela aquí
            </Link>
          </Typography>
        </form>
        
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', color: theme.palette.text.secondary }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: theme.palette.divider }} />
          <span style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>O</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: theme.palette.divider }} />
        </div>

        <LoadingButton
          variant="outlined"
          size="large"
          fullWidth
          loading={loading}
          onClick={handleSignup}
          sx={{ borderRadius: '12px', py: 1.2, textTransform: 'none', fontSize: '1.05rem', fontWeight: 'bold' }}
        >
          Crear cuenta nueva
        </LoadingButton>
      </Paper>
    </Box>
  );
}

export default Login;
