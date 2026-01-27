/**
 * ERROR BOUNDARY - Catches JavaScript errors anywhere in child component tree
 * 
 * INTERVIEW CONCEPTS:
 * -------------------
 * 1. Class Component: Error boundaries MUST be class components (as of React 18)
 *    - Functional components cannot use componentDidCatch or getDerivedStateFromError
 * 
 * 2. Error Boundaries catch:
 *    - Errors during rendering
 *    - Errors in lifecycle methods
 *    - Errors in constructors
 * 
 * 3. Error Boundaries do NOT catch:
 *    - Event handlers (use try/catch)
 *    - Async code (promises, setTimeout)
 *    - Server-side rendering
 *    - Errors in the error boundary itself
 * 
 * WHY THIS MATTERS:
 * Without error boundaries, a single component crash takes down the entire app.
 * With error boundaries, you can show a fallback UI and keep other parts working.
 * 
 * PRODUCTION TIP:
 * Integrate with error tracking services like Sentry, LogRocket, or Bugsnag
 * to automatically report errors.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * STATIC LIFECYCLE METHOD
   * Called when an error is thrown in a descendant component.
   * Returns an object to update state.
   * 
   * This runs during the "render" phase, so side effects are not allowed.
   */
  static getDerivedStateFromError(error: Error): State {
    // Update state to render fallback UI
    return { hasError: true, error };
  }

  /**
   * LIFECYCLE METHOD
   * Called after an error has been thrown by a descendant component.
   * Good for logging errors to an error reporting service.
   * 
   * This runs during the "commit" phase, so side effects are allowed.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Store error info for display
    this.setState({ errorInfo });

    /**
     * PRODUCTION: Send to error tracking service
     * 
     * Example with Sentry:
     * Sentry.captureException(error, { extra: errorInfo });
     * 
     * Example with custom API:
     * fetch('/api/log-error', {
     *   method: 'POST',
     *   body: JSON.stringify({
     *     error: error.message,
     *     stack: error.stack,
     *     componentStack: errorInfo.componentStack
     *   })
     * });
     */
  }

  /**
   * Reset error state to allow retry
   */
  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  /**
   * Reload the entire page
   */
  handleReload = () => {
    window.location.reload();
  };

  /**
   * Navigate to home page
   */
  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided via props
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            {/* Error Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-red-100 p-8 text-center">
              {/* Icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>

              {/* Description */}
              <p className="text-gray-600 mb-6">
                We're sorry, but something unexpected happened. 
                Please try refreshing the page or go back to the home page.
              </p>

              {/* Error details (development only) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="mb-6 p-4 bg-red-50 rounded-xl text-left">
                  <p className="text-sm font-mono text-red-700 break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-600 cursor-pointer hover:underline">
                        View stack trace
                      </summary>
                      <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReload}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Page
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all duration-300"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>
            </div>

            {/* Support text */}
            <p className="text-center text-sm text-gray-500 mt-6">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    // No error - render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
