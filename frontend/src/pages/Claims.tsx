/**
 * CLAIMS MANAGEMENT PAGE
 * ====================
 * This page demonstrates advanced React concepts for managing claims on items.
 * 
 * KEY CONCEPTS FOR INTERVIEWS:
 * ----------------------------
 * 1. TWO-WAY DATA RELATIONSHIPS
 *    - Claims link Users and Items (many-to-many through junction table)
 *    - We fetch data from multiple entities and combine them
 *    - Each claim shows: claimer info, item info, timestamps
 * 
 * 2. ACTION HANDLERS (Approve/Reject)
 *    - Optimistic UI updates (update UI before API responds)
 *    - Error handling with rollback (revert if API fails)
 *    - Success notifications and state synchronization
 * 
 * 3. FILTERING & SORTING
 *    - Multi-criteria filtering (status, item type, date range)
 *    - Client-side vs Server-side filtering (when to use each)
 *    - Sort by multiple fields (date, priority, status)
 * 
 * 4. NOTIFICATION SYSTEM
 *    - Toast notifications for user feedback
 *    - Different notification types (success, error, warning)
import { PageSpinner } from '../components/Spinner';
 *    - Auto-dismiss with manual dismiss option
 * 
 * 5. POLLING FOR REAL-TIME UPDATES
 *    - useEffect with setInterval for periodic data refresh
 *    - Cleanup function to prevent memory leaks
 *    - Balance between freshness and performance
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import claimsService from '../services/claims.service';
import { useToast } from '../contexts/ToastContext';
import type { Claim } from '../services/claims.service';
import type { ApiError } from '../types';
import { CheckCircle, XCircle, Clock, Mail, Phone, Calendar, MapPin, Search, Loader2, AlertCircle } from 'lucide-react';

// TypeScript interfaces - now imported from claims.service.ts

export default function Claims() {
  const toast = useToast();
  const navigate = useNavigate();

  /**
   * NOTE: Authentication is now handled by ProtectedRoute wrapper
   * No need to check auth here - component only renders if authenticated
   */

  // State Management
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // CONCEPT: Data Fetching with Cleanup
  // useEffect for initial data load
  useEffect(() => {
    fetchClaims();
  }, []);

  // CLEANUP: Clear interval when component unmounts
  // This prevents memory leaks and unnecessary API calls

  // Fetch claims from API
  const fetchClaims = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await claimsService.getMyClaims();
      setClaims(data);
    } catch (err) {
      const error = err as ApiError;
      console.error('Failed to fetch claims:', err);
      setError(error.response?.data?.error || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  // CONCEPT: Optimistic UI Updates with Rollback
  // Update UI immediately, then call API. If API fails, revert changes.
  const handleApproveClaim = async (claimId: string) => {
    const previousClaims = [...claims];

    // OPTIMISTIC UPDATE: Update UI before API call
    setClaims(claims.map(claim =>
      claim.id === claimId
        ? { ...claim, status: 'APPROVED' as const, updatedAt: new Date().toISOString() }
        : claim
    ));

    try {
      await claimsService.updateClaimStatus(claimId, { status: 'APPROVED' });
      toast.success('Claim approved successfully!');
    } catch (err) {
      // ROLLBACK: Revert to previous state on error
      const error = err as ApiError;
      setClaims(previousClaims);
      toast.error(error.response?.data?.error || 'Failed to approve claim.');
      console.error('Error approving claim:', error);
    }
  };

  // Similar pattern for rejecting claims
  const handleRejectClaim = async (claimId: string) => {
    const previousClaims = [...claims];

    setClaims(claims.map(claim =>
      claim.id === claimId
        ? { ...claim, status: 'REJECTED' as const, updatedAt: new Date().toISOString() }
        : claim
    ));

    try {
      await claimsService.updateClaimStatus(claimId, { status: 'REJECTED' });
      toast.warning('Claim rejected.');
    } catch (err) {
      const error = err as ApiError;
      setClaims(previousClaims);
      toast.error(error.response?.data?.error || 'Failed to reject claim.');
      console.error('Error rejecting claim:', error);
    }
  };

  // CONCEPT: Client-Side Filtering
  // Filter and search through data already loaded in state
  // Use server-side filtering for large datasets (add query params to API)
  const filteredClaims = claims.filter(claim => {
    // Status filter
    const matchesFilter = filter === 'all' || claim.status === filter;

    // Search filter (search in item title, claimer name, description)
    const matchesSearch = searchTerm === '' ||
      claim.item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.claimer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.description.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge styling
  const getStatusBadge = (status: Claim['status']) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      APPROVED: 'bg-green-100 text-green-800 border-green-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return styles[status];
  };

  if (loading) {
    return <PageSpinner text="Loading claims..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-destructive shrink-0" />
            <h2 className="text-lg font-semibold text-destructive">Failed to Load Claims</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchClaims}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity w-full"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Claims Management</h1>
              <p className="mt-1 text-gray-600">Review and manage claims on your found items</p>
            </div>
            <button
              onClick={() => navigate('/my-items')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to My Items
            </button>
          </div>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search claims..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2">
              {(['all', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === status
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                  <span className="ml-2 text-sm">
                    ({status === 'all' ? claims.length : claims.filter(c => c.status === status).length})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CLAIMS LIST */}
        {filteredClaims.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Claims Found</h3>
            <p className="text-gray-600">
              {searchTerm
                ? 'No claims match your search criteria.'
                : filter === 'all'
                  ? 'No one has claimed your items yet.'
                  : `No ${filter.toLowerCase()} claims.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClaims.map((claim) => (
              <div key={claim.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex gap-6">
                    {/* Item Image */}
                    <img
                      src={claim.item.imageUrl}
                      alt={claim.item.title}
                      className="w-32 h-32 object-cover rounded-lg shrink-0"
                    />

                    {/* Claim Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-1">
                            {claim.item.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            {claim.item.location}
                            <span className="mx-2">•</span>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                              {claim.item.category}
                            </span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusBadge(claim.status)}`}>
                          {claim.status}
                        </span>
                      </div>

                      {/* Claimer Information */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Claimer Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-700">
                            <span className="font-medium">Name:</span>
                            {claim.claimer.name}
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <Mail className="h-4 w-4 text-gray-400" />
                            {claim.claimer.email}
                          </div>
                          {claim.claimer.phone && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <Phone className="h-4 w-4 text-gray-400" />
                              {claim.claimer.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            Claimed {formatDate(claim.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* Claim Description */}
                      <div className="mb-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Claim Description</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">{claim.description}</p>
                      </div>

                      {/* Proof Images */}
                      {claim.proofImages && claim.proofImages.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Proof Provided</h4>
                          <div className="flex gap-2">
                            {claim.proofImages.map((img: string, idx: number) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`Proof ${idx + 1}`}
                                className="w-20 h-20 object-cover rounded border border-gray-200"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons (only for pending claims) */}
                      {claim.status === 'PENDING' && (
                        <div className="flex gap-3 pt-4 border-t">
                          <button
                            onClick={() => handleApproveClaim(claim.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                          >
                            <CheckCircle className="h-5 w-5" />
                            Approve Claim
                          </button>
                          <button
                            onClick={() => handleRejectClaim(claim.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                          >
                            <XCircle className="h-5 w-5" />
                            Reject Claim
                          </button>
                        </div>
                      )}

                      {/* Status Message for approved/rejected */}
                      {claim.status !== 'PENDING' && (
                        <div className={`mt-4 p-3 rounded-lg ${claim.status === 'APPROVED' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                          }`}>
                          <p className="text-sm font-medium">
                            {claim.status === 'APPROVED'
                              ? '✓ You approved this claim on ' + formatDate(claim.updatedAt)
                              : '✕ You rejected this claim on ' + formatDate(claim.updatedAt)
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

