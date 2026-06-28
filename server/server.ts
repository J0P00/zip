import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase, logAudit } from './database';
import authRoutes from './routes/auth';
import videoRoutes from './routes/videos';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.API_PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS Configuration
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);

// Root endpoint
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

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Initialize and start server
async function start() {
  try {
    console.log('🚀 Initializing OOP Pedagogical Hub Backend...');
    console.log(`📍 Environment: ${NODE_ENV}`);
    console.log(`🌐 CORS Origin: ${CORS_ORIGIN}`);

    // Initialize database schema
    console.log('📊 Initializing database schema...');
    await initializeDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
