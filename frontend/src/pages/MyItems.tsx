/**
 * MY ITEMS PAGE - User dashboard for managing posted items
 * 
 * REACT QUERY INTEGRATION:
 * - useMyItems() fetches user's items with caching
 * - useDeleteItem() handles deletion with cache invalidation
 * - No more manual useState for loading/error states
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyItems, useDeleteItem } from '../hooks/useQueries';
import { useToast } from '../contexts/ToastContext';
import type { ApiError } from '../types';
import { PageSpinner, ButtonSpinner } from '../components/Spinner';
import { 
  Plus, 
  Search,
  Eye,
  Trash2,
  Package,
  CheckCircle,
  AlertCircle,
  MapPin,
  Calendar,
  MessageSquare,
  TrendingUp,
  X
} from 'lucide-react';

type TabType = 'all' | 'missing' | 'unclaimed' | 'inProgress' | 'completed';

export default function MyItems() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);

  /**
   * REACT QUERY - Data Fetching
   * 
   * useMyItems() returns:
   * - data: The fetched items array
   * - isLoading: True while loading
   * - error: Error object if request failed
   * - refetch: Function to manually refetch
   */
  const { data: items = [], isLoading, error } = useMyItems();
  
  /**
   * REACT QUERY - Mutation for Delete
   * 
   * useMutation provides:
   * - mutate: Function to trigger the mutation
   * - isPending: True while mutation is in progress
   * - Automatic cache invalidation on success
   */
  const deleteItemMutation = useDeleteItem();

  // Stats calculated from React Query data
  const stats = {
    total: items.length,
    missing: items.filter(item => item.type === 'LOST' && item.status === 'UNCLAIMED').length,
    unclaimed: items.filter(item => item.type === 'FOUND' && item.status === 'UNCLAIMED').length,
    inProgress: items.filter(item => item.status === 'CLAIMED').length,
    completed: items.filter(item => item.status === 'RETURNED').length,
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (activeTab === 'missing' && !(item.type === 'LOST' && item.status === 'UNCLAIMED')) return false;
    if (activeTab === 'unclaimed' && !(item.type === 'FOUND' && item.status === 'UNCLAIMED')) return false;
    if (activeTab === 'inProgress' && item.status !== 'CLAIMED') return false;
    if (activeTab === 'completed' && item.status !== 'RETURNED') return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const handleDelete = (itemId: string) => {
    deleteItemMutation.mutate(itemId, {
      onSuccess: () => {
        setShowDeleteDialog(null);
        toast.success('Item deleted successfully');
      },
      onError: (err) => {
        const error = err as ApiError;
        console.error('Failed to delete item:', error);
        toast.error(error.response?.data?.error || 'Failed to delete item');
      },
    });
  };

  const getStatusConfig = (status: string) => {
    const config = {
      UNCLAIMED: { label: 'Looking', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50' },
      CLAIMED: { label: 'Pending Claim', color: 'bg-amber-500', textColor: 'text-amber-700', bgColor: 'bg-amber-50' },
      RESOLVED: { label: 'Resolved', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' },
      RETURNED: { label: 'Returned', color: 'bg-indigo-500', textColor: 'text-indigo-700', bgColor: 'bg-indigo-50' },
    };
    return config[status as keyof typeof config] || config.UNCLAIMED;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center pt-20">
        <PageSpinner text="Loading your items..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center pt-20 px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load</h2>
          <p className="text-gray-600 mb-6">{error instanceof Error ? error.message : 'Failed to load your items'}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-40 right-20 w-72 h-72 bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 left-20 w-96 h-96 bg-gradient-to-br from-blue-100/40 to-indigo-100/40 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main content with proper navbar spacing */}
      <div className="relative z-10 pt-28 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                My Items
              </h1>
              <p className="text-gray-600">
                Manage and track your lost & found reports
              </p>
            </div>
            
            <Link
              to="/post-item"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-5 h-5" />
              Post New Item
            </Link>
          </div>

          {/* Stats Cards - Apple-Inspired Design */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {/* Total Card */}
            <div className="group relative bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/30 rounded-[20px] py-5 px-5 border border-indigo-100/50 shadow-[0_2px_12px_rgba(99,102,241,0.08),0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.15),0_4px_12px_rgba(0,0,0,0.1)] hover:border-indigo-200/60 hover:-translate-y-1.5 transition-all duration-400 min-h-[115px] flex items-center backdrop-blur-sm overflow-hidden cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-transparent to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-400"></div>
              <div className="flex items-start justify-evenly gap-2 w-full relative z-10">
                <div className="flex flex-col">
                  <div className="text-3xl font-semibold text-gray-900 mb-1 leading-none tracking-tight group-hover:scale-105 transition-transform duration-300">{stats.total}</div>
                  <div className="text-xs font-medium text-gray-600">Total</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-[0_8px_24px_rgba(99,102,241,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
                  <Package className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Still Missing Card */}
            <div className="group relative bg-gradient-to-br from-white via-pink-50/40 to-red-50/30 rounded-[20px] py-5 px-5 border border-pink-100/50 shadow-[0_2px_12px_rgba(236,72,153,0.08),0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(236,72,153,0.15),0_4px_12px_rgba(0,0,0,0.1)] hover:border-pink-200/60 hover:-translate-y-1.5 transition-all duration-400 min-h-[115px] flex items-center backdrop-blur-sm overflow-hidden cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 via-transparent to-red-500/0 group-hover:from-pink-500/5 group-hover:to-red-500/5 transition-all duration-400"></div>
              <div className="flex items-start justify-evenly gap-2 w-full relative z-10">
                <div className="flex flex-col">
                  <div className="text-3xl font-semibold text-gray-900 mb-1 leading-none tracking-tight group-hover:scale-105 transition-transform duration-300">{stats.missing}</div>
                  <div className="text-xs font-medium text-gray-600">Still Missing</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-[0_8px_24px_rgba(236,72,153,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
                  <AlertCircle className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Not Claimed Card */}
            <div className="group relative bg-gradient-to-br from-white via-green-50/40 to-emerald-50/30 rounded-[20px] py-5 px-5 border border-green-100/50 shadow-[0_2px_12px_rgba(34,197,94,0.08),0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(34,197,94,0.15),0_4px_12px_rgba(0,0,0,0.1)] hover:border-green-200/60 hover:-translate-y-1.5 transition-all duration-400 min-h-[115px] flex items-center backdrop-blur-sm overflow-hidden cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 via-transparent to-emerald-500/0 group-hover:from-green-500/5 group-hover:to-emerald-500/5 transition-all duration-400"></div>
              <div className="flex items-start justify-evenly gap-2 w-full relative z-10">
                <div className="flex flex-col">
                  <div className="text-3xl font-semibold text-gray-900 mb-1 leading-none tracking-tight group-hover:scale-105 transition-transform duration-300">{stats.unclaimed}</div>
                  <div className="text-xs font-medium text-gray-600">Not Claimed</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-[0_8px_24px_rgba(34,197,94,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
                  <TrendingUp className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Completed Card */}
            <div className="group relative bg-gradient-to-br from-white via-cyan-50/40 to-blue-50/30 rounded-[20px] py-5 px-5 border border-cyan-100/50 shadow-[0_2px_12px_rgba(6,182,212,0.08),0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(6,182,212,0.15),0_4px_12px_rgba(0,0,0,0.1)] hover:border-cyan-200/60 hover:-translate-y-1.5 transition-all duration-400 min-h-[115px] flex items-center backdrop-blur-sm overflow-hidden cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-transparent to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-400"></div>
              <div className="flex items-start justify-evenly gap-2 w-full relative z-10">
                <div className="flex flex-col">
                  <div className="text-3xl font-semibold text-gray-900 mb-1 leading-none tracking-tight group-hover:scale-105 transition-transform duration-300">{stats.completed}</div>
                  <div className="text-xs font-medium text-gray-600">Completed</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-[0_8px_24px_rgba(6,182,212,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
                  <CheckCircle className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs & Search */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm mb-6 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100 overflow-x-auto">
              {[
                { key: 'all', label: 'All', count: stats.total },
                { key: 'missing', label: 'Still Missing', count: stats.missing },
                { key: 'unclaimed', label: 'Not Claimed Yet', count: stats.unclaimed },
                { key: 'inProgress', label: 'In Progress', count: stats.inProgress },
                { key: 'completed', label: 'Completed', count: stats.completed },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={`flex-shrink-0 px-4 sm:px-6 py-3 text-sm font-medium transition-all relative whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {tab.label}
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.key 
                        ? 'bg-indigo-100 text-indigo-600' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tab.count}
                    </span>
                  </span>
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="p-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-gray-50 border-0 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white focus:shadow-lg transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Items List */}
          {filteredItems.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Package className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No matching items' : 'No items yet'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                {searchQuery 
                  ? 'Try a different search term'
                  : 'Start by posting a lost or found item report'
                }
              </p>
              {!searchQuery && (
                <Link
                  to="/post-item"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Post Item
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const statusConfig = getStatusConfig(item.status);
                return (
                  <div
                    key={item.id}
                    className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-4 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 group"
                  >
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg shrink-0 overflow-hidden">
                        {item.images && item.images.length > 0 ? (
                          <img 
                            src={item.images[0].url} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 truncate mb-1.5">
                              {item.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md ${
                                item.type === 'LOST'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-green-50 text-green-700'
                              }`}>
                                {item.type}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                                {statusConfig.label}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-gray-100 text-gray-600">
                                {item.category}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <Link
                              to={`/items/${item.id}`}
                              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 hover:scale-110 rounded-lg transition-all duration-200"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => setShowDeleteDialog(item.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 hover:scale-110 rounded-lg transition-all duration-200"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {item.location}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.itemDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {item.claimsCount || 0} claims
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Item?</h3>
            <p className="text-gray-500 text-center text-sm mb-6">
              This will permanently remove the item and all its claims.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteDialog(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteDialog)}
                disabled={deleteItemMutation.isPending}
                className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteItemMutation.isPending ? (
                  <>
                    <ButtonSpinner />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}