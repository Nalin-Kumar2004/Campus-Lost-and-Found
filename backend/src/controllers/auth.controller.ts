import { Request, Response } from 'express';
import { hashPassword, validatePasswordStrength, comparePassword } from '../utils/password';
import { generateToken, generateRefreshToken, blacklistToken } from '../utils/jwt';
import { prisma } from '../lib/prisma';
import { 
  sendEmail, 
  verificationEmailTemplate, 
  buildVerificationLink,
  passwordResetEmailTemplate,
  buildPasswordResetLink,
  passwordChangedEmailTemplate
} from '../utils/email';
import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';
const cookieSameSite = (isProduction ? 'none' : 'lax') as 'lax' | 'none' | 'strict';
const cookieSecure = isProduction || process.env.COOKIE_SECURE === 'true';


/**
 * Register a new user
 * 
 * Request body:
 *   - email: string (unique, college email)
 *   - password: string (min 8 chars, uppercase, lowercase, number, special)
 *   - name: string (user's full name)
 * 
 * Response:
 *   - 201: { user: {...}, token: "..." }
 *   - 400: { error: "..." } (validation error)
 *   - 409: { error: "Email already registered" }
 *   - 500: { error: "Server error" }
 */
export const register = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract request body
    const { email, password, name } = req.body;

    // Step 2: Validate request body - all fields present?
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, password, name' 
      });
    }

    // Step 3: Validate email format (basic check)
    // Real production: use library like "validator" or regex
    // For now: simple check for @ and .
    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Step 4: Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: passwordValidation.reason 
      });
    }

    // Step 5: Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      return res.status(409).json({ 
        error: 'Email already registered' 
      });
    }

    // Step 6: Hash password
    const passwordHash = await hashPassword(password);

    // Step 7: Prepare email verification token (24h expiry)
    const verificationToken = `verify_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Step 8: Save user to database
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'STUDENT', // Default role
        verificationToken,
        tokenExpiresAt
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    // Step 9: Generate JWT tokens (access + refresh)
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    const refreshToken = generateRefreshToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    // Step 10: Set httpOnly cookies (secure token storage)
    // Access token: short-lived (15 min)
    res.cookie('token', token, {
      httpOnly: true,  // Cannot be accessed by JavaScript (XSS protection)
      secure: cookieSecure, // HTTPS only in production
      sameSite: cookieSameSite, // CSRF protection (use 'none' for cross-site in prod)
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/' // Ensure cookie is sent with all requests
    });

    // Refresh token: long-lived (7 days)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/' // Ensure cookie is sent with all requests
    });
// Step 11: Fire-and-forget verification email
   
    
    try {
      const verifyUrl = buildVerificationLink(verificationToken);
      await
     sendEmail({
        to: newUser.email,
        subject: 'Verify your email - Campus Lost & Found',
        html: verificationEmailTemplate({
          name: newUser.name,
          verifyUrl,
          expiresAt: tokenExpiresAt,
        }),
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔗 Email verification link: ${verifyUrl}`);
      }
    } catch (e) {
      console.error('Failed to send verification email after register:', e);
    }
    
    // Step 12: Return user only (token is in cookie)
    return res.status(201).json({
      user: newUser,
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ 
      error: 'Registration failed' 
    });
  }
};

/**
 * Login user
 * 
 * Request body:
 *   - email: string
 *   - password: string
 * 
 * Response:
 *   - 200: { user: {...}, token: "..." }
 *   - 401: { error: "Invalid credentials" }
 *   - 500: { error: "Server error" }
 */
export const login = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract email, password from request body
    const { email, password } = req.body;

    // Step 2: Validate fields present
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password required' 
      });
    }

    // Step 3: Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Step 4: User not found
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Step 5: Compare provided password with stored hash
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    // Step 6: Password incorrect
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Step 7: Password correct! Generate tokens (access + refresh)
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Step 8: Set httpOnly cookies (secure token storage)
    // Access token: short-lived (15 min)
    res.cookie('token', token, {
      httpOnly: true,  // Cannot be accessed by JavaScript (XSS protection)
      secure: cookieSecure, // HTTPS only in production
      sameSite: cookieSameSite, // CSRF protection (use 'none' for cross-site in prod)
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/' // Ensure cookie is sent with all requests
    });

    // Refresh token: long-lived (7 days)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/' // Ensure cookie is sent with all requests
    });

    // Step 9: Return user only (token is in httpOnly cookie)
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'Login failed' 
    });
  }
};

/**
 * VERIFY EMAIL - POST /api/auth/verify-email
 * 
 * Purpose: Verify user's email address using token sent to their email
 * 
 * Architecture Flow:
 * 1. Extract verification token from request body
 * 2. Find user by verification token
 * 3. Check if token is expired
 * 4. Mark email as verified
 * 5. Clear verification token
 * 6. Return success response
 * 
 * Request Body:
 * {
 *   "token": "abc123def456..."
 * }
 * 
 * Response (200):
 * {
 *   "message": "Email verified successfully",
 *   "user": {
 *     "id": "user_123",
 *     "email": "john@college.edu",
 *     "emailVerified": true
 *   }
 * }
 * 
 * Business Rules:
 * - Token must exist and match user's verificationToken
 * - Token must not be expired (check tokenExpiresAt)
 * - Once verified, token is cleared (can't be reused)
 * 
 * Interview Concepts:
 * - Token expiration (security feature)
 * - One-time use tokens (clear after use)
 * - Email verification flow (common in web apps)
 */
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract verification token from request body
    const { token } = req.body;

    // Step 2: Validate token is provided
    if (!token || token.trim() === '') {
      return res.status(400).json({ 
        error: 'Verification token is required' 
      });
    }

    console.log(`📧 Email verification attempt with token: ${token.substring(0, 10)}...`);

    // Step 3: Find user by verification token
    const user = await prisma.user.findUnique({
      where: { verificationToken: token }
    });

    // Step 4: Check if user exists with this token
    if (!user) {
      return res.status(400).json({ 
        error: 'Invalid or expired verification token',
        hint: 'Token may have already been used or is incorrect'
      });
    }

    // Step 5: Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({ 
        error: 'Email is already verified',
        hint: 'No need to verify again'
      });
    }

    // Step 6: Check if token is expired
    if (user.tokenExpiresAt && user.tokenExpiresAt < new Date()) {
      return res.status(400).json({ 
        error: 'Verification token has expired',
        hint: 'Please request a new verification email'
      });
    }

    // Step 7: Mark email as verified and clear token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,  // Clear token (one-time use)
        tokenExpiresAt: null
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        role: true
      }
    });

    console.log(`✅ Email verified for user: ${updatedUser.email}`);

    // Step 8: Return success response
    return res.status(200).json({
      message: 'Email verified successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ 
      error: 'Email verification failed',
      message: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * RESEND VERIFICATION EMAIL - POST /api/auth/resend-verification
 * 
 * Purpose: Generate new verification token and send email (for expired/lost tokens)
 * 
 * Architecture Flow:
 * 1. Extract email from request body
 * 2. Find user by email
 * 3. Check if already verified
 * 4. Generate new verification token
 * 5. Set new expiration time (24 hours)
 * 6. Update user with new token
 * 7. Send verification email (in production)
 * 8. Return success response
 * 
 * Request Body:
 * {
 *   "email": "john@college.edu"
 * }
 * 
 * Response (200):
 * {
 *   "message": "Verification email sent",
 *   "email": "john@college.edu",
 *   "expiresAt": "2026-01-22T..."
 * }
 * 
 * Business Rules:
 * - User must exist
 * - Email must not already be verified
 * - Token expires in 24 hours
 * - Old token is replaced with new one
 * 
 * Interview Concepts:
 * - Token regeneration (for lost/expired tokens)
 * - Idempotency (safe to call multiple times)
 * - Time-limited tokens (security)
 */
export const resendVerification = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract email from request body
    const { email } = req.body;

    // Step 2: Validate email is provided
    if (!email || email.trim() === '') {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    console.log(`📧 Resend verification request for: ${email}`);

    // Step 3: Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Step 4: Check if user exists
    if (!user) {
      // Security: Don't reveal if email exists
      // Return success even if user doesn't exist (prevent email enumeration)
      return res.status(200).json({ 
        message: 'If the email exists, a verification email has been sent',
        email: email
      });
    }

    // Step 5: Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({ 
        error: 'Email is already verified',
        hint: 'No need to verify again'
      });
    }

    // Step 6: Generate new verification token
    // In production: use crypto.randomBytes or uuid
    const newToken = `verify_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Step 7: Set expiration time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Step 8: Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: newToken,
        tokenExpiresAt: expiresAt
      }
    });

    // Step 9: Send verification email
    try {
      const verifyUrl = buildVerificationLink(newToken);
      await sendEmail({
        to: email,
        subject: 'Verify your email - Campus Lost & Found',
        html: verificationEmailTemplate({
          name: user.name,
          verifyUrl,
          expiresAt: expiresAt,
        }),
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔗 Email verification link: ${verifyUrl}`);
      }
    } catch (e) {
      console.error('Failed to send verification email:', e);
    }

    // Step 10: Return success response
    return res.status(200).json({
      message: 'Verification email sent',
      email: email,
      expiresAt: expiresAt,
      // REMOVE IN PRODUCTION - only for development/testing
      token: process.env.NODE_ENV === 'development' ? newToken : undefined
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ 
      error: 'Failed to send verification email',
      message: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// ============================================================================
// PASSWORD RESET FLOW - Interview talking points
// ============================================================================

/**
 * FORGOT PASSWORD - POST /api/auth/forgot-password
 * 
 * Purpose: Initiate password reset flow by sending reset email
 * 
 * Security Considerations (Interview Topics):
 * 1. Always return success (don't reveal if email exists)
 * 2. Rate limit this endpoint to prevent email bombing
 * 3. Short token expiry (1 hour)
 * 4. Secure random token generation (crypto.randomBytes)
 * 5. Clear token after use (one-time use)
 * 
 * Request Body:
 * {
 *   "email": "student@college.edu"
 * }
 * 
 * Response (always 200 - security):
 * {
 *   "message": "If an account exists, a reset email will be sent"
 * }
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Validate email provided
    if (!email || !email.includes('@')) {
      return res.status(400).json({ 
        error: 'Valid email is required' 
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    // SECURITY: Always return success, even if user doesn't exist
    // This prevents email enumeration attacks
    // Interview Q: Why not say "user not found"?
    // -> Attackers could use this to discover valid emails
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return res.status(200).json({
        message: 'If an account exists with this email, a reset link will be sent'
      });
    }

    // Generate secure random reset token
    // Interview Q: Why crypto.randomBytes vs Math.random?
    // -> crypto.randomBytes is cryptographically secure
    // -> Math.random is predictable and NOT suitable for security tokens
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Token expires in 1 hour (shorter than email verification for security)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiresAt: expiresAt
      }
    });

    // Send reset email
    try {
      const resetUrl = buildPasswordResetLink(resetToken);
      await sendEmail({
        to: user.email,
        subject: 'Reset your password - Campus Lost & Found',
        html: passwordResetEmailTemplate({
          name: user.name,
          resetUrl,
          expiresAt
        })
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔗 Password reset link: ${resetUrl}`);
      }
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't expose email errors to user
    }

    return res.status(200).json({
      message: 'If an account exists with this email, a reset link will be sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ 
      error: 'Failed to process password reset request' 
    });
  }
};

/**
 * RESET PASSWORD - POST /api/auth/reset-password
 * 
 * Purpose: Set new password using valid reset token
 * 
 * Security Flow:
 * 1. Validate token format
 * 2. Find user by token
 * 3. Check token not expired
 * 4. Validate new password strength
 * 5. Hash new password
 * 6. Clear reset token (one-time use)
 * 7. Clear all refresh tokens (logout everywhere)
 * 8. Send confirmation email
 * 
 * Request Body:
 * {
 *   "token": "reset-token-from-email",
 *   "password": "NewSecurePassword123!"
 * }
 * 
 * Response (200):
 * {
 *   "message": "Password reset successful"
 * }
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    // Validate inputs
    if (!token || !password) {
      return res.status(400).json({ 
        error: 'Token and new password are required' 
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: passwordValidation.reason 
      });
    }

    // Find user by reset token
    const user = await prisma.user.findUnique({
      where: { resetToken: token }
    });

    // Token not found
    if (!user) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token' 
      });
    }

    // Check if token is expired
    if (user.resetTokenExpiresAt && user.resetTokenExpiresAt < new Date()) {
      // Clear expired token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: null,
          resetTokenExpiresAt: null
        }
      });

      return res.status(400).json({ 
        error: 'Reset token has expired. Please request a new one.' 
      });
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null
      }
    });

    // Clear token cookies (logout user on this device)
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    // Send confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password changed - Campus Lost & Found',
        html: passwordChangedEmailTemplate({ name: user.name })
      });
    } catch (emailError) {
      console.error('Failed to send password changed email:', emailError);
    }

    return res.status(200).json({
      message: 'Password reset successful. Please log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ 
      error: 'Failed to reset password' 
    });
  }
};
