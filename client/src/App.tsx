import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import React, { createContext, useMemo, useState } from 'react';
import axios from 'axios';
import { Route, Routes } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';
import Home from './components/Home';
import NotFound from './components/NotFound';
import Viewer from './components/Viewer';
import AlertToast from './components/alert/Alert';
import { AlertProvider } from './components/alert/AlertContext';
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ResetPassword from './components/auth/ResetPassword';
import SendResetPassword from './components/auth/SendResetPassword';
import Signup from './components/auth/Signup';
import Verify from './components/auth/Verify';
import Profile from './components/user/Profile';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

function App() {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;

  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('themeMode') as 'light' | 'dark') || 'light';
  });

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', newMode);
          return newMode;
        });
      },
    }),
    [],
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#5364FE',
          },
        },
        shape: {
          borderRadius: 8,
        },
      }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AlertProvider>
          <AlertToast />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/send-reset-password" element={<SendResetPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/:diagramId/edit" element={<Editor />} />
              <Route path="/:diagramId/view" element={<Viewer />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AlertProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
