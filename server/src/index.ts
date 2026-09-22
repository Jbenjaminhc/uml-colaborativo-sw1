import dotenv from 'dotenv';
import http from 'http';
import app from './app';
import connectDB from './db';
import { initializeSocketIO } from './socket';

dotenv.config();

const start = (port: number) => {
  try {
    const httpServer = http.createServer(app);
    const io = initializeSocketIO(httpServer);
    app.set('io', io);
    httpServer.listen(port, () => {
      console.log(`Server listening on ${port}`);
    });
    connectDB();
  } catch (err) {
    console.error(err);
    process.exit();
  }
};

start(parseInt(process.env.PORT || '5000', 10));
