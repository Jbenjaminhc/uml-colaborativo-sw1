import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions } from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { initializeSocketIO } from '../../src/socket';
import { UserModel } from '../../src/models/user.model';
import { DiagramModel } from '../../src/models/diagram.model';
import { EntityModel } from '../../src/models/entity.model';

let mongoServer: MongoMemoryServer;
let httpServer: http.Server;
let io: Server;
let serverSocket: any;
let clientSocketA: ClientSocket;
let clientSocketB: ClientSocket;

let userA: any;
let userB: any;
let tokenA: string;
let tokenB: string;
let diagramId: string;

const port = 5001; // Port for testing

beforeAll(async () => {
  // 1. Setup in-memory DB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);

  // 2. Mock JWT Secret
  process.env.JWT_SECRET = 'test_secret';

  // 3. Create HTTP & Socket Server
  httpServer = http.createServer(app);
  io = initializeSocketIO(httpServer);
  app.set('io', io);

  await new Promise<void>((resolve) => {
    httpServer.listen(port, () => {
      resolve();
    });
  });

  // 4. Create Users
  userA = await UserModel.create({
    username: 'userA',
    email: 'userA@email.com',
    password: 'password',
    verified: true, // Need verified true for socket auth
  });

  userB = await UserModel.create({
    username: 'userB',
    email: 'userB@email.com',
    password: 'password',
    verified: true,
  });

  // 5. Generate Tokens
  tokenA = jwt.sign(
    { userId: userA._id, type: 'auth' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  tokenB = jwt.sign(
    { userId: userB._id, type: 'auth' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 6. Create Diagram and add User B as collaborator
  const diagram = await DiagramModel.create({
    userId: userA._id,
    isPublic: false,
    name: 'Socket Test Diagram',
    collaborators: [
      {
        userId: userB._id,
        role: 'editor',
        addedAt: new Date(),
      },
    ],
  });
  diagramId = diagram._id.toString();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
  io.close();
  httpServer.close();
});

beforeEach(async () => {
  // Connect both clients
  clientSocketA = Client(`http://localhost:${port}`, {
    auth: { token: tokenA },
    transports: ['websocket'],
  });

  clientSocketB = Client(`http://localhost:${port}`, {
    auth: { token: tokenB },
    transports: ['websocket'],
  });

  // Wait for both to connect
  await Promise.all([
    new Promise<void>((resolve) => clientSocketA.on('connect', resolve)),
    new Promise<void>((resolve) => clientSocketB.on('connect', resolve)),
  ]);
});

afterEach(() => {
  if (clientSocketA.connected) clientSocketA.disconnect();
  if (clientSocketB.connected) clientSocketB.disconnect();
});

describe('Socket.io Real-Time Collaboration', () => {
  it('should allow both users to join diagram and receive presence update', (done) => {
    const presenceUpdates = 0;

    // Both users join
    clientSocketA.emit('diagram:join', { diagramId });
    clientSocketB.emit('diagram:join', { diagramId });

    clientSocketA.on('diagram:presence-updated', (activeUsers) => {
      // The final state should have 2 active users
      if (activeUsers.length === 2) {
        expect(
          activeUsers.some((u: any) => u.username === 'userA')
        ).toBeTruthy();
        expect(
          activeUsers.some((u: any) => u.username === 'userB')
        ).toBeTruthy();
        done();
      }
    });
  });

  it('should broadcast entity:moved to other collaborators', (done) => {
    clientSocketA.emit('diagram:join', { diagramId });
    clientSocketB.emit('diagram:join', { diagramId });

    const entityId = new mongoose.Types.ObjectId().toString();
    const newPosition = { x: 100, y: 200 };

    // Wait for join
    setTimeout(() => {
      clientSocketB.on('entity:moved', (data) => {
        expect(data.entityId).toBe(entityId);
        expect(data.position).toEqual(newPosition);
        done();
      });

      clientSocketA.emit('entity:moved', {
        diagramId,
        entityId,
        position: newPosition,
      });
    }, 100);
  });

  it('should broadcast entity:deleted to other collaborators', (done) => {
    clientSocketA.emit('diagram:join', { diagramId });
    clientSocketB.emit('diagram:join', { diagramId });

    const entityId = new mongoose.Types.ObjectId().toString();

    setTimeout(() => {
      clientSocketB.on('entity:deleted', (receivedEntityId) => {
        expect(receivedEntityId).toBe(entityId);
        done();
      });

      clientSocketA.emit('entity:deleted', { diagramId, entityId });
    }, 100);
  });

  it('should broadcast entity:updated to other collaborators', (done) => {
    clientSocketA.emit('diagram:join', { diagramId });
    clientSocketB.emit('diagram:join', { diagramId });

    const updatedEntity = {
      id: new mongoose.Types.ObjectId().toString(),
      name: 'UpdatedClass',
      type: 'class',
    };

    setTimeout(() => {
      clientSocketB.on('entity:updated', (receivedEntity) => {
        expect(receivedEntity).toEqual(updatedEntity);
        done();
      });

      clientSocketA.emit('entity:updated', {
        diagramId,
        entity: updatedEntity,
      });
    }, 100);
  });
});
