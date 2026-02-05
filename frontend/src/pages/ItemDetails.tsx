/**
 * ITEM DETAILS PAGE - Full information about a specific lost/found item
 * 
 * This page demonstrates:
 * - Dynamic routing with URL parameters
 * - Complex UI layouts with Tailwind
 * - Modal/Dialog component patterns
 * - Conditional rendering based on item type
 * - Form handling for claims
 * 
 * LEARNING CONCEPTS:
 * 
 * 1. useParams Hook:
 *    - Extracts parameters from URL (e.g., /items/:id → { id: "123" })
 *    - Enables dynamic routes - same component, different data
 * 
 * 2. useNavigate Hook:
 *    - Programmatic navigation (redirect users in code)
 *    - Use for redirects after actions (e.g., after submitting claim)
 * 
 * 3. Modal Pattern:
 *    - Overlay UI that appears on top of main content
 *    - Used for focused tasks (claiming item, verification)
 *    - Manages its own state (open/closed)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import itemsService from '../services/items.service';
import claimsService from '../services/claims.service';
import { useToast } from '../contexts/ToastContext';
import type { Item } from '../services/items.service';
import type { ApiError } from '../types';
import { PageSpinner } from '../components/Spinner';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Tag, 
  AlertCircle,
  CheckCircle,
  X,
  Phone,
  Mail
} from 'lucide-react';

/**
 * INTERFACES - Type definitions for our data structures
 * Now imported from items.service.ts
 */

export default function ItemDetails() {
  /**
   * HOOKS - React hooks must be called at the top level
   * 
   * useParams: Get URL parameters
   * Example: URL is /items/abc123 → params.id = "abc123"
   */
  const { id } = useParams<{ id: string }>();
  
  /**
   * useNavigate: Programmatic navigation
   * Use navigate('/path') to redirect users
   */
  const navigate = useNavigate();
  const toast = useToast();

  /**
   * STATE MANAGEMENT
   */
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [claimForm, setClaimForm] = useState({
    description: '',
    verificationAnswer: '',
    contactMethod: 'email',
  });
  
  // API data state
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  /**
   * FETCH ITEM FROM API
   */
  useEffect(() => {
    const fetchItem = async () => {
      if (!id) {
        setError('Item ID is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const data = await itemsService.getItemById(id);
        setItem(data);
      } catch (err) {
        const error = err as ApiError;
        console.error('Failed to fetch item:', error);
        setError(error.message || 'Failed to load item details');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  /**
   * HANDLE IMAGE SELECTION
   */
  // const handleImageSelect = (index: number) => {
  //   setSelectedImage(index);
  // };

  /**
   * HANDLE FORM INPUT CHANGES
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setClaimForm({
      ...claimForm,
      [name]: value,
    });
  };

  /**
   * HANDLE CLAIM SUBMISSION
   */
  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item || !id) {
      toast.error('Item information is missing');
      return;
    }

    try {
      await claimsService.createClaim({
        itemId: id,
        description: claimForm.description,
        verificationAnswer: claimForm.verificationAnswer,
        contactMethod: claimForm.contactMethod as 'email' | 'phone',
      });

      toast.success('Claim submitted successfully!');
      setShowClaimModal(false);
      setClaimForm({
        description: '',
        verificationAnswer: '',
        contactMethod: 'email',
      });
      
      // Optionally, refetch the item or redirect
      // navigate('/my-claims');
    } catch (err) {
      const error = err as ApiError;
      console.error('Failed to submit claim:', error);
      toast.error(error.message || 'Failed to submit claim');
    }
  };

  /**
   * STATUS BADGE STYLING
   */
  const getStatusBadge = (status: string) => {
    const badges = {
      UNCLAIMED: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
      CLAIMED: 'bg-amber-100 text-amber-700 border border-amber-200',
      RESOLVED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    };
    return badges[status as keyof typeof badges] || badges.UNCLAIMED;
  };

  /**
   * LOADING STATE
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <PageSpinner text="Loading item details..." />
      </div>
    );
  }

  /**
   * ERROR STATE
   */
  if (error || !item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Item not found</h2>
          <p className="text-gray-500 mb-6">This item may have been removed or doesn't exist</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:shadow-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER with Back Navigation */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-all group"
          >
            <div className="p-1 rounded-lg bg-gray-100 group-hover:bg-indigo-50 transition-colors">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            <span className="font-semibold">Back to listings</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* LEFT COLUMN - Image Gallery */}
          <div>
            {/* MAIN IMAGE */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-md mb-4">
              <div className="aspect-video bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center">
                {item.images && item.images.length > 0 ? (
                  <img
                    src={item.images[selectedImage].url}
                    alt={item.images[selectedImage].altText || item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full flex items-center justify-center mb-4">
                      <Tag className="w-10 h-10 text-indigo-400" />
                    </div>
                    <span className="text-gray-500 font-medium">No image available</span>
                  </div>
                )}
              </div>
            </div>

            {/* THUMBNAIL GALLERY */}
            {item.images && item.images.length > 1 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                {item.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-video rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                      selectedImage === index
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 scale-105'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.altText || `Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* POSTER INFO CARD - Desktop */}
            <div className="hidden lg:block mt-8">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-violet-600 rounded-full"></div>
                  Posted By
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-xl">
                        {item.poster.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{item.poster.name}</p>
                      <p className="text-sm text-gray-600 font-medium">Student</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <a
                      href={`mailto:${item.poster.email}`}
                      className="flex items-center gap-3 text-sm text-gray-700 hover:text-indigo-600 transition-colors group"
                    >
                      <div className="w-8 h-8 bg-gray-100 group-hover:bg-indigo-50 rounded-lg flex items-center justify-center transition-colors">
                        <Mail className="w-4 h-4 text-gray-600 group-hover:text-indigo-600" />
                      </div>
                      <span className="font-medium">{item.poster.email}</span>
                    </a>
                    {item.poster.phone && (
                      <a
                        href={`tel:${item.poster.phone}`}
                        className="flex items-center gap-3 text-sm text-gray-700 hover:text-indigo-600 transition-colors group"
                      >
                        <div className="w-8 h-8 bg-gray-100 group-hover:bg-indigo-50 rounded-lg flex items-center justify-center transition-colors">
                          <Phone className="w-4 h-4 text-gray-600 group-hover:text-indigo-600" />
                        </div>
                        <span className="font-medium">{item.poster.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Item Information */}
          <div>
            {/* TYPE & STATUS BADGES */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-full uppercase tracking-wide ${
                  item.type === 'LOST'
                    ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/30'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                }`}
              >
                {item.type}
              </span>
              <span className={`px-4 py-2 text-xs font-bold rounded-full uppercase tracking-wide ${getStatusBadge(item.status)}`}>
                {item.status}
              </span>
              <span className="px-4 py-2 text-xs font-bold rounded-full uppercase tracking-wide bg-gray-100 text-gray-700">
                {item.category}
              </span>
            </div>

            {/* TITLE */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight font-brand">
              {item.title}
            </h1>

            {/* META INFORMATION */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-200 transition-colors">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-1">
                    {item.type === 'LOST' ? 'Last seen at' : 'Found at'}
                  </p>
                  <p className="text-sm text-gray-600">{item.location}</p>
                </div>
              </div>

              {item.currentLocation && (
                <div className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-200 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-1">Current location</p>
                    <p className="text-sm text-gray-600">{item.currentLocation}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-200 transition-colors">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-1">Date</p>
                  <p className="text-sm text-gray-600">
                    {new Date(item.itemDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="bg-gradient-to-br from-gray-50 to-indigo-50/30 rounded-2xl p-6 mb-8 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center">
                  <Tag className="w-4 h-4 text-white" />
                </div>
                Description
              </h2>
              <p className="text-gray-700 leading-relaxed text-base">
                {item.description}
              </p>
            </div>

            {/* VERIFICATION QUESTION (if exists) */}
            {item.verificationQuestion && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-amber-900 mb-2">
                      Verification Required
                    </p>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      To claim this item, you'll need to answer: <span className="font-semibold">"{item.verificationQuestion}"</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ACTION BUTTON */}
            {item.status === 'UNCLAIMED' && (
              <button
                onClick={() => setShowClaimModal(true)}
                className="w-full btn-gradient py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                <CheckCircle className="w-6 h-6" />
                Claim This Item
              </button>
            )}

            {item.status === 'CLAIMED' && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-5 text-center">
                <p className="text-amber-800 font-bold text-lg">
                  This item has been claimed and is pending verification
                </p>
              </div>
            )}

            {/* POSTER INFO - Mobile */}
            <div className="lg:hidden mt-8">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-violet-600 rounded-full"></div>
                  Posted By
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-xl">
                        {item.poster.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{item.poster.name}</p>
                      <p className="text-sm text-gray-600 font-medium">Student</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <a
                      href={`mailto:${item.poster.email}`}
                      className="flex items-center gap-3 text-sm text-gray-700 hover:text-indigo-600 transition-colors group"
                    >
                      <div className="w-8 h-8 bg-gray-100 group-hover:bg-indigo-50 rounded-lg flex items-center justify-center transition-colors">
                        <Mail className="w-4 h-4 text-gray-600 group-hover:text-indigo-600" />
                      </div>
                      <span className="font-medium">{item.poster.email}</span>
                    </a>
                    {item.poster.phone && (
                      <a
                        href={`tel:${item.poster.phone}`}
                        className="flex items-center gap-3 text-sm text-gray-700 hover:text-indigo-600 transition-colors group"
                      >
                        <div className="w-8 h-8 bg-gray-100 group-hover:bg-indigo-50 rounded-lg flex items-center justify-center transition-colors">
                          <Phone className="w-4 h-4 text-gray-600 group-hover:text-indigo-600" />
                        </div>
                        <span className="font-medium">{item.poster.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CLAIM MODAL */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Submit a Claim</h2>
              <button
                onClick={() => setShowClaimModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleClaimSubmit} className="p-6 space-y-4">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Describe why this is yours
                </label>
                <textarea
                  name="description"
                  value={claimForm.description}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  placeholder="Include specific details about the item..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-colors"
                />
              </div>

              {/* Verification Answer */}
              {item && item.verificationQuestion && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Answer this question
                  </label>
                  <p className="text-sm text-gray-600 mb-2 p-3 bg-gray-50 rounded-lg">
                    {item.verificationQuestion}
                  </p>
                  <input
                    type="text"
                    name="verificationAnswer"
                    value={claimForm.verificationAnswer}
                    onChange={handleInputChange}
                    required
                    placeholder="Your answer"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  />
                </div>
              )}

              {/* Contact Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contact preference
                </label>
                <select
                  name="contactMethod"
                  value={claimForm.contactMethod}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:shadow-md transition-all"
                >
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

