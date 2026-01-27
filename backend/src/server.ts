import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { prisma } from './lib/prisma';
import { authenticate, authorize } from './middleware/auth';
import { validateEnv } from './utils/validateEnv';
import authRoutes from './routes/auth.routes';
import itemsRoutes from './routes/items.routes';
import claimsRoutes from './routes/claims.routes';
import adminRoutes from './routes/admin.routes';

// Load environment variables from .env file
dotenv.config();

// Validate environment variables at startup (fail fast)
const config = validateEnv();

const app: Application = express();
const PORT: number = config.PORT;

// ============================================================================
// SECURITY MIDDLEWARE - Interview talking points
// ============================================================================

/**
 * Helmet.js - Set security HTTP headers
 * 
 * Interview Q: What security headers does Helmet set?
 * - X-Content-Type-Options: nosniff (prevent MIME sniffing)
 * - X-Frame-Options: DENY (prevent clickjacking)
 * - X-XSS-Protection: 1; mode=block (legacy XSS filter)
 * - Strict-Transport-Security (HSTS - force HTTPS)
 * - Content-Security-Policy (restrict resource loading)
 * 
 * Why important? Defense in depth - browser-level protections
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "https://res.cloudinary.com", "data:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow Cloudinary images
}));

/**
 * Rate Limiting - Prevent brute force attacks
 * 
 * Interview Q: How do you prevent brute force attacks?
 * -> Rate limiting: Max N requests per time window per IP
 * -> Exponential backoff on failed logins (advanced)
 * -> Account lockout after N failures (advanced)
 * 
 * Configuration:
 * - windowMs: Time window in milliseconds
 * - max: Max requests per window per IP
 * - standardHeaders: Return rate limit info in headers
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 min per IP
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 login attempts per 15 min
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Apply general rate limit to all routes
app.use(generalLimiter);

/**
 * CORS configuration - Allow frontend to make requests
 * 
 * Interview Q: Why is CORS important?
 * -> Browser security: Prevents malicious sites from making requests on user's behalf
 * -> credentials: true allows cookies (needed for httpOnly JWT)
 * 
 * Production: Use specific origin, never '*' with credentials
 */
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/**
 * Request body size limit - Prevent DoS attacks
 * 
 * Interview Q: How do you prevent DoS via large payloads?
 * -> Limit request body size
 * -> For images: Validate size before upload, not after
 * 
 * 10mb limit for JSON (includes base64 images)
 * Adjust based on your use case
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Root route - simple test
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: '🎓 Campus Lost & Found API',
    version: '1.0.0',
    status: 'Server is running'
  });
});

// Auth routes with stricter rate limiting (prevent brute force)
// Interview Q: Why different rate limits for auth?
// -> Login/register are high-value targets for attackers
// -> Limit attempts to prevent credential stuffing
app.use('/api/auth', authLimiter, authRoutes);

// Items routes (create, read, update, delete items)
app.use('/api/items', itemsRoutes);

// Claims routes - mount at /api for GET /api/claims, also handles /api/items/:id/claims
app.use('/api', claimsRoutes);

// Admin routes (user management, moderation)
app.use('/api/admin', adminRoutes);

// Example protected route to verify middleware works
app.get('/api/protected', authenticate, (req, res) => {
  res.status(200).json({ message: 'You are authenticated!', user: (req as any).user });
});

// Example admin-only route
app.get('/api/admin', authenticate, authorize('ADMIN'), (req, res) => {
  res.status(200).json({ message: 'Welcome, admin!', user: (req as any).user });
});

// Health check route - test database connection
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'OK',
      message: 'Server and Database connected',
      database: 'PostgreSQL on Render',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// GLOBAL ERROR HANDLER - Never leak stack traces in production
// ============================================================================

/**
 * Global Error Handler Middleware
 * 
 * Interview Q: Why is this important?
 * -> Stack traces reveal internal code structure to attackers
 * -> Sensitive info (file paths, DB queries) could be exposed
 * -> Consistent error format for frontend
 * 
 * Must be LAST middleware (after all routes)
 */
interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  // Log full error for debugging (server-side only)
  console.error('🚨 Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default to 500 if no status code set
  const statusCode = err.statusCode || 500;
  
  // Send sanitized error response
  res.status(statusCode).json({
    error: statusCode === 500 
      ? 'An unexpected error occurred' // Hide internal errors
      : err.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.message
    })
  });
});

// 404 handler for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Start the server - bind to 0.0.0.0 for IPv4 compatibility
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

// ============================================================================
// GRACEFUL SHUTDOWN - Interview talking point
// ============================================================================

/**
 * Graceful Shutdown Handler
 * 
 * Interview Q: Why is graceful shutdown important?
 * -> Allows in-flight requests to complete
 * -> Closes database connections properly (prevents connection leaks)
 * -> Prevents data corruption from abrupt termination
 * -> Required for container orchestration (Kubernetes, Docker)
 * 
 * Signals:
 * - SIGTERM: Sent by Kubernetes/Docker when stopping container
 * - SIGINT: Sent when pressing Ctrl+C in terminal
 */
const gracefulShutdown = async (signal: string) => {
  console.log(`\n📴 ${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log('   ✓ HTTP server closed');

    try {
      // Disconnect from database
      await prisma.$disconnect();
      console.log('   ✓ Database connection closed');
      
      console.log('👋 Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('   ✗ Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown if graceful shutdown takes too long (10 seconds)
  setTimeout(() => {
    console.error('   ⚠️ Forceful shutdown (timeout exceeded)');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
