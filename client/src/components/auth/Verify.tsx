import { Typography, Paper, Box, useTheme } from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import logo from '../../assets/UML2.png';
import { setDocumentTitle } from '../../utils';

function Verify() {
  const [verified, setVerified] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  setDocumentTitle('Verify Account');

  useEffect(() => {
    const verifyAccount = async () => {
      try {
        await axios.post('/api/auth/verify', {
          token: searchParams.get('token'),
        });
      } catch (e: any) {
        setVerified(false);
        setErrorMessage(e.response.data.message);
      }
    };
    verifyAccount();
  }, [searchParams]);

  return (
    <Box className="auth-page" sx={{ backgroundColor: 'background.default' }}>
      <Paper className="start-menu" elevation={3}>
        <div>
          <img src={logo} className="logo" alt="UML2Code Logo" />
        </div>
        {verified ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', marginTop: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.1)' : '#e8f5e9', borderRadius: '12px', color: theme.palette.mode === 'dark' ? '#81c784' : '#2e7d32', width: '100%' }}>
              <Typography variant="h6" fontWeight="bold">
                ¡Cuenta verificada exitosamente!
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Ya puedes iniciar sesión en tu cuenta.
              </Typography>
            </div>
            <Link to="/login" style={{ color: theme.palette.primary.main, textDecoration: 'none', fontWeight: 500, marginTop: '1rem' }}>
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <div style={{ padding: '1rem', backgroundColor: theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.1)' : '#ffebee', borderRadius: '12px', color: theme.palette.mode === 'dark' ? '#e57373' : '#c62828', width: '100%', marginTop: '1rem' }}>
            <Typography variant="h6" fontWeight="bold">
              Verificación fallida
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {errorMessage || 'No se pudo verificar tu cuenta. El enlace puede haber expirado.'}
            </Typography>
            <Link to="/login" style={{ display: 'block', color: theme.palette.mode === 'dark' ? '#e57373' : '#c62828', textDecoration: 'underline', fontWeight: 500, marginTop: '1rem' }}>
              Volver al inicio de sesión
            </Link>
          </div>
        )}
      </Paper>
    </Box>
  );
}

export default Verify;
