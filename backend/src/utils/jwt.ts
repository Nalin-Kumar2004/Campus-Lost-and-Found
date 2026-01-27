import jwt, { SignOptions, Algorithm } from 'jsonwebtoken';
import crypto from 'crypto';

// ============================================================================
// JWT CONFIGURATION - Security best practices for interviews
// ============================================================================

// Explicitly define the algorithm to prevent algorithm confusion attacks
// Interview Q: Why HS256? -> Symmetric, fast, suitable for single-server apps
// For microservices, consider RS256 (asymmetric) for public key verification
const JWT_ALGORITHM: Algorithm = 'HS256';

// Token expiration times (short access token + longer refresh token)
const ACCESS_TOKEN_EXPIRY = '15m';  // Short-lived for security
const REFRESH_TOKEN_EXPIRY = '7d';  // Longer-lived, stored securely

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

// Extended payload with standard JWT claims for better security
interface JWTPayload extends TokenPayload {
  jti: string;  // JWT ID - unique identifier for token revocation
  iat: number;  // Issued at - when token was created
  exp?: number; // Expiration time - automatically added by jwt.sign()
  type: 'access' | 'refresh';  // Token type to prevent token confusion
}

/**
 * Get JWT secret with validation
 * 
 * SECURITY: Never use fallback secrets in production!
 * Interview Q: Why throw error instead of fallback?
 * -> Fallback secrets are predictable and compromise ALL tokens
 * 
 * @throws Error if JWT_SECRET is not configured
 */
const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    // CRITICAL: Fail fast in production - never use fallback secrets
    throw new Error(
      'JWT_SECRET environment variable is not set. ' +
      'This is a critical security requirement.'
    );
  }

  // Validate secret strength (minimum 32 characters recommended)
  if (secret.length < 32) {
    console.warn(
      '⚠️ JWT_SECRET is less than 32 characters. ' +
      'Consider using a stronger secret for production.'
    );
  }

  return secret;
};

/**
 * Generate a unique token ID (jti) for token tracking/revocation
 * 
 * Interview Q: Why use jti claim?
 * -> Enables token blacklisting/revocation without database lookup of all tokens
 * -> Useful for audit logging (track which token was used)
 */
const generateTokenId = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Generate Access Token (short-lived)
 * 
 * Interview Topics:
 * 1. Why short expiry? -> Limits damage if token is stolen
 * 2. What's in payload? -> Only necessary claims (userId, role)
 * 3. Why not store sensitive data? -> JWT payload is base64 encoded, not encrypted
 * 
 * @param payload - User data to encode in token
 * @returns Signed JWT access token
 */
export const generateToken = (payload: TokenPayload): string => {
  const secret = getJWTSecret();

  const jwtPayload: JWTPayload = {
    ...payload,
    jti: generateTokenId(),
    iat: Math.floor(Date.now() / 1000),
    type: 'access'
  };

  const options: SignOptions = {
    algorithm: JWT_ALGORITHM,
    expiresIn: ACCESS_TOKEN_EXPIRY
  };

  return jwt.sign(jwtPayload, secret, options);
};

/**
 * Generate Refresh Token (long-lived)
 * 
 * Interview Topics:
 * 1. Why separate refresh token? -> Access token can be short-lived
 * 2. Storage? -> httpOnly cookie (not localStorage!)
 * 3. Rotation? -> Issue new refresh token on each use (detect token theft)
 * 
 * @param payload - User data (minimal - just userId for lookup)
 * @returns Signed JWT refresh token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  const secret = getJWTSecret();

  const jwtPayload: JWTPayload = {
    ...payload,
    jti: generateTokenId(),
    iat: Math.floor(Date.now() / 1000),
    type: 'refresh'
  };

  const options: SignOptions = {
    algorithm: JWT_ALGORITHM,
    expiresIn: REFRESH_TOKEN_EXPIRY
  };

  return jwt.sign(jwtPayload, secret, options);
};

/**
 * Verify a JWT token with enhanced security
 * 
 * Interview Topics:
 * 1. Algorithm specification -> Prevents algorithm confusion attacks
 * 2. Token type validation -> Prevents using refresh token as access token
 * 3. Error handling -> Different errors for different failure modes
 * 
 * When user sends token with request, server needs to:
 * 1. Extract token from Authorization header or cookie
 * 2. Verify signature (hasn't been tampered with)
 * 3. Verify algorithm matches expected (prevent "none" algorithm attack)
 * 4. Check if token expired
 * 5. Validate token type (access vs refresh)
 * 6. Get user data (userId, email, role) from token
 * 
 * @param token - JWT token string to verify
 * @param expectedType - Expected token type ('access' or 'refresh')
 * @returns TokenPayload if valid (userId, email, role)
 * @throws Error if token invalid or expired
 * 
 * SECURITY: Always specify algorithms to prevent algorithm confusion attacks
 * Interview Q: What is algorithm confusion attack?
 * -> Attacker changes algorithm to 'none' or asymmetric public key as secret
 */
export const verifyToken = (
  token: string, 
  expectedType: 'access' | 'refresh' = 'access'
): TokenPayload => {
  const secret = getJWTSecret();

  try {
    // SECURITY: Explicitly specify allowed algorithms
    // This prevents algorithm confusion attacks (e.g., "none" algorithm)
    const decoded = jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM]  // Only allow our specified algorithm
    }) as JWTPayload;

    // Validate token type to prevent token confusion attacks
    // Interview Q: Why check token type?
    // -> Prevents using refresh token as access token (different security levels)
    if (decoded.type !== expectedType) {
      throw new Error('InvalidTokenType');
    }

    // Return only the essential payload (strip JWT-specific claims)
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    // Handle specific JWT errors with clear messages
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('TokenExpired');
    }

    if (error instanceof jwt.JsonWebTokenError) {
      // This catches: invalid signature, malformed token, algorithm mismatch
      throw new Error('InvalidToken');
    }

    if (error instanceof jwt.NotBeforeError) {
      // Token used before its "nbf" (not before) claim
      throw new Error('TokenNotYetValid');
    }

    // Re-throw our custom errors (InvalidTokenType)
    if (error instanceof Error && error.message === 'InvalidTokenType') {
      throw error;
    }

    throw new Error('TokenVerificationFailed');
  }
};

/**
 * Decode token without verification (for debugging/logging only)
 * 
 * WARNING: Never use this for authentication!
 * Interview Q: When would you use this?
 * -> Logging, debugging, extracting claims for error messages
 * -> Getting userId for audit logs even if token is expired
 * 
 * @param token - JWT token to decode
 * @returns Decoded payload or null if malformed
 */
export const decodeTokenUnsafe = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload | null;
  } catch {
    return null;
  }
};

/**
 * Extract token ID (jti) from token for blacklisting
 * 
 * Interview Q: How do you implement token revocation?
 * -> Store jti in Redis/DB blacklist, check on each request
 * -> More efficient than storing all valid tokens
 * 
 * @param token - JWT token
 * @returns Token ID (jti) or null
 */
export const extractTokenId = (token: string): string | null => {
  const decoded = decodeTokenUnsafe(token);
  return decoded?.jti || null;
};

/**
 * Extract token from Authorization header
 * 
 * HTTP Authorization header format:
 * "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 * This function extracts just the token part (removes "Bearer " prefix)
 * 
 * @param authHeader - Authorization header value (e.g., "Bearer [token]")
 * @returns Token string without "Bearer " prefix, or null if not found
 * 
 * Interview Q: Why use Bearer scheme?
 * -> RFC 6750 standard for OAuth 2.0 token authentication
 * -> "Bearer" indicates the client "bears" (possesses) the token
 * 
 * Example:
 * Input:  "Bearer eyJhbGci..."
 * Output: "eyJhbGci..."
 * 
 * Input:  undefined (no header sent)
 * Output: null
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  // Check if header exists
  if (!authHeader) {
    return null;
  }

  // Split header by space: ["Bearer", "token_string"]
  const parts = authHeader.split(' ');

  // Check if format is correct: should have exactly 2 parts
  // and first should be "Bearer" (case-sensitive per RFC 6750)
  if (parts.length === 2 && parts[0] === 'Bearer') {
    // Return the token part (second part)
    return parts[1];
  }

  // Invalid format
  return null;
};

// ============================================================================
// TOKEN BLACKLIST - For token revocation (logout, security incidents)
// ============================================================================

/**
 * In-memory token blacklist
 * 
 * Interview Topics:
 * 1. Why blacklist vs whitelist?
 *    -> Blacklist is more efficient (fewer entries to check)
 *    -> Only need to track revoked tokens until they expire
 * 
 * 2. Production considerations:
 *    -> Use Redis for distributed systems (multiple servers)
 *    -> Set TTL equal to token expiry (auto-cleanup)
 *    -> Consider bloom filters for memory efficiency
 * 
 * 3. Trade-offs:
 *    -> Memory usage vs security
 *    -> Stateless JWT becomes stateful (but only for revoked tokens)
 * 
 * PRODUCTION NOTE: Replace with Redis for scalability
 * Example: await redis.setex(`blacklist:${jti}`, tokenExpiry, '1')
 */
interface BlacklistedToken {
  jti: string;
  expiresAt: number;  // Unix timestamp when token expires (for cleanup)
  reason: string;     // Why token was revoked (audit trail)
  revokedAt: number;  // When token was revoked
}

// In-memory blacklist (replace with Redis in production)
const tokenBlacklist: Map<string, BlacklistedToken> = new Map();

/**
 * Add token to blacklist (revoke it)
 * 
 * Use cases:
 * 1. User logout -> revoke current token
 * 2. Password change -> revoke all user tokens
 * 3. Security incident -> revoke compromised tokens
 * 4. Admin action -> force user re-authentication
 * 
 * @param token - JWT token to blacklist
 * @param reason - Why token is being revoked (for audit)
 */
export const blacklistToken = (token: string, reason: string = 'logout'): void => {
  const decoded = decodeTokenUnsafe(token);
  
  if (!decoded?.jti) {
    console.warn('Cannot blacklist token without jti claim');
    return;
  }

  const entry: BlacklistedToken = {
    jti: decoded.jti,
    expiresAt: decoded.exp || (Date.now() / 1000 + 3600), // Default 1hr if no exp
    reason,
    revokedAt: Math.floor(Date.now() / 1000)
  };

  tokenBlacklist.set(decoded.jti, entry);
  
  // Schedule cleanup when token would have expired anyway
  const ttl = (entry.expiresAt * 1000) - Date.now();
  if (ttl > 0) {
    setTimeout(() => {
      tokenBlacklist.delete(decoded.jti);
    }, ttl);
  }
};

/**
 * Check if token is blacklisted
 * 
 * Interview Q: Performance impact?
 * -> O(1) lookup with Map/Redis
 * -> Minimal overhead compared to DB queries
 * 
 * @param token - JWT token to check
 * @returns true if token is blacklisted (revoked)
 */
export const isTokenBlacklisted = (token: string): boolean => {
  const jti = extractTokenId(token);
  if (!jti) return false;
  
  return tokenBlacklist.has(jti);
};

/**
 * Cleanup expired entries from blacklist
 * 
 * Interview Q: Why cleanup?
 * -> Expired tokens don't need to be blacklisted (they're invalid anyway)
 * -> Prevents memory leak over time
 * 
 * PRODUCTION: Redis TTL handles this automatically
 */
export const cleanupBlacklist = (): number => {
  const now = Math.floor(Date.now() / 1000);
  let cleaned = 0;

  for (const [jti, entry] of tokenBlacklist.entries()) {
    if (entry.expiresAt < now) {
      tokenBlacklist.delete(jti);
      cleaned++;
    }
  }

  return cleaned;
};

// ============================================================================
// EXPORTS FOR TYPES
// ============================================================================

export type { TokenPayload, JWTPayload };