import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Shield, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import authService from '../services/auth.service';
import HowItWorks from './HowItWorks';

// Custom Logo SVG Icon
const LogoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Box/Package base */}
    <path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" 
          stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Check mark inside (representing "found") */}
    <path d="M9 12L11 14L15 10" 
          stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface NavItem {
  label: string;
  to: string;
  requiresAuth?: boolean;
  icon?: LucideIcon;
}

export default function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const navItems: NavItem[] = [
    { label: 'Home', to: '/' },
    { label: 'Browse Items', to: '/browse', icon: Search },
    { label: 'Post Item', to: '/post-item' },
    { label: 'My Items', to: '/my-items', requiresAuth: true },
    { label: 'Claims', to: '/claims', requiresAuth: true },
  ];

  // Add Admin link if user is admin
  const adminItems: NavItem[] = user?.role === 'ADMIN'
    ? [{ label: 'Admin', to: '/admin', requiresAuth: true }]
    : [];

  const allNavItems = [...navItems, ...adminItems];
  const filteredNavItems = allNavItems.filter((item) => !item.requiresAuth || isAuthenticated);

  const handleLogout = async () => {
    try {
      await authService.logout();
      logout();
      setUserMenuOpen(false);
      setMobileOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      logout();
      navigate('/login');
    }
  };

  const renderLinks = (stacked = false) => (
    <div className={stacked ? 'flex flex-col gap-1' : 'flex items-center gap-1'}>
      {filteredNavItems.map((item) => {
        const isAdmin = item.to === '/admin';
        const isBrowse = item.to === '/browse';
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `relative px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-500 ease-out inline-flex items-center gap-1.5 transform border ${isActive
                ? isAdmin
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 scale-105 border-transparent'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 scale-105 border-transparent'
                : 'text-gray-800 border-transparent hover:text-gray-900 hover:bg-white/20 hover:border-white/40 hover:scale-105'
              } ${stacked ? 'w-full' : ''}`
            }
          >
            {isAdmin && (
              <Shield className="w-3.5 h-3.5" />
            )}
            {isBrowse && Icon && (
              <Icon className="w-3.5 h-3.5" />
            )}
            {item.label}
          </NavLink>
        );
      })}
    </div>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 pt-3 px-4 sm:px-6">
      {/* Fade overlay for content passing under navbar */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-indigo-50/95 via-indigo-50/70 to-transparent pointer-events-none z-40"></div>
      
      {/* Floating Colorful Gradient Pill Navbar */}
      <div className="max-w-6xl mx-auto relative z-50">
        <div className="relative">
          {/* Colorful gradient background layers */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-200/40 via-purple-200/40 via-pink-200/40 to-blue-200/40 rounded-full blur-xl"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-violet-100/30 via-fuchsia-100/30 to-cyan-100/30 backdrop-blur-3xl rounded-full border border-white/30 shadow-lg"></div>
          
          {/* Content */}
          <div className="relative flex items-center justify-between h-14 px-5 sm:px-6">
          {/* Brand - Premium style */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 group -ml-1 px-2 py-1.5 rounded-lg hover:bg-white/20 transition-all duration-300"
          >
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              <LogoIcon />
            </div>
            <span className="text-[15px] font-semibold text-gray-900 hidden sm:inline tracking-tight">
              Campus Lost & Found
            </span>
            <span className="text-[15px] font-semibold text-gray-900 sm:hidden tracking-tight">
              CLF
            </span>
          </button>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {renderLinks()}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* How It Works Button */}
            <button
              onClick={() => setHowItWorksOpen(true)}
              className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-gray-800 hover:text-gray-900 hover:bg-white/20 hover:cursor-pointer transition-all duration-300"
            >
              <span className="hidden sm:inline">How It Works</span>
              <span className="sm:hidden">Guide</span>
            </button>

            {!isAuthenticated && (
              <div className="hidden md:flex items-center gap-2">
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 ${isActive
                      ? 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 shadow-sm border border-indigo-200'
                      : 'text-gray-800 hover:text-gray-900 hover:bg-white/20'
                    }`
                  }
                >
                  Log in
                </NavLink>
                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 ${isActive
                      ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/40 scale-105'
                      : 'bg-white border border-gray-300 text-gray-800 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md'
                    }`
                  }
                >
                  Sign up
                </NavLink>
              </div>
            )}

            {isAuthenticated && (
              <div className="relative flex items-center">
                <button
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="relative flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-white/30 transition-all duration-200 border border-transparent hover:border-white/40"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white ring-2 ring-white/50">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-800">{user?.name || 'User'}</span>
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />

                    <div className="absolute left-0 top-full mt-2 w-48 py-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      
                      {user?.role === 'ADMIN' && (
                        <button
                          onClick={() => {
                            navigate('/admin');
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Shield className="h-4 w-4 text-indigo-600" />
                          Admin Dashboard
                        </button>
                      )}

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-800 hover:bg-white/20 transition-all duration-300"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Colorful Glass style */}
      {mobileOpen && (
        <div className="md:hidden mt-2 mx-4 relative slide-in-right">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-200/40 via-purple-200/40 to-pink-200/40 rounded-3xl blur-xl"></div>
          <div className="relative bg-gradient-to-br from-violet-100/30 via-fuchsia-100/30 to-cyan-100/30 backdrop-blur-3xl rounded-3xl border border-white/30 shadow-lg">
          <div className="px-4 py-4 space-y-1">
            {renderLinks(true)}

            {!isAuthenticated ? (
              <div className="flex flex-col gap-2 pt-3 mt-3 border-t border-white/30">
                <NavLink
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-lg text-[13px] font-medium text-center transition-all duration-500 ease-out ${isActive
                      ? 'text-indigo-600 bg-white/30'
                      : 'text-gray-800 hover:bg-white/20'
                    }`
                  }
                >
                  Log in
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-center bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 transition-all duration-500 ease-out hover:scale-105"
                >
                  Sign up
                </NavLink>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-3 mt-3 border-t border-white/30">
                <div className="px-3 py-2.5 rounded-lg bg-white/40">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[11px] font-semibold text-white shadow-sm">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-900 leading-none">{user?.name}</p>
                      <p className="text-[11px] text-gray-600 leading-none mt-0.5">{user?.email}</p>
                    </div>
                  </div>
                  {user?.role === 'ADMIN' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-semibold rounded-md shadow-sm">
                      <Shield className="w-2.5 h-2.5" />
                      Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium text-red-600 hover:bg-red-50/60 transition-all duration-300"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Log out
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* How It Works Modal */}
      <HowItWorks isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
    </nav>
  );
}
