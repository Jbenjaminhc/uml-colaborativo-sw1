import React, { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Divider,
  Paper,
  Avatar,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { useSocket } from '../../context/SocketContext';

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function ChatPanel({ open, onClose }: ChatPanelProps) {
  const { chatMessages, sendChatMessage, socket, activeUsers } = useSocket();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const currentUser = socket ? activeUsers.find((u) => u.socketId === socket.id) : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [chatMessages, open]);

  const handleSend = () => {
    if (inputValue.trim() !== '') {
      sendChatMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="persistent"
      sx={{
        width: 320,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 320,
          boxSizing: 'border-box',
          top: 70, // Evita sobreponerse al header principal si está fixed, aunque aquí le daremos zIndex alto o lo ajustaremos.
          height: 'calc(100% - 70px)',
          borderLeft: `1px solid ${theme.palette.divider}`,
          boxShadow: '-2px 0 8px rgba(0,0,0,0.05)',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight="bold">
          Live Chat
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#f5f5f5'
        }}
      >
        {chatMessages.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
            No hay mensajes aún. ¡Escribe algo para saludar!
          </Typography>
        ) : (
          chatMessages.map((msg) => {
            const isMe = msg.userId === currentUser?.userId;
            return (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                {!isMe && (
                  <Typography variant="caption" sx={{ ml: 1, color: msg.color, fontWeight: 'bold' }}>
                    {msg.username}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', maxWidth: '85%' }}>
                  {!isMe && (
                    <Avatar sx={{ width: 24, height: 24, bgcolor: msg.color, fontSize: 12 }}>
                      {msg.username.charAt(0).toUpperCase()}
                    </Avatar>
                  )}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: isMe ? theme.palette.primary.main : 'background.paper',
                      color: isMe ? 'primary.contrastText' : 'text.primary',
                      border: isMe ? 'none' : `1px solid ${theme.palette.divider}`,
                      borderBottomRightRadius: isMe ? 4 : undefined,
                      borderBottomLeftRadius: !isMe ? 4 : undefined,
                      wordBreak: 'break-word'
                    }}
                  >
                    <Typography variant="body2">{msg.text}</Typography>
                  </Paper>
                </Box>
              </Box>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Escribe un mensaje..."
            variant="outlined"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            multiline
            maxRows={3}
            autoFocus
          />
          <IconButton 
            color="primary" 
            onClick={handleSend} 
            disabled={inputValue.trim() === ''}
            sx={{ alignSelf: 'flex-end' }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Drawer>
  );
}
