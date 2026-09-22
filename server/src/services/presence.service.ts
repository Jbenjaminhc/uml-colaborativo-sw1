export interface ActiveUser {
  userId: string;
  username: string;
  socketId: string;
  color: string;
  activity?: {
    action: string;
    target?: string;
  };
}

const COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
];

class PresenceService {
  // Map<diagramId, Map<socketId, ActiveUser>>
  private rooms: Map<string, Map<string, ActiveUser>> = new Map();

  addUser(diagramId: string, user: Omit<ActiveUser, 'color'>): ActiveUser {
    if (!this.rooms.has(diagramId)) {
      this.rooms.set(diagramId, new Map());
    }

    const room = this.rooms.get(diagramId)!;

    // Assign a color based on the number of users currently in the room
    const colorIndex = room.size % COLORS.length;
    const color = COLORS[colorIndex];

    const activeUser = { ...user, color };
    room.set(user.socketId, activeUser);

    return activeUser;
  }

  removeUser(diagramId: string, socketId: string): void {
    const room = this.rooms.get(diagramId);
    if (room) {
      room.delete(socketId);
      if (room.size === 0) {
        this.rooms.delete(diagramId);
      }
    }
  }

  getActiveUsers(diagramId: string): ActiveUser[] {
    const room = this.rooms.get(diagramId);
    if (!room) return [];

    return Array.from(room.values());
  }

  updateUserActivity(
    diagramId: string,
    socketId: string,
    activity: { action: string; target?: string }
  ): void {
    const room = this.rooms.get(diagramId);
    if (room) {
      const user = room.get(socketId);
      if (user) {
        user.activity = activity;
      }
    }
  }

  getRoomsForSocket(socketId: string): string[] {
    const rooms: string[] = [];
    for (const [diagramId, room] of this.rooms.entries()) {
      if (room.has(socketId)) {
        rooms.push(diagramId);
      }
    }
    return rooms;
  }
}

export const presenceService = new PresenceService();
