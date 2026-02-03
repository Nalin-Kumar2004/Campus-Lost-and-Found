/**
 * ADMIN DASHBOARD - Overview Page
 * 
 * Purpose: Main admin panel showing stats and quick access to admin features
 * Access: Admin users only
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import type { ApiError } from '../types';

interface DashboardStats {
  totalUsers: number;
  totalItems: number;
  totalClaims: number;
  pendingClaims: number;
  unclaimedItems: number;
  verifiedUsers: number;
}

export default function AdminDashboard() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalItems: 0,
    totalClaims: 0,
    pendingClaims: 0,
    unclaimedItems: 0,
    verifiedUsers: 0
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch users count
      const usersRes = await api.get('/admin/users', {
        params: { limit: 1 }
      });
      
      // Fetch items count
      const itemsRes = await api.get('/admin/items', {
        params: { limit: 1 }
      });

      // Fetch verified users count
      const verifiedRes = await api.get('/admin/users', {
        params: { emailVerified: true, limit: 1 }
      });

      // Fetch unclaimed items
      const unclaimedRes = await api.get('/admin/items', {
        params: { status: 'UNCLAIMED', limit: 1 }
      });

      setStats({
        totalUsers: usersRes.data.pagination.total,
        totalItems: itemsRes.data.pagination.total,
        totalClaims: 0, // Would need separate endpoint
        pendingClaims: 0,
        unclaimedItems: unclaimedRes.data.pagination.total,
        verifiedUsers: verifiedRes.data.pagination.total
      });

    } catch (err) {
      const error = err as ApiError;
      console.error('Failed to fetch stats:', error);
      addToast('Failed to load dashboard stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: '👥',
      color: 'bg-blue-500',
      link: '/admin/users'
    },
    {
      title: 'Total Items',
      value: stats.totalItems,
      icon: '📦',
      color: 'bg-green-500',
      link: '/admin/items'
    },
    {
      title: 'Unclaimed Items',
      value: stats.unclaimedItems,
      icon: '🔍',
      color: 'bg-yellow-500',
      link: '/admin/items?status=UNCLAIMED'
    },
    {
      title: 'Verified Users',
      value: stats.verifiedUsers,
      icon: '✅',
      color: 'bg-purple-500',
      link: '/admin/users?emailVerified=true'
    }
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 font-brand">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Manage users, moderate items, and view system statistics
        </p>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.title}
            to={card.link}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">{card.icon}</span>
              <div className={`${card.color} text-white px-3 py-1 rounded-full text-sm font-semibold font-stats`}>
                {card.value}
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium">{card.title}</h3>
          </Link>
        ))}
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* USER MANAGEMENT */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">👥</span>
            <h2 className="text-xl font-bold text-gray-900">User Management</h2>
          </div>
          <p className="text-gray-600 mb-4">
            View all users, manage roles, and moderate accounts
          </p>
          <Link
            to="/admin/users"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Manage Users →
          </Link>
        </div>

        {/* ITEM MODERATION */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">📦</span>
            <h2 className="text-xl font-bold text-gray-900">Item Moderation</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Review all lost & found items, manage statuses, and moderate content
          </p>
          <Link
            to="/admin/items"
            className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Moderate Items →
          </Link>
        </div>
      </div>

      {/* RECENT ACTIVITY (Placeholder) */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <p className="text-gray-500 text-center py-8">
          Activity feed coming soon...
        </p>
      </div>
    </div>
  );
}
