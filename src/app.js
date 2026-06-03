/**
 * Express app factory.
 */
import express from 'express';
import cors    from 'cors';
import apiRoutes        from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGIN || '*'
      : '*',
    methods: ['GET', 'POST'],
  }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
  });

  app.use('/api', apiRoutes);
  app.use(errorHandler);

  return app;
}
