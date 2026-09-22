import { Avatar, AvatarGroup, Tooltip, Badge, Box, Typography, styled } from '@mui/material';
import { useSocket } from '../context/SocketContext';
import { ActiveUser } from '../types';

const StyledBadge = styled(Badge)<{ dotcolor: string }>(({ dotcolor }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    color: '#44b700',
    boxShadow: `0 0 0 2px white`,
  },
}));

export default function ActiveUsersIndicator() {
  const { activeUsers, socket } = useSocket();

  if (activeUsers.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
      <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 32, height: 32, fontSize: 14 } }}>
        {activeUsers.map((user: ActiveUser) => {
          const isMe = user.socketId === socket?.id;
          return (
          <Tooltip 
            key={user.socketId} 
            title={
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 0.5 }}>
                <Typography variant="body2" fontWeight="bold">
                  {user.username} {isMe && '(Tú)'}
                </Typography>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span style={{ color: user.activity ? '#44b700' : 'gray' }}>●</span>
                  {user.activity ? `${user.activity.action} ${user.activity.target || ''}` : 'Observando'}
                </Typography>
              </Box>
            }
            arrow
            placement="bottom"
          >
            <StyledBadge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              variant="dot"
              dotcolor={user.color}
            >
              <Avatar
                sx={{
                  bgcolor: 'white',
                  color: user.color,
                  boxShadow: `inset 0 0 0 2px ${user.color}`,
                  border: '2px solid white',
                  fontWeight: 'bold',
                }}
              >
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
            </StyledBadge>
          </Tooltip>
          );
        })}
      </AvatarGroup>
    </Box>
  );
}
