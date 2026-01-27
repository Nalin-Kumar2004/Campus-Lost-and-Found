/**
 * REGISTER PAGE - New user signup
 * 
 * This demonstrates:
 * - Multi-field form validation
 * - Password strength requirements
 * - Password confirmation matching
 * - Terms acceptance
 * - Account creation flow
 * 
 * REGISTRATION FLOW:
 * 
 * 1. User fills registration form
 * 2. Frontend validates all fields
 * 3. Send data to API (POST /auth/register)
 * 4. API creates user account
 * 5. API sends verification email
 * 6. Auto-login or redirect to verify email page
 * 
 * PASSWORD SECURITY BEST PRACTICES:
 * - Minimum 8 characters
 * - Mix of uppercase, lowercase, numbers, symbols
 * - Check against common passwords
 * - Never store plain text passwords
 * - Use bcrypt/argon2 for hashing (server-side)
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../store/authStore';
import authService from '../services/auth.service';
import { useToast } from '../contexts/ToastContext';
import type { ApiError } from '../types';
import { 
  User, 
  Mail, 
  Lock, 
  AlertCircle, 
  Eye, 
  EyeOff,
  CheckCircle2,
  X
} from 'lucide-react';
import { ButtonSpinner } from '../components/Spinner';

/**
 * PASSWORD VALIDATION SCHEMA
 * Reusable password rules for consistent validation
 * MUST MATCH BACKEND REQUIREMENTS in backend/src/utils/password.ts
 */
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*]/, 'Password must contain special character (!@#$%^&*)');

/**
 * REGISTRATION FORM SCHEMA
 * 
 * Advanced Zod features:
 * - .refine(): Custom validation logic
 * - .regex(): Pattern matching
 * - .email(): Built-in email validator
 */
const registerSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase()
    // College email validation (optional)
    .refine(
      (email) => email.endsWith('.edu') || email.endsWith('college.edu'),
      'Must be a valid college email address'
    ),
  
  password: passwordSchema,
  
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
  
  acceptTerms: z.boolean()
    .refine((val) => val === true, 'You must accept the terms and conditions'),
  
}).refine(
  /**
   * CUSTOM VALIDATION: Password Match
   * This runs after individual field validation
   * Compares password and confirmPassword fields
   */
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'], // Which field gets the error
  }
);

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const toast = useToast();

  /**
   * LOCAL STATE
   */
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState<string>('');

  /**
   * FORM SETUP
   */
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange', // Validate on every change for better UX
  });

  /**
   * WATCH PASSWORD for strength indicator
   */
  const password = watch('password', '');

  /**
   * PASSWORD STRENGTH CALCULATOR
   * Returns score 0-4 based on password criteria
   */
  const getPasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++; // Special characters
    return Math.min(strength, 4);
  };

  const passwordStrength = getPasswordStrength(password);

  /**
   * STRENGTH INDICATOR CONFIG
   */
  const strengthConfig = [
    { label: 'Too weak', color: 'bg-red-500', textColor: 'text-red-600' },
    { label: 'Weak', color: 'bg-orange-500', textColor: 'text-orange-600' },
    { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
    { label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-600' },
    { label: 'Strong', color: 'bg-green-500', textColor: 'text-green-600' },
  ];

  /**
   * PASSWORD REQUIREMENTS CHECKLIST
   * MUST MATCH BACKEND REQUIREMENTS in backend/src/utils/password.ts
   */
  const passwordRequirements = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), text: 'One uppercase letter (A-Z)' },
    { met: /[a-z]/.test(password), text: 'One lowercase letter (a-z)' },
    { met: /[0-9]/.test(password), text: 'One number (0-9)' },
    { met: /[!@#$%^&*]/.test(password), text: 'One special character (!@#$%^&*)' },
  ];

  /**
   * SUBMIT HANDLER
   */
  const onSubmit = async (data: RegisterFormData) => {
    try {
      setApiError('');

      /**
       * REAL API CALL - Create new user account
       * Calls http://localhost:5000/api/auth/register
       * Backend creates user and sets httpOnly cookie
       * Returns user data (token is in cookie)
       */
      const response = await authService.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      /**
       * AUTO-LOGIN after registration
       * Token is already in httpOnly cookie
       * Just save user to Zustand store
       */
      login(response.user);

      /**
       * SUCCESS!
       * Show success message and redirect
       */
      toast.success('Account created successfully! Welcome to Campus Lost & Found!');
      navigate('/');
      
    } catch (err) {
      const error = err as ApiError;
      console.error('Registration error:', error);
      
      if (error.response?.status === 409) {
        setApiError('An account with this email already exists');
      } else if (error.response?.status === 400) {
        setApiError(error.response?.data?.message || 'Invalid registration data');
      } else {
        setApiError(error.response?.data?.error || 'Registration failed. Please try again.');
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
        <div className="text-center mt-6 mb-4 fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              Create Account
            </span>
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            Join Campus Lost & Found to help reunite lost items
          </p>
        </div>

        {/* REGISTER CARD */}
        <div className="bg-white/80 backdrop-blur-2xl border-2 border-white/60 rounded-3xl p-6 shadow-[0_8px_32px_rgba(99,102,241,0.15)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.25)] transition-all duration-500 fade-in animation-delay-200">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            {/* GLOBAL ERROR */}
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

            {/* NAME FIELD */}
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-0 group-focus-within:opacity-5 transition-all blur-lg"></div>
                <div className="relative flex items-center">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg flex items-center justify-center group-focus-within:from-indigo-100 group-focus-within:to-purple-100 transition-colors">
                    <User className="w-4 h-4 text-indigo-600" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="John Doe"
                    {...register('name')}
                    className="w-full pl-12 pr-4 py-2 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all hover:border-gray-300"
                  />
                </div>
              </div>
              {errors.name && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="w-4 h-4" />
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* EMAIL FIELD */}
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                College Email
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
                    className="w-full pl-12 pr-4 py-2 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all hover:border-gray-300"
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
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register('password')}
                    className="w-full pl-12 pr-12 py-2 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all hover:border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* PASSWORD STRENGTH INDICATOR */}
              {password && (
                <div className="mt-2.5 p-3 bg-gradient-to-br from-gray-50 to-indigo-50/30 rounded-xl border border-indigo-100/50 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex gap-1.5 mb-2">
                    {[0, 1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                          index < passwordStrength
                            ? strengthConfig[passwordStrength].color + ' shadow-sm'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-sm font-bold ${strengthConfig[passwordStrength].textColor}`}>
                    Password Strength: {strengthConfig[passwordStrength].label}
                  </p>
                </div>
              )}

              {/* PASSWORD REQUIREMENTS */}
              {password && (
                <div className="mt-2.5 p-3 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2.5 text-sm group">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        req.met 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-sm' 
                          : 'bg-gray-200'
                      }`}>
                        {req.met ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </div>
                      <span className={`font-medium transition-colors ${
                        req.met ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        {req.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {errors.password && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-0 group-focus-within:opacity-5 transition-all blur-lg"></div>
                <div className="relative flex items-center">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg flex items-center justify-center group-focus-within:from-indigo-100 group-focus-within:to-purple-100 transition-colors">
                    <Lock className="w-4 h-4 text-indigo-600" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    className="w-full pl-12 pr-12 py-2 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all hover:border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="w-4 h-4" />
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* TERMS ACCEPTANCE */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  {...register('acceptTerms')}
                  className="mt-0.5 w-5 h-5 border-2 border-gray-300 rounded-md accent-indigo-600 hover:border-indigo-400 transition-colors cursor-pointer"
                />
                <span className="text-sm text-gray-600 font-medium leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" className="text-indigo-600 font-bold hover:text-purple-600 hover:underline transition-colors">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-indigo-600 font-bold hover:text-purple-600 hover:underline transition-colors">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="w-4 h-4" />
                  {errors.acceptTerms.message}
                </p>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 overflow-hidden"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"></div>
              
              <span className="relative">
                {isSubmitting ? (
                  <>
                    <ButtonSpinner />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </span>
            </button>
          </form>

          {/* LOGIN LINK */}
          <div className="mt-4 pt-4 border-t-2 border-gray-100 text-center">
            <p className="text-sm text-gray-600 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 font-bold hover:text-purple-600 hover:underline transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

