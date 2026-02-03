import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyToken, isTokenBlacklisted } from '../utils/jwt';

// Augment Express Request with a `user` property once authenticated
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Authenticate incoming requests using JWT from httpOnly cookie.
 * 
 * Security Flow:
 * 1. Read token from httpOnly cookie (XSS protection)
 * 2. Check if token is blacklisted (revocation support)
 * 3. Verify token signature and expiry
 * 4. Validate token type is 'access' (not refresh)
 * 5. Attach decoded user to req.user
 * 
 * Interview Topics:
 * - Why httpOnly cookie? -> JavaScript can't access it (XSS protection)
 * - Why check blacklist? -> Support token revocation (logout, security)
 * - Why validate token type? -> Prevent using refresh token for API access
 * 
 * @returns 401 for missing/invalid/expired/revoked tokens
 */
export const authenticate: RequestHandler = (req, res, next) => {
  const reqA = req as AuthenticatedRequest;
  
  // Debug: Log what cookies we receive
  console.log('🍪 Cookies received:', JSON.stringify((req as any).cookies, null, 2));
  console.log('🍪 Raw cookie header:', req.headers.cookie);
  
  // Read token from httpOnly cookie (set during login/register)
  const token = (req as any).cookies?.token;

  // No token cookie
  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required. Please log in.',
      code: 'NO_TOKEN'
    });
  }

  // Check if token has been revoked (logout, security incident)
  // Interview Q: Why check blacklist before verification?
  // -> Fail fast for revoked tokens (skip expensive verification)
  if (isTokenBlacklisted(token)) {
    return res.status(401).json({ 
      error: 'Token has been revoked. Please log in again.',
      code: 'TOKEN_REVOKED'
    });
  }

  try {
    // Verify token with type='access' (not refresh token)
    const decoded = verifyToken(token, 'access');
    reqA.user = decoded;
    return next();
  } catch (error) {
    // Map utility errors to HTTP status/messages
    if (error instanceof Error) {
      if (error.message === 'TokenExpired') {
        return res.status(401).json({ 
          error: 'Token expired. Please refresh your session.',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (error.message === 'InvalidToken') {
        return res.status(401).json({ 
          error: 'Invalid token.',
          code: 'INVALID_TOKEN'
        });
      }
      if (error.message === 'InvalidTokenType') {
        return res.status(401).json({ 
          error: 'Invalid token type. Use access token for API requests.',
          code: 'INVALID_TOKEN_TYPE'
        });
      }
    }
    return res.status(500).json({ 
      error: 'Authentication failed unexpectedly.',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Authorize request based on allowed roles.
 * 
 * Interview Topics:
 * - Role-Based Access Control (RBAC)
 * - Why separate from authenticate? -> Single Responsibility Principle
 * - Order matters: authenticate MUST run before authorize
 * 
 * Usage: app.get('/admin', authenticate, authorize('ADMIN'), handler)
 */
export const authorize = (...allowedRoles: string[]) => {
  return ((req, res, next) => {
    const role = (req as AuthenticatedRequest).user?.role;
    
    // No user attached means authenticate middleware didn't run
    if (!role) {
      return res.status(401).json({ 
        error: 'Unauthenticated.',
        code: 'NO_USER_CONTEXT'
      });
    }
    
    // Check if user's role is in the allowed list
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ 
        error: 'Forbidden: insufficient permissions.',
        code: 'INSUFFICIENT_ROLE',
        required: allowedRoles,
        current: role
      });
    }
    
    return next();
  }) as RequestHandler;
};
