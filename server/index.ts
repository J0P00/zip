import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { API_PORT, CORS_ORIGIN, NODE_ENV, validateEnv } from './env';
import { initializeDatabase } from './db/init';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import moduleRoutes from './routes/modules';
import assessmentRoutes from './routes/assessments';
import progressRoutes from './routes/progress';
import videoRoutes from './routes/videos';
import appStateRoutes from './routes/appState';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(
  cors({
    origin: CORS_ORIGIN.split(',').map(origin => origin.trim()),
    credentials: true
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', environment: NODE_ENV, timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/app-state', appStateRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);

  const message =
    err?.code === '23505'
      ? 'A record with the same unique value already exists.'
      : err?.message || 'Internal server error.';

  res.status(err?.status || 500).json({ success: false, message });
});

async function start() {
  const validation = validateEnv();

  if (!validation.valid) {
    console.error('Configuration errors:');
    validation.errors.forEach(error => console.error(`- ${error}`));

    if (NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  await initializeDatabase();

  app.listen(API_PORT, () => {
    console.log(`OOP Pedagogical Hub API running on http://localhost:${API_PORT}`);
  });
}

start().catch(error => {
  console.error('Failed to start API server:', error);
  process.exit(1);
});

export default app;

