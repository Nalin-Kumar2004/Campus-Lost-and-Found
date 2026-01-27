/**
 * PROTECTED ROUTE COMPONENT
 * =========================
 * A wrapper component that guards routes requiring authentication.
 * This is a common pattern in React applications with authentication.
 * 
 * INTERVIEW CONCEPTS:
 * -------------------
 * 
 * 1. HIGHER-ORDER COMPONENT (HOC) PATTERN
 *    - Component that wraps other components
 *    - Adds additional behavior (auth check)
 *    - Reusable across multiple routes
 *    - Alternative to: Render Props, Custom Hooks
 * 
 * 2. ROUTE GUARDS / AUTH GUARDS
 *    - Prevent unauthorized access to pages
 *    - Common in Angular (Guards), Vue (Navigation Guards), React (Custom)
 *    - Three states: Loading → Authenticated → Redirect
 * 
 * 3. NAVIGATION & REDIRECTS
 *    - Navigate hook from React Router
 *    - Programmatic navigation (not <Link>)
 *    - Preserve intended destination with "from" state
 * 
 * 4. LOADING STATES
 *    - Show spinner while checking auth
 *    - Prevents flash of unauthorized content
 *    - Better UX than immediate redirect
 * 
 * WHY NOT USE useEffect IN EACH PAGE?
 * - DRY principle (Don't Repeat Yourself)
 * - Centralized auth logic
 * - Easier to maintain/update
 * - Less code duplication
 */

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { PageSpinner } from './Spinner';
import authService from '../services/auth.service';

/**
 * PROPS INTERFACE
 * children: The component to render if authenticated
 * requiredRole: Optional role requirement (e.g., 'ADMIN')
 */
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'ADMIN' | 'STUDENT';
}

/**
 * COMPONENT LOGIC FLOW:
 * 
 * 1. Component mounts
 * 2. Shows loading spinner (checking state = true)
 * 3. Verifies token with backend API
 * 4. Based on verification result:
 *    - If valid → Render children (the protected page)
 *    - If invalid/expired → Clear auth state and redirect to /login
 */
export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, user, logout, login } = useAuthStore();
  const [checking, setChecking] = useState(true);

  /**
   * REAL TOKEN VERIFICATION
   * 
   * This calls the backend to verify the httpOnly cookie token is valid.
   * 
   * Benefits of server-side verification:
   * - Catches expired tokens
   * - Handles token revocation
   * - Syncs user data with database
   * - More secure than client-only checks
   */
  useEffect(() => {
    const verifyAuth = async () => {
      // If not authenticated in store, no need to verify with server
      if (!isAuthenticated) {
        setChecking(false);
        return;
      }

      try {
        // Verify token with backend
        // httpOnly cookie is automatically included with request
        const response = await authService.verifyToken();
        
        // Update user data in store (in case it changed on server)
        if (response.user) {
          login(response.user);
        }
        
        setChecking(false);
      } catch (error) {
        // Token invalid/expired
        console.error('Token verification failed:', error);
        
        // Clear auth state and redirect to login
        logout();
        setChecking(false);
      }
    };

    verifyAuth();
  }, [isAuthenticated, login, logout]);

  /**
   * LOADING STATE
   * Show centered spinner while checking authentication
   * 
   * Why full screen?
   * - Prevents layout shift
   * - User knows something is happening
   * - Consistent with page-level loading states
   */
  if (checking) {
    return <PageSpinner text="Verifying access..." />;
  }

  /**
   * NOT AUTHENTICATED - REDIRECT
   * 
   * Navigate component from React Router v6
   * - Declarative redirect (not navigate() function)
   * - replace={true} removes this route from history
   *   (user can't go back to protected page)
   * 
   * state={{ from: location }}
   * - Saves where user tried to go
   * - After login, redirect them back here
   * - Example: User clicks /my-items → Redirect to /login
   *   → Login successful → Redirect back to /my-items
   * 
   * In Login component, use:
   * const navigate = useNavigate();
   * const location = useLocation();
   * const from = location.state?.from?.pathname || '/';
   * navigate(from, { replace: true });
   */
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  /**
   * ROLE-BASED ACCESS CONTROL
   * 
   * If a specific role is required (e.g., ADMIN), check user's role
   * If user doesn't have required role, redirect to home
   */
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  /**
   * AUTHENTICATED - RENDER CHILDREN
   * 
   * {children} is the protected page component
   * Example: <ProtectedRoute><MyItems /></ProtectedRoute>
   * children = <MyItems />
   * 
   * Fragment (<></>) is used because we just want to render children
   * without adding extra DOM elements
   */
  return <>{children}</>;
}

/**
 * USAGE IN APP.TSX:
 * 
 * Before:
 * <Route path="/my-items" element={<MyItems />} />
 * 
 * After:
 * <Route path="/my-items" element={
 *   <ProtectedRoute>
 *     <MyItems />
 *   </ProtectedRoute>
 * } />
 * 
 * ALTERNATIVE PATTERNS:
 * 
 * 1. Component Wrapper:
 * const ProtectedMyItems = () => (
 *   <ProtectedRoute><MyItems /></ProtectedRoute>
 * );
 * <Route path="/my-items" element={<ProtectedMyItems />} />
 * 
 * 2. Custom Hook (useRequireAuth):
 * function MyItems() {
 *   useRequireAuth(); // Hook that redirects if not authenticated
 *   return <div>My Items</div>;
 * }
 * 
 * 3. Loader Function (React Router v6.4+):
 * {
 *   path: '/my-items',
 *   element: <MyItems />,
 *   loader: authLoader, // Function that throws redirect
 * }
 * 
 * WHY WE CHOSE WRAPPER PATTERN:
 * - Visual clarity in route config
 * - Explicit about which routes are protected
 * - Easy to add additional checks (roles, permissions)
 * - Matches patterns from other frameworks
 */
