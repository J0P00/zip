import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { initializeDatabase } from './database';
import {
  NODE_ENV,
  CORS_ORIGIN,
  validateAllConfig,
  logConfig
} from './config';
import authRoutes from './routes/auth';
import videoRoutes from './routes/videos';

const app: Express = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const allowedOrigins = CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isDevelopment = NODE_ENV !== 'production';
    const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);

    if (allowedOrigins.includes(origin) || (isDevelopment && isLocalOrigin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    name: 'OOP Pedagogical Hub - Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      videos: '/api/videos',
      health: '/health'
    }
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error'
  });
});

async function start() {
  try {
    console.log('\nOOP Pedagogical Hub Backend Starting...\n');
    logConfig();

    const configValidation = validateAllConfig();
    if (!configValidation.valid) {
      console.error('\nConfiguration issues:');
      configValidation.errors.forEach(error => {
        console.error(`- ${error}`);
      });

      if (NODE_ENV === 'production') {
        process.exit(1);
      }
    }

    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`\nServer listening on port ${PORT}`);
      console.log('API documentation root: /\n');
    });
  } catch (error) {
    console.error('\nFailed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
