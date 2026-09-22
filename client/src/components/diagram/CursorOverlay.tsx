import { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useViewport } from 'reactflow';

export default function CursorOverlay() {
  const { socket, activeUsers } = useSocket();
  const { x, y, zoom } = useViewport();
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number; lastUpdate: number }>>({});

  useEffect(() => {
    if (!socket) return;

    const handleCursorMove = ({ socketId, x: cursorX, y: cursorY }: { socketId: string, x: number, y: number }) => {
      setCursors(prev => ({
        ...prev,
        [socketId]: { x: cursorX, y: cursorY, lastUpdate: Date.now() }
      }));
    };

    socket.on('cursor:move', handleCursorMove);
    return () => {
      socket.off('cursor:move', handleCursorMove);
    };
  }, [socket]);

  // Limpiar cursores inactivos después de 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors(prev => {
        let changed = false;
        const next = { ...prev };
        for (const [id, data] of Object.entries(next)) {
          if (now - data.lastUpdate > 5000) {
            delete next[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1000, overflow: 'hidden' }}>
      <div style={{ transform: `translate(${x}px, ${y}px) scale(${zoom})`, transformOrigin: '0 0', width: '100%', height: '100%' }}>
        {Object.entries(cursors).map(([socketId, pos]) => {
          const user = activeUsers.find(u => u.socketId === socketId);
          if (!user) return null;
          
          return (
            <div 
              key={socketId} 
              style={{ 
                position: 'absolute', 
                left: pos.x, 
                top: pos.y, 
                // Añadir una pequeña transición para que el movimiento se vea más fluido
                transition: 'left 0.05s linear, top 0.05s linear' 
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={user.color} stroke="white" strokeWidth="2" style={{ filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.3))' }}>
                <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.42c.45 0 .67-.54.35-.85L5.5 3.21z" />
              </svg>
              <div style={{ 
                backgroundColor: user.color, 
                color: 'white', 
                padding: '4px 10px', 
                borderRadius: '16px', 
                fontSize: '13px', 
                fontWeight: 'bold', 
                marginTop: '2px',
                marginLeft: '12px',
                whiteSpace: 'nowrap',
                width: 'fit-content',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}>
                {user.username}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
