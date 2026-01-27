/**
 * ENVIRONMENT VALIDATION
 * ======================
 * 
 * Purpose: Fail fast if required environment variables are missing
 * 
 * Interview Q: Why validate env at startup?
 * -> Better to crash immediately with clear error than fail randomly later
 * -> Runtime errors from missing config are hard to debug
 * -> Security: Ensures critical secrets are set
 * 
 * This runs ONCE when server starts, before accepting any requests.
 */

interface EnvConfig {
  // Required
  DATABASE_URL: string;
  JWT_SECRET: string;

  // Optional with defaults
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  FRONTEND_URL: string;

  // Cloudinary (required for image uploads)
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;

  // Email (required for verification emails)
  EMAIL_HOST?: string;
  EMAIL_USER?: string;
  EMAIL_PASS?: string;
}

/**
 * Validate and return typed environment configuration
 * 
 * @throws Error if required variables are missing or invalid
 * @returns Validated environment configuration
 */
export const validateEnv = (): EnvConfig => {
  const errors: string[] = [];

  // ========================================
  // REQUIRED VARIABLES
  // ========================================

  // Database URL
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  } else if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  // JWT Secret
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters for security');
  }

  // ========================================
  // OPTIONAL WITH WARNINGS
  // ========================================

  // Cloudinary - warn if not configured (images won't work)
  const hasCloudinary = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET;

  if (!hasCloudinary) {
    console.warn('⚠️  Cloudinary not configured - image uploads will fail');
  }

  // Email - warn if not configured (verification emails won't work)
  const hasEmail = 
    process.env.EMAIL_HOST && 
    process.env.EMAIL_USER && 
    process.env.EMAIL_PASS;

  if (!hasEmail) {
    console.warn('⚠️  Email not configured - verification emails will fail');
  }

  // ========================================
  // FAIL IF REQUIRED VARS MISSING
  // ========================================

  if (errors.length > 0) {
    console.error('\n❌ Environment validation failed:\n');
    errors.forEach((err) => console.error(`   - ${err}`));
    console.error('\n   Please check your .env file.\n');
    process.exit(1);
  }

  // ========================================
  // RETURN TYPED CONFIG
  // ========================================

  const config: EnvConfig = {
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    PORT: parseInt(process.env.PORT || '5000', 10),
    NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
  };

  console.log('✅ Environment validated successfully');
  return config;
};

/**
 * Export singleton config
 * Call validateEnv() once at startup, then use this everywhere
 */
let _config: EnvConfig | null = null;

export const getConfig = (): EnvConfig => {
  if (!_config) {
    _config = validateEnv();
  }
  return _config;
};
