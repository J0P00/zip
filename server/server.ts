import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { 
  initializeDatabase, 
  logAudit,
  isSupabaseConfigured 
} from './database';
import { 
  NODE_ENV, 
  API_PORT, 
  CORS_ORIGIN, 
  validateAllConfig, 
  logConfig 
} from './config';
import authRoutes from './routes/auth';
import videoRoutes from './routes/videos';

const app: Express = express();
const PORT = process.env.PORT || API_PORT || 5000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS Configuration
const allowedOrigins = CORS_ORIGIN.split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    const isDevelopment = NODE_ENV !== 'production';
    const isLocalIp = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
    
    if (allowedOrigins.includes(origin) || (isDevelopment && isLocalIp)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(null, false); // Reject origin by not setting Access-Control-Allow-Origin
    }
  },
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
    console.log('\n');
    console.log('🚀 OOP Pedagogical Hub Backend Starting...\n');
    
    // Log configuration
    logConfig();
    
    // Validate configuration
    const configValidation = validateAllConfig();
    if (!configValidation.valid) {
      console.log('\n⚠️  Configuration Issues:');
      configValidation.errors.forEach(error => {
        console.log(`   ❌ ${error.split('\n')[0]}`);
      });
      console.log('\n' + '='.repeat(70));
      
      if (NODE_ENV === 'production') {
        console.error('❌ Cannot start in production mode with invalid configuration');
        process.exit(1);
      }
      
      console.log('💡 Tip: For development, you can set SKIP_SUPABASE=true in .env');
      console.log('   to use mock data without Supabase configuration\n');
    }
    
    // Initialize database
    if (isSupabaseConfigured) {
      console.log('📊 Initializing database connection...');
      await initializeDatabase();
    } else {
      console.log('📊 Running in development mode without Supabase');
      console.log('⚠️  Note: User authentication may not work. Configure Supabase or set SKIP_SUPABASE=true');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`\n✅ Server listening on port ${PORT}`);
      console.log('📚 API Documentation: /\n');
    });

  } catch (error) {
    console.error('\n❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
