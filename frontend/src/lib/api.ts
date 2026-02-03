/**
 * AXIOS CONFIGURATION - API Client Setup
 * ======================================
 * 
 * FIRST PRINCIPLES: What is this file?
 * ------------------------------------
 * This creates a pre-configured axios instance that knows:
 * 1. Where your backend server is (base URL)
 * 2. What headers to include in every request
 * 3. How to handle authentication (JWT tokens via httpOnly cookies)
 * 4. How to automatically refresh expired tokens
 * 5. What to do when requests succeed or fail
 * 
 * WHY USE AXIOS INSTEAD OF FETCH?
 * --------------------------------
 * - Automatic JSON parsing (fetch requires .json())
 * - Interceptors for auth tokens (fetch requires manual headers)
 * - Better error handling (fetch treats 404/500 as "success")
 * - Request/response transformations
 * - Timeout support
 * - Cancel requests
 * 
 * INTERVIEW CONCEPT: Token Refresh Flow
 * --------------------------------------
 * 1. User makes request → Access token expired (401)
 * 2. Interceptor catches 401 → Calls /refresh endpoint
 * 3. Backend validates refresh token → Issues new access token
 * 4. Interceptor retries original request with new token
 * 5. User never notices (seamless experience)
 * 
 * This is called "Silent Refresh" - a key interview topic!
 */

import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

/**
 * BASE URL CONFIGURATION
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Token refresh state management
 * 
 * Interview Q: Why track refresh state?
 * -> Prevent multiple refresh requests if several API calls fail simultaneously
 * -> Queue failed requests and retry them after refresh succeeds
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

/**
 * Process queued requests after token refresh
 */
const processQueue = (error: Error | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

/**
 * CREATE AXIOS INSTANCE
 * 
 * Note: Timeout set to 180s (3 minutes) to handle Render free-tier cold starts.
 * Cold starts can take 60-120 seconds when the server is sleeping.
 * This is a temporary measure for development - consider upgrading to paid tier in production.
 */
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 180000, // 180 seconds (3 minutes) for generous cold start tolerance
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // CRITICAL: Include cookies in cross-origin requests
});

/**
 * REQUEST INTERCEPTOR
 * 
 * FIRST PRINCIPLE: What happens here?
 * ------------------------------------
 * With httpOnly cookies, we DON'T need to add tokens manually!
 * The browser automatically includes the cookie with every request.
 * 
 * This interceptor is now mainly for logging/debugging.
 * You can add other headers here if needed (e.g., API keys, custom headers).
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    /**
     * NO TOKEN HANDLING NEEDED!
     * Browser automatically includes httpOnly cookie
     * Backend reads from req.cookies.token
     * 
     * This is the magic of httpOnly cookies:
     * - More secure (no JavaScript access)
     * - Less code (no manual token management)
     * - Automatic (browser handles everything)
     */
    
    // Optional: Log requests in development
    if (import.meta.env.DEV) {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    // Return config so request continues
    return config;
  },
  (error: AxiosError) => {
    /**
     * REQUEST ERROR
     * This runs if there's an error BEFORE request is sent
     * Examples: Network offline, invalid config
     */
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR - With Automatic Token Refresh
 * 
 * INTERVIEW CONCEPT: Silent Token Refresh
 * ----------------------------------------
 * When access token expires:
 * 1. Request fails with 401
 * 2. Interceptor catches it
 * 3. Calls /refresh to get new access token
 * 4. Retries the original request
 * 5. User never knows token expired!
 * 
 * Edge case: Multiple requests fail at once
 * -> Only make ONE refresh request
 * -> Queue other requests until refresh completes
 * -> Retry all queued requests
 */
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Success - just pass through
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const errorCode = (error.response?.data as { code?: string })?.code;

    /**
     * TOKEN EXPIRED - Attempt silent refresh
     * 
     * Conditions for refresh:
     * 1. Status is 401 (Unauthorized)
     * 2. Error code indicates expired token (not revoked/invalid)
     * 3. This request hasn't already been retried
     * 4. Not the refresh endpoint itself (prevent infinite loop!)
     */
    const isTokenExpired = status === 401 && errorCode === 'TOKEN_EXPIRED';
    const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh');
    const hasNotRetried = !originalRequest?._retry;

    if (isTokenExpired && hasNotRetried && !isRefreshEndpoint) {
      // Mark this request as retried to prevent infinite loops
      originalRequest._retry = true;

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          // Retry original request after refresh completes
          return api(originalRequest);
        });
      }

      isRefreshing = true;

      try {
        // Attempt to refresh the token
        await api.post('/auth/refresh');
        
        // Success! Process queued requests
        processQueue(null);
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - token is truly invalid
        processQueue(refreshError as Error);
        
        // Clear any client auth state and redirect to login
        console.error('Session expired. Please log in again.');
        window.location.href = '/login';
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    /**
     * HANDLE OTHER ERROR CASES
     */
    const message = (error.response?.data as { error?: string })?.error || error.message;

    switch (status) {
      case 401:
        // Token revoked or invalid (not just expired) - must login
        if (errorCode === 'TOKEN_REVOKED' || errorCode === 'INVALID_TOKEN') {
          console.error('Authentication invalid. Redirecting to login...');
          window.location.href = '/login';
        }
        break;

      case 403:
        console.error('Access forbidden:', message);
        break;

      case 404:
        console.error('Resource not found:', message);
        break;

      case 429:
        // Rate limited
        console.error('Too many requests. Please slow down.');
        break;

      case 500:
        console.error('Server error:', message);
        break;

      default:
        if (!error.response) {
          console.error('Network error: Server is offline or unreachable');
        } else {
          console.error('API error:', status, message);
        }
    }

    return Promise.reject(error);
  }
);

/**
 * EXPORT CONFIGURED AXIOS INSTANCE
 * 
 * Other files will import this instead of regular axios
 * 
 * Usage in components:
 * import api from '@/lib/api';
 * 
 * const items = await api.get('/items');  // Uses http://localhost:5000/api/items
 * const item = await api.post('/items', data);  // Includes auth token automatically
 */
export default api;

/**
 * LEARNING SUMMARY:
 * -----------------
 * 
 * 1. Created axios instance with baseURL (no need to repeat URL)
 * 2. Request interceptor adds JWT token to every request
 * 3. Response interceptor handles common errors globally
 * 4. Export configured instance for use across app
 * 
 * NEXT STEP:
 * Create API service functions that use this instance
 * Example: api/auth.ts, api/items.ts, api/claims.ts
 * 
 * These will be simple wrappers:
 * export const getItems = () => api.get('/items');
 * export const createItem = (data) => api.post('/items', data);
 */
