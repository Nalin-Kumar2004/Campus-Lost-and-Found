import { Router } from 'express';
import { Request, Response } from 'express';
import { 
  register, 
  login, 
  verifyEmail, 
  resendVerification,
  forgotPassword,
  resetPassword 
} from '../controllers/auth.controller';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { 
  blacklistToken, 
  generateToken, 
  generateRefreshToken, 
  verifyToken, 
  isTokenBlacklisted 
} from '../utils/jwt';

const router = Router();

const isProduction = process.env.NODE_ENV === 'production';
const cookieSameSite = (isProduction ? 'none' : 'lax') as 'lax' | 'none' | 'strict';
const cookieSecure = isProduction || process.env.COOKIE_SECURE === 'true';

/**
 * POST /api/auth/register
 * Register a new user
 * Body: { email, password, name }
 * Response: { user }
 */
router.post('/register', register);

/**
 * POST /api/auth/login
 * Login user
 * Body: { email, password }
 * Response: { user }
 */
router.post('/login', login);

/**
 * POST /api/auth/logout
 * Logout user - invalidates token and clears cookies
 * 
 * Interview Topics:
 * 1. Why blacklist token? -> JWT is stateless, can't "invalidate" without tracking
 * 2. Why clear both cookies? -> Access token + refresh token
 * 3. Security: Clearing cookie alone isn't enough if attacker has copied token
 * 
 * Response: { message }
 */
router.post('/logout', (req: Request, res: Response) => {
  // Get the token before clearing to add to blacklist
  const accessToken = (req as any).cookies?.token;
  const refreshToken = (req as any).cookies?.refreshToken;

  // Blacklist both tokens if they exist
  // This ensures tokens can't be used even if attacker copied them
  if (accessToken) {
    blacklistToken(accessToken, 'user_logout');
  }
  if (refreshToken) {
    blacklistToken(refreshToken, 'user_logout');
  }

  // Clear access token cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: '/'
  });

  // Clear refresh token cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: '/'
  });

  res.json({ message: 'Logged out successfully' });
});

/**
 * POST /api/auth/refresh
 * Get new access token using refresh token
 * 
 * Interview Topics:
 * 1. Why refresh tokens? -> Short-lived access tokens are more secure
 * 2. Token rotation: Issue new refresh token on each use (detect theft)
 * 3. Refresh token theft detection: If same refresh used twice, revoke all
 * 
 * Flow:
 * 1. Validate refresh token from cookie
 * 2. Check if refresh token is blacklisted
 * 3. Verify user still exists and is active
 * 4. Generate new access token
 * 5. Optionally rotate refresh token (recommended)
 * 
 * Response: { message } (new token set in httpOnly cookie)
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = (req as any).cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ 
        error: 'No refresh token provided',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    // Check if refresh token was revoked
    if (isTokenBlacklisted(refreshToken)) {
      return res.status(401).json({ 
        error: 'Refresh token has been revoked',
        code: 'REFRESH_TOKEN_REVOKED'
      });
    }

    // Verify refresh token (type='refresh')
    let decoded;
    try {
      decoded = verifyToken(refreshToken, 'refresh');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'TokenExpired') {
          return res.status(401).json({ 
            error: 'Refresh token expired. Please log in again.',
            code: 'REFRESH_TOKEN_EXPIRED'
          });
        }
      }
      return res.status(401).json({ 
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, name: true }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'User no longer exists',
        code: 'USER_NOT_FOUND'
      });
    }

    // Generate new access token
    const newAccessToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // SECURITY: Rotate refresh token (recommended)
    // Blacklist old refresh token and issue new one
    // This helps detect token theft (if old token is used after rotation)
    blacklistToken(refreshToken, 'token_rotation');
    
    const newRefreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Set new access token cookie
    res.cookie('token', newAccessToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/' // Ensure cookie is sent with all requests
    });

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/' // Ensure cookie is sent with all requests
    });

    return res.json({ 
      message: 'Token refreshed successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ 
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify user's email address
 * Body: { token }
 * Response: { message, user }
 */
router.post('/verify-email', verifyEmail);

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 * Body: { email }
 * Response: { message, email, expiresAt }
 */
router.post('/resend-verification', resendVerification);

/**
 * POST /api/auth/forgot-password
 * Initiate password reset flow
 * Body: { email }
 * Response: { message } (always success for security)
 * 
 * Interview Q: Why always return success?
 * -> Prevents email enumeration attacks
 * -> Attacker can't discover which emails are registered
 */
router.post('/forgot-password', forgotPassword);

/**
 * POST /api/auth/reset-password
 * Reset password using token from email
 * Body: { token, password }
 * Response: { message }
 */
router.post('/reset-password', resetPassword);

/**
 * GET /api/auth/verify
 * Verify current user's token/session
 * Uses httpOnly cookie automatically
 * Response: { user } or 401 if not authenticated
 * 
 * PURPOSE: Frontend calls this to verify the token is still valid
 * Used by ProtectedRoute component to validate authentication
 */
router.get('/verify', authenticate, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Fetch fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
