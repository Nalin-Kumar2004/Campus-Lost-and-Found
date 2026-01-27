/**
 * LOGIN PAGE - User authentication
 * 
 * This demonstrates:
 * - Form validation with Zod
 * - API integration (authentication endpoint)
 * - Global state management (Zustand)
 * - Protected route redirection
 * - Error handling with user feedback
 * 
 * AUTHENTICATION FLOW:
 * 
 * 1. User enters email + password
 * 2. Frontend validates format (Zod)
 * 3. Send credentials to API (POST /auth/login)
 * 4. API validates against database
 * 5. API returns JWT token + user data
 * 6. Save to Zustand store + localStorage
 * 7. Redirect to home or intended page
 * 
 * SECURITY CONSIDERATIONS:
 * - Never store passwords in state
 * - Always use HTTPS in production
 * - Tokens expire (handle refresh)
 * - Validate on both client and server
 */

import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../store/authStore';
import authService from '../services/auth.service';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { ButtonSpinner } from '../components/Spinner';
import type { LocationState, ApiError } from '../types';
import { getErrorMessage } from '../types';

/**
 * VALIDATION SCHEMA
 * Define what makes valid login credentials
 */
const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase(), // Normalize to lowercase
  
  password: z.string()
    .min(1, 'Password is required'),
    // Note: No min length on login (only on registration)
    // User might have old account with shorter password
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  
  /**
   * LOCATION STATE
   * When user tries to access protected route, we redirect to login
   * We save the intended destination in location.state
   * After login, redirect to that page instead of home
   * 
   * Example: User clicks "My Items" → not logged in → redirect to /login
   * location.state.from = "/my-items"
   * After login → navigate to "/my-items" instead of "/"
   */
  const state = location.state as LocationState | null;
  const from = state?.from?.pathname || '/';

  /**
   * ZUSTAND AUTH STORE
   * Access global authentication functions
   */
  const login = useAuthStore((state) => state.login);

  /**
   * LOCAL STATE
   */
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string>('');

  /**
   * FORM SETUP
   */
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  /**
   * SUBMIT HANDLER
   * 
   * This is where the authentication magic happens!
   */
  const onSubmit = async (data: LoginFormData) => {
    try {
      // Clear previous errors
      setApiError('');

      /**
       * REAL API CALL - Authenticate user
       * 
       * This calls your backend at http://localhost:5000/api/auth/login
       * Backend validates credentials and sets httpOnly cookie
       * Returns user data (no token in response - it's in cookie!)
       */
      const response = await authService.login({
        email: data.email,
        password: data.password,
      });

      /**
       * SAVE TO STORE
       * Token is already in httpOnly cookie (browser manages it)
       * We just save user data to Zustand store
       * Now user is logged in across entire app!
       */
      login(response.user);

      /**
       * SUCCESS!
       * Redirect to intended page or home
       */
      navigate(from, { replace: true });
      
    } catch (err) {
      /**
       * ERROR HANDLING
       * 
       * Different error types:
       * - 401: Invalid credentials
       * - 403: Account locked/suspended
       * - 404: User not found
       * - 500: Server error
       */
      const error = err as ApiError;
      console.error('Login error:', error);
      
      // Set user-friendly error message
      if (error.response?.status === 401) {
        setApiError('Invalid email or password');
      } else if (error.response?.status === 403) {
        setApiError('Account is locked. Please contact support.');
      } else {
        setApiError(error.response?.data?.error || 'Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden flex items-center justify-center px-4 pt-20 pb-8">
      {/* Decorative blur orbs */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-full blur-3xl"></div>
      <div className="absolute bottom-40 left-20 w-96 h-96 bg-gradient-to-br from-blue-100/40 to-indigo-100/40 rounded-full blur-3xl"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* HEADER */}
        <div className="text-center mb-5 fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              Welcome Back
            </span>
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            Sign in to access your account
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-white/80 backdrop-blur-2xl border-2 border-white/60 rounded-3xl p-7 shadow-[0_8px_32px_rgba(99,102,241,0.15)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.25)] transition-all duration-500 fade-in animation-delay-200">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* GLOBAL ERROR MESSAGE */}
            {apiError && (
              <div className="bg-red-50/80 backdrop-blur-sm border-2 border-red-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  </div>
                  <p className="text-sm text-red-700 font-medium">{apiError}</p>
                </div>
              </div>
            )}

            {/* EMAIL FIELD */}
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-0 group-focus-within:opacity-5 transition-all blur-lg"></div>
                <div className="relative flex items-center">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg flex items-center justify-center group-focus-within:from-indigo-100 group-focus-within:to-purple-100 transition-colors">
                    <Mail className="w-4 h-4 text-indigo-600" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="your.email@college.edu"
                    {...register('email')}
                    className="w-full pl-12 pr-4 py-2.5 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all hover:border-gray-300"
                  />
                </div>
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* PASSWORD FIELD */}
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-0 group-focus-within:opacity-5 transition-all blur-lg"></div>
                <div className="relative flex items-center">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg flex items-center justify-center group-focus-within:from-indigo-100 group-focus-within:to-purple-100 transition-colors">
                    <Lock className="w-4 h-4 text-indigo-600" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password')}
                    className="w-full pl-12 pr-12 py-2.5 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all hover:border-gray-300"
                  />
                  {/* TOGGLE PASSWORD VISIBILITY */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* FORGOT PASSWORD LINK */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-5 h-5 border-2 border-gray-300 rounded-md accent-indigo-600 hover:border-indigo-400 transition-colors cursor-pointer"
                />
                <span className="text-gray-600 font-medium group-hover:text-gray-900 transition-colors">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-indigo-600 font-bold hover:text-purple-600 hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 overflow-hidden"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"></div>
              
              <span className="relative">
                {isSubmitting ? (
                  <>
                    <ButtonSpinner />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </span>
            </button>
          </form>

          {/* DIVIDER */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/80 text-gray-600 font-medium">
                Don't have an account?
              </span>
            </div>
          </div>

          {/* REGISTER LINK */}
          <Link
            to="/register"
            className="block w-full text-center py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:border-indigo-300 transition-all font-bold"
          >
            Create an Account
          </Link>
        </div>

        {/* FOOTER INFO */}
        <p className="text-center text-sm text-gray-600 mt-5 font-medium">
          By signing in, you agree to our{' '}
          <Link to="/terms" className="text-indigo-600 font-bold hover:text-purple-600 hover:underline transition-colors">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-indigo-600 font-bold hover:text-purple-600 hover:underline transition-colors">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

