/**
 * VERIFY EMAIL PAGE
 * 
 * Purpose: Handle email verification when user clicks link from their inbox
 * Flow: Email link → This page → Verify token → Show result
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { Spinner } from '../components/Spinner';
import type { ApiError } from '../types';

type VerificationStatus = 'loading' | 'success' | 'error' | 'invalid';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  // Extract token from URL: /verify-email?token=abc123
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setErrorMessage('No verification token provided');
      return;
    }

    verifyEmailToken(token);
  }, [token]);

  const verifyEmailToken = async (verificationToken: string) => {
    try {
      setStatus('loading');
      
      const response = await api.post('/auth/verify-email', {
        token: verificationToken
      });

      console.log('✅ Email verified:', response.data);
      
      setStatus('success');
      addToast('Email verified successfully! You can now log in.', 'success');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      const error = err as ApiError;
      console.error('❌ Verification failed:', error);
      
      setStatus('error');
      const message = error.response?.data?.error || 'Verification failed';
      setErrorMessage(message);
      
      addToast(message, 'error');
    }
  };

  const handleResendVerification = async () => {
    if (!resendEmail || !resendEmail.includes('@')) {
      addToast('Please enter a valid email address', 'error');
      return;
    }

    try {
      setIsResending(true);
      
      await api.post('/auth/resend-verification', {
        email: resendEmail
      });

      addToast('Verification email sent! Check your inbox.', 'success');
      setResendEmail('');
      
    } catch (err) {
      const error = err as ApiError;
      console.error('Resend error:', error);
      addToast(error.response?.data?.error || 'Failed to resend email', 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        
        {/* LOADING STATE */}
        {status === 'loading' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verifying Your Email
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your email address...
            </p>
          </div>
        )}

        {/* SUCCESS STATE */}
        {status === 'success' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Email Verified! ✅
            </h2>
            <p className="text-gray-600 mb-6">
              Your email has been successfully verified. You can now log in to your account.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Redirecting to login page...
            </p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Go to Login
            </Link>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Verification Failed
            </h2>
            <p className="text-gray-600 text-center mb-6">
              {errorMessage}
            </p>

            {/* RESEND VERIFICATION FORM */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Need a new verification link?
              </h3>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResending ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link to="/login" className="text-blue-600 hover:underline text-sm">
                Back to Login
              </Link>
            </div>
          </div>
        )}

        {/* INVALID TOKEN STATE */}
        {status === 'invalid' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Invalid Link
            </h2>
            <p className="text-gray-600 text-center mb-6">
              {errorMessage}
            </p>
            <div className="text-center">
              <Link
                to="/register"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Go to Register
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
