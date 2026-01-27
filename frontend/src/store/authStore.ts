/**
 * AUTHENTICATION STORE - Global state management with Zustand
 * 
 * WHAT IS ZUSTAND?
 * - Lightweight state management library (alternative to Redux)
 * - Simple API, minimal boilerplate
 * - TypeScript-friendly
 * - No Context Provider needed
 * 
 * WHY USE ZUSTAND FOR AUTH?
 * - Auth state needed across many components (navbar, protected routes, etc.)
 * - Persists to localStorage (stay logged in after refresh)
 * - Centralized authentication logic
 * 
 * LEARNING CONCEPTS:
 * 
 * 1. Global State vs Local State:
 *    - Local (useState): Component-specific, lost on unmount
 *    - Global (Zustand): Shared across app, persists
 * 
 * 2. JWT (JSON Web Tokens):
 *    - Stateless authentication
 *    - Server issues token on login
 *    - Client sends token with each request
 *    - Token contains user data (encoded, not encrypted!)
 * 
 * 3. Persist Middleware:
 *    - Saves state to localStorage
 *    - Restores on page reload
 *    - User stays logged in
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * USER INTERFACE
 * Represents logged-in user data
 */
interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'ADMIN';
  emailVerified: boolean;
}

/**
 * AUTH STATE INTERFACE
 * Defines the shape of our authentication store
 */
interface AuthState {
  // State
  user: User | null;              // Current user (null = not logged in)
  isAuthenticated: boolean;        // Quick check if logged in
  
  // Actions (functions that modify state)
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

/**
 * CREATE ZUSTAND STORE
 * 
 * Pattern: create<Interface>((set, get) => ({ ... }))
 * 
 * set: Function to update state
 * get: Function to read current state
 * 
 * persist() middleware saves to localStorage
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      /**
       * INITIAL STATE
       * Default values when store is created
       */
      user: null,
      isAuthenticated: false,

      /**
       * LOGIN ACTION
       * Called after successful login API call
       * 
       * Flow:
       * 1. User submits login form
       * 2. API validates credentials
       * 3. API sets httpOnly cookie with JWT token
       * 4. API returns user data
       * 5. We call this function to save user to store
       * 6. User is now logged in across entire app!
       * 
       * @param user - User object from API
       */
      login: (user: User) => {
        set({
          user,
          isAuthenticated: true,
        });
        
        /**
         * NO TOKEN STORAGE!
         * Token is in httpOnly cookie, managed by browser
         * More secure: JavaScript can't access it
         */
      },

      /**
       * LOGOUT ACTION
       * Clears all auth data
       * 
       * Flow:
       * 1. User clicks logout button
       * 2. Call logout API (clears httpOnly cookie)
       * 3. We call this function to clear local state
       * 4. User is logged out
       */
      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
        
        /**
         * NO TOKEN TO REMOVE!
         * httpOnly cookie is cleared by backend on logout API call
         */
      },

      /**
       * UPDATE USER ACTION
       * Update specific user fields without re-logging in
       * 
       * Use case: User updates profile, email verification
       * 
       * Partial<User> means we only need to provide fields we want to update
       */
      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },
    }),
    {
      /**
       * PERSIST CONFIGURATION
       * 
       * name: localStorage key
       * partialize: Which parts of state to save
       *   We only save user data (token is in httpOnly cookie)
       */
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * USAGE EXAMPLE:
 * 
 * // In any component:
 * import { useAuthStore } from '@/store/authStore';
 * 
 * function MyComponent() {
 *   const { user, isAuthenticated, login, logout } = useAuthStore();
 *   
 *   if (!isAuthenticated) {
 *     return <LoginPrompt />;
 *   }
 *   
 *   return (
 *     <div>
 *       <p>Welcome, {user.name}!</p>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 * 
 * WHY THIS IS BETTER THAN CONTEXT:
 * - No Provider wrapper needed
 * - Less boilerplate
 * - Better performance (only re-renders components using changed values)
 * - Built-in persistence
 * - Easier to test
 */
