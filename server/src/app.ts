import compression from 'compression';
import cors from 'cors';
import express from 'express';
import { loggerMiddleware } from './middleware/utilMiddleware';
import authRouter from './routes/auth';
import classRouter from './routes/classes';
import diagramRouter from './routes/diagrams';
import entityRouter from './routes/entity';
import enumRouter from './routes/enums';
import interfaceRouter from './routes/interfaces';
import relationshipRouter from './routes/relationship';
import collaboratorRouter from './routes/collaborator.routes';
import exportRouter from './routes/export.routes';
import userRouter from './routes/user.routes';

const app = express();

// Middleware
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(compression());
app.use(loggerMiddleware);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/diagram', diagramRouter);
app.use('/api/class', classRouter);
app.use('/api/interface', interfaceRouter);
app.use('/api/enum', enumRouter);
app.use('/api/entity', entityRouter);
app.use('/api/relationship', relationshipRouter);
app.use('/api/diagram/:diagramId/collaborators', collaboratorRouter);
app.use('/api/diagram/:diagramId/export', exportRouter);
app.use('/api/user', userRouter);

app.get('/', (req, res) => {
  res.send('Hello World from UML2Code Server!');
});

export default app;
