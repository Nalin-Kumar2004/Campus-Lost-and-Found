/**
 * AUTHENTICATION API SERVICE
 * ==========================
 * 
 * FIRST PRINCIPLE: What is a Service Layer?
 * ------------------------------------------
 * A service is a collection of functions that talk to ONE part of the backend.
 * This file handles all authentication-related API calls.
 * 
 * WHY CREATE SERVICE FUNCTIONS?
 * ------------------------------
 * Instead of writing this in components:
 *   const response = await api.post('/auth/login', { email, password });
 * 
 * We write:
 *   const response = await authService.login({ email, password });
 * 
 * BENEFITS:
 * 1. Centralized - All auth API calls in one place
 * 2. Reusable - Multiple components can use same function
 * 3. Maintainable - If API changes, update once
 * 4. Testable - Easy to mock in tests
 * 5. Type-safe - TypeScript interfaces ensure correctness
 * 
 * ARCHITECTURE PATTERN:
 * Component → Service → API Client → Backend
 * 
 * Example flow:
 * Login.tsx → authService.login() → api.post() → Backend /api/auth/login
 */

import api from '../lib/api';

/**
 * TYPESCRIPT INTERFACES
 * ---------------------
 * Define the shape of data we send/receive
 * 
 * WHY?
 * - Type safety (catch errors at compile time, not runtime)
 * - Autocomplete in VS Code
 * - Self-documenting code
 */

// Login request data
export interface LoginCredentials {
  email: string;
  password: string;
}

// Register request data
export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

// User object returned from backend
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'ADMIN';
  emailVerified: boolean;
  createdAt?: string;
}

// Authentication response (login/register)
export interface AuthResponse {
  user: User;
  message?: string;
  // NO TOKEN! It's in httpOnly cookie now
}

/**
 * AUTHENTICATION SERVICE
 * ----------------------
 * Collection of functions for auth operations
 */
const authService = {
  /**
   * LOGIN
   * -----
   * Authenticate user with email & password
   * 
   * BACKEND ENDPOINT: POST /api/auth/login
   * 
   * Request body:
   * {
   *   "email": "student@college.edu",
   *   "password": "password123"
   * }
   * 
   * Success Response (200):
   * {
   *   "user": { id, email, name, role, emailVerified },
   *   "message": "Login successful"
   * }
   * 
   * + httpOnly cookie set with token
   * 
   * Error Responses:
   * - 400: Invalid email/password format
   * - 401: Incorrect credentials
   * - 500: Server error
   * 
   * @param credentials - Email and password
   * @returns Promise with user data and JWT token
   * 
   * USAGE IN COMPONENT:
   * try {
   *   const { user } = await authService.login({ email, password });
   *   // Token is automatically set in httpOnly cookie by backend
   *   // Save user to Zustand store
   *   login(user);
   *   navigate('/');
   * } catch (error) {
   *   // Show error message
   *   setError('Invalid credentials');
   * }
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    /**
     * HOW THIS WORKS:
     * 1. api.post() sends POST request to http://localhost:5000/api/auth/login
     * 2. Includes credentials in request body as JSON
     * 3. withCredentials: true allows cookies to be set
     * 4. Backend validates credentials
     * 5. Backend sets httpOnly cookie with JWT token
     * 6. Returns response with user data (no token in body!)
     * 7. Browser stores cookie automatically
     * 8. Future requests automatically include cookie
     */
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * REGISTER
   * --------
   * Create new user account
   * 
   * BACKEND ENDPOINT: POST /api/auth/register
   * 
   * Request body:
   * {
   *   "email": "newstudent@college.edu",
   *   "password": "SecurePass123!",
   *   "name": "John Doe"
   * }
   * 
   * Success Response (201):
   * {
   *   "user": { id, email, name, role, emailVerified: false },
   *   "message": "Registration successful. Please verify your email."
   * }
   * 
   * + httpOnly cookie set with token
   * 
   * Error Responses:
   * - 400: Invalid data (weak password, invalid email)
   * - 409: Email already exists
   * - 500: Server error
   * 
   * @param data - Email, password, and name
   * @returns Promise with user data and JWT token
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * VERIFY EMAIL
   * ------------
   * Confirm email address using verification token
   * 
   * BACKEND ENDPOINT: POST /api/auth/verify-email
   * 
   * Request body:
   * {
   *   "token": "verification-token-from-email"
   * }
   * 
   * Success Response (200):
   * {
   *   "message": "Email verified successfully",
   *   "user": { id, email, name, role, emailVerified: true }
   * }
   * 
   * Error Responses:
   * - 400: Invalid or expired token
   * - 404: User not found
   * 
   * @param token - Verification token from email link
   * @returns Promise with success message and updated user
   */
  verifyEmail: async (token: string): Promise<{ message: string; user: User }> => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  /**
   * RESEND VERIFICATION EMAIL
   * -------------------------
   * Request new verification email
   * 
   * BACKEND ENDPOINT: POST /api/auth/resend-verification
   * 
   * Request body:
   * {
   *   "email": "student@college.edu"
   * }
   * 
   * Success Response (200):
   * {
   *   "message": "Verification email sent",
   *   "email": "student@college.edu",
   *   "expiresAt": "2024-01-24T10:00:00Z"
   * }
   * 
   * @param email - User's email address
   * @returns Promise with confirmation message
   */
  resendVerification: async (email: string): Promise<{ message: string; email: string }> => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  /**
   * LOGOUT
   * ------
   * Clear authentication - both client and server side
   * 
   * BACKEND ENDPOINT: POST /api/auth/logout
   * 
   * This clears the httpOnly cookie on the server
   * AND blacklists the token to prevent reuse
   * More secure than client-side only logout
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
      // Cookie is cleared by backend, token is blacklisted
    } catch (error) {
      // Even if API fails, clear client state
      console.error('Logout API failed:', error);
    }
  },

  /**
   * REFRESH TOKEN
   * -------------
   * Get a new access token using the refresh token
   * 
   * BACKEND ENDPOINT: POST /api/auth/refresh
   * 
   * Interview Q: Why refresh tokens?
   * -> Access tokens are short-lived (15 min) for security
   * -> Refresh tokens allow silent re-authentication
   * -> Better UX - user doesn't get logged out constantly
   * 
   * Flow:
   * 1. Access token expires (15 min)
   * 2. API returns 401
   * 3. Frontend calls refresh endpoint
   * 4. Backend validates refresh token, issues new access token
   * 5. Original request is retried automatically
   * 
   * Success Response (200):
   * {
   *   "message": "Token refreshed successfully",
   *   "user": { id, email, name, role }
   * }
   * 
   * Error Responses:
   * - 401: Refresh token expired/invalid → must login again
   * 
   * @returns Promise with user data
   */
  refreshToken: async (): Promise<{ user: User; message: string }> => {
    const response = await api.post<{ user: User; message: string }>('/auth/refresh');
    return response.data;
  },

  /**
   * VERIFY TOKEN
   * ------------
   * Check if the current authentication token is valid
   * 
   * BACKEND ENDPOINT: GET /api/auth/verify
   * 
   * This endpoint verifies the httpOnly cookie token
   * Used by ProtectedRoute to validate authentication state
   * 
   * Success Response (200):
   * {
   *   "user": { id, email, name, role, emailVerified }
   * }
   * 
   * Error Response (401):
   * - Token expired or invalid
   * 
   * @returns Promise with user data if authenticated
   */
  verifyToken: async (): Promise<{ user: User }> => {
    const response = await api.get<{ user: User }>('/auth/verify');
    return response.data;
  },
};

export default authService;

/**
 * LEARNING SUMMARY - Step 2 Complete!
 * ------------------------------------
 * 
 * ✅ Created service layer for authentication
 * ✅ Defined TypeScript interfaces for type safety
 * ✅ Documented each function with usage examples
 * ✅ Explained request/response formats
 * 
 * KEY CONCEPTS LEARNED:
 * 1. Service Layer Pattern - Separate API logic from UI
 * 2. Type Safety - TypeScript interfaces catch errors early
 * 3. Async/Await - Handle promises cleanly
 * 4. Error Propagation - Let components handle errors their way
 * 
 * NEXT STEP:
 * Integrate authService.login() into Login.tsx component
 * Replace mock API call with real one!
 * 
 * In Login.tsx, we'll change:
 *   await new Promise((resolve) => setTimeout(resolve, 1500)); // Mock
 *   const mockResponse = { ... };
 * 
 * To:
 *   const response = await authService.login(data);
 * 
 * Ready? Tell me when to proceed to Step 3!
 */
