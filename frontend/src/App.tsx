/**
 * APP.TSX - Root Application Component
 * 
 * This is the top-level component that sets up routing for the entire app.
 * 
 * REACT ROUTER CONCEPTS:
 * 
 * 1. BrowserRouter: Provides routing context using HTML5 History API
 *    - Enables navigation without page refresh (SPA - Single Page Application)
 *    - Manages browser history (back/forward buttons)
 * 
 * 2. Routes: Container for all route definitions
 *    - Only one route is rendered at a time based on URL
 * 
 * 3. Route: Defines a mapping between URL path and component
 *    - path: URL pattern to match
 *    - element: Component to render when path matches
 * 
 * NAVIGATION FLOW:
 * User clicks link → URL changes → Router matches path → Renders component
 */

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

// Page Components
import Home from './pages/Home';
import BrowseItems from './pages/BrowseItems';
import ItemDetails from './pages/ItemDetails';
import PostItem from './pages/PostItem';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import MyItems from './pages/MyItems';
import Claims from './pages/Claims';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminItems from './pages/AdminItems';
import NotFound from './pages/NotFound';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Footer from './components/Footer';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ErrorBoundary from './components/ErrorBoundary';

// Toast Notification System
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';

/**
 * MAIN APP COMPONENT
 * 
 * Best Practice: Keep App.tsx clean and focused on routing
 * Business logic should be in individual page components
 */

// Scroll to top component
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <ScrollToTop />
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-1 transition-all duration-700 ease-out">
              <Routes>
              {/* 
                HOME ROUTE 
                Path "/" means this is the default/landing page
                When user visits http://localhost:5173/, Home component renders
              */}
              <Route path="/" element={<Home />} />
              
              {/* 
                BROWSE ITEMS ROUTE
              Path "/browse" shows all items with search and filters
              This is where users can search through all lost and found items
            */}
            <Route path="/browse" element={<BrowseItems />} />
            
            {/* 
              ITEM DETAILS ROUTE - DYNAMIC ROUTE
              :id is a URL parameter - can be any value
              Examples: /items/123, /items/abc, /items/xyz
              
              The :id value is accessible in the component via useParams() hook
              This allows one component to display different items based on URL
            */}
            <Route path="/items/:id" element={<ItemDetails />} />
            
            {/*
              POST ITEM ROUTE - Form page
              Users can report lost or found items
            */}
            <Route path="/post-item" element={<PostItem />} />
            
            {/*
              AUTHENTICATION ROUTES
              Login and register pages for user authentication
            */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/*
              EMAIL VERIFICATION ROUTE
              Handles email verification links sent to user's inbox
              Example: /verify-email?token=abc123xyz
            */}
            <Route path="/verify-email" element={<VerifyEmail />} />
            
            {/*
              MY ITEMS ROUTE - Protected
              Dashboard for users to manage their posted items
              Requires authentication - ProtectedRoute checks auth and redirects if needed
            */}
            <Route path="/my-items" element={
              <ProtectedRoute>
                <MyItems />
              </ProtectedRoute>
            } />
            
            {/*
              CLAIMS ROUTE - Protected
              Manage claims made on user's found items
              Review, approve, or reject claims from other users
              ProtectedRoute ensures only authenticated users can access
            */}
            <Route path="/claims" element={
              <ProtectedRoute>
                <Claims />
              </ProtectedRoute>
            } />

            {/*
              ADMIN ROUTES - Admin Only
              Dashboard, user management, and item moderation
              Requires ADMIN role
            */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/users" element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminUsers />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/items" element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminItems />
              </ProtectedRoute>
            } />

            {/*
              PRIVACY POLICY ROUTE
              Legal page showing privacy practices and data handling
            */}
            <Route path="/privacy" element={<PrivacyPolicy />} />

            {/*
              404 NOT FOUND ROUTE
              Catch-all route for any unmatched URLs
              Must be the LAST route in the list
              path="*" matches anything not matched above
            */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <ToastContainer />
        </div>
      </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App
