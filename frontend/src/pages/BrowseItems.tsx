import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Calendar, X, Tag, ChevronDown, Package, SlidersHorizontal, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import itemsService from '../services/items.service';
import type { Item, ItemFilters } from '../services/items.service';
import { useDebounce } from '../hooks/useDebounce';
import { PageSpinner } from '../components/Spinner';

const CATEGORIES = [
  { value: 'all', label: 'All Categories', icon: '📦' },
  { value: 'ELECTRONICS', label: 'Electronics', icon: '💻' },
  { value: 'CLOTHING', label: 'Clothing', icon: '👕' },
  { value: 'ACCESSORIES', label: 'Accessories', icon: '👜' },
  { value: 'BOOKS', label: 'Books', icon: '📚' },
  { value: 'ID_CARDS', label: 'ID Cards', icon: '🪪' },
  { value: 'KEYS', label: 'Keys', icon: '🔑' },
  { value: 'BAGS', label: 'Bags', icon: '🎒' },
  { value: 'SPORTS', label: 'Sports', icon: '⚽' },
  { value: 'OTHER', label: 'Other', icon: '📎' },
];

const LOCATIONS = [
  'Library',
  'Cafeteria', 
  'Sports Complex',
  'Main Building',
  'Computer Lab',
  'Parking Lot',
  'Hostel',
  'Auditorium',
];

export default function BrowseItems() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 500);

  const [type, setType] = useState<'ALL' | 'LOST' | 'FOUND'>(() =>
    (searchParams.get('type') as 'ALL' | 'LOST' | 'FOUND') || 'ALL'
  );
  const [category, setCategory] = useState(() => searchParams.get('category') || 'all');
  const [location, setLocation] = useState(() => searchParams.get('location') || '');
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(() => searchParams.get('dateTo') || '');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 6;

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (type !== 'ALL') params.set('type', type);
    if (category !== 'all') params.set('category', category);
    if (location) params.set('location', location);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, type, category, location, dateFrom, dateTo, setSearchParams]);

  // Fetch items with pagination
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const queryParams: ItemFilters = { 
          page: currentPage,
          limit: itemsPerPage 
        };
        if (debouncedSearch) queryParams.search = debouncedSearch;
        if (type !== 'ALL') queryParams.type = type;
        if (category !== 'all') queryParams.category = category as ItemFilters['category'];
        if (location) queryParams.location = location;
        if (dateFrom) queryParams.dateFrom = dateFrom;
        if (dateTo) queryParams.dateTo = dateTo;
        const response = await itemsService.getItems(queryParams);
        setItems(response.items);
        setTotalPages(response.pagination?.pages || 1);
        setTotalItems(response.pagination?.total || 0);
      } catch (err) {
        console.error('Failed to fetch items:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [currentPage, debouncedSearch, type, category, location, dateFrom, dateTo, itemsPerPage]);

  const filteredItems = useMemo(() => items, [items]);

  const clearFilters = () => {
    setSearchInput('');
    setType('ALL');
    setCategory('all');
    setLocation('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, type, category, location, dateFrom, dateTo]);

  const hasFilters = debouncedSearch || type !== 'ALL' || category !== 'all' || location || dateFrom || dateTo;
  const activeFilterCount = [
    type !== 'ALL',
    category !== 'all',
    location,
    dateFrom || dateTo
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <PageSpinner text="Finding items..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Decorative gradient orbs - matching homepage */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 left-20 w-96 h-96 bg-gradient-to-br from-blue-100/40 to-indigo-100/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-br from-purple-100/30 to-pink-100/30 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Section - Compact */}
      <section className="pt-24 pb-4 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center fade-in">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-2 font-brand">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Browse Items
              </span>
            </h1>
            <p className="text-gray-600 font-medium">
              Find lost items or help return found ones
            </p>
          </div>
        </div>
      </section>

      {/* Search & Filters Section - Floating */}
      <section className="relative z-10 pb-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Floating Search Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 shadow-lg">
            {/* Search Input */}
            <div className="relative flex-1 w-full sm:w-auto sm:min-w-[240px] lg:min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-11 pr-10 py-2.5 bg-transparent border-0 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px h-8 bg-gray-200"></div>

            {/* Type Toggle */}
            <div className="flex bg-gray-100/80 rounded-xl p-1 shrink-0 w-full sm:w-auto">
                {(['ALL', 'LOST', 'FOUND'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      type === t
                        ? t === 'LOST' 
                          ? 'bg-red-500 text-white shadow-sm'
                          : t === 'FOUND'
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="hidden lg:block w-px h-8 bg-gray-200"></div>

              {/* Category Dropdown */}
              <div className="relative shrink-0 w-full sm:w-auto">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="appearance-none w-full sm:w-auto pl-3 pr-8 py-2 bg-transparent border-0 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-0 cursor-pointer">
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Divider */}
              <div className="hidden lg:block w-px h-8 bg-gray-200"></div>

              {/* Advanced Filters Toggle */}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 shrink-0 w-full sm:w-auto ${
                  showAdvancedFilters || location || dateFrom || dateTo
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                    showAdvancedFilters || location || dateFrom || dateTo
                      ? 'bg-white/20'
                      : 'bg-indigo-600 text-white'
                  }`}>
                    {activeFilterCount}
                  </span>
                )}
              </button>

            {/* Advanced Filters Panel - Second Row */}
            {showAdvancedFilters && (
              <>
                {/* Full width divider */}
                <div className="w-full h-px bg-gray-200/60"></div>

                {/* Location Filter */}
                <div className="relative w-full sm:w-auto">
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="appearance-none w-full sm:w-auto pl-9 pr-9 py-2 bg-gray-50/80 border border-gray-200/60 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:border-indigo-400 cursor-pointer">
                    >
                      <option value="">All Locations</option>
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Date From */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs text-gray-500 font-medium shrink-0">From</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="flex-1 sm:flex-none px-2 sm:px-3 py-2 bg-gray-50/80 border border-gray-200/60 rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  {/* Date To */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs text-gray-500 font-medium shrink-0">To</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="flex-1 sm:flex-none px-2 sm:px-3 py-2 bg-gray-50/80 border border-gray-200/60 rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                {/* Clear Filters */}
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </>
            )}
          </div>

          {/* Active Filters Pills - Compact */}
          {hasFilters && !showAdvancedFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3 px-2">
              {type !== 'ALL' && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                  type === 'LOST' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {type}
                  <button onClick={() => setType('ALL')} className="hover:bg-black/10 rounded p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {category !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700">
                  {CATEGORIES.find(c => c.value === category)?.label}
                  <button onClick={() => setCategory('all')} className="hover:bg-black/10 rounded p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {location && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
                  {location}
                  <button onClick={() => setLocation('')} className="hover:bg-black/10 rounded p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(dateFrom || dateTo) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700">
                  {dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : dateFrom || `Until ${dateTo}`}
                  <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="hover:bg-black/10 rounded p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Results Section */}
      <section className="relative z-10 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Results Header - Compact */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              <span className="font-bold text-gray-900">{filteredItems.length}</span> {filteredItems.length === 1 ? 'item' : 'items'} found
              {debouncedSearch && (
                <span> for "<span className="font-medium text-indigo-600">{debouncedSearch}</span>"</span>
              )}
            </p>
            <Link
              to="/post-item"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-semibold group"
            >
              <span>Post Item</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No items found</h3>
            <p className="text-gray-500 mb-4 text-sm">
              {hasFilters
                ? 'Try adjusting your search or filters'
                : 'Be the first to post a lost or found item!'}
            </p>
            {hasFilters ? (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            ) : (
              <Link
                to="/post-item"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors"
              >
                Report an Item
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                to={`/items/${item.id}`}
                className="group block"
              >
                <article className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full">
                  {/* Image */}
                  <div className="aspect-[16/10] bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50 relative overflow-hidden">
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0].url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full flex items-center justify-center mb-3 shadow-lg">
                          <Tag className="w-7 h-7 text-indigo-500" />
                        </div>
                        <span className="text-sm text-gray-500 font-semibold">No image</span>
                      </div>
                    )}

                    {/* Type Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-3 py-1 text-xs font-black uppercase rounded-full backdrop-blur-md shadow-lg border-2 ${
                        item.type === 'LOST'
                          ? 'bg-red-500 text-white border-red-300'
                          : 'bg-green-500 text-white border-green-300'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Badges */}
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {item.category.replace('_', ' ')}
                      </span>
                      <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-lg border ${
                        item.status === 'UNCLAIMED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        item.status === 'CLAIMED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {item.status === 'UNCLAIMED' ? 'Open' : item.status}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-gray-900 group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300 mb-2 line-clamp-1">
                      {item.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Meta Info */}
                    <div className="pt-3 border-t border-gray-100 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <MapPin className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span className="line-clamp-1 font-medium">{item.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Calendar className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span className="font-medium">{new Date(item.itemDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}</span>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredItems.length > 0 && totalPages > 1 && (
          <div className="mt-12 flex items-center justify-between">
            {/* Results info */}
            <p className="hidden sm:block text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
              <span className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalItems}</span> results
            </p>

            {/* Pagination controls */}
            <div className="flex items-center gap-1 sm:gap-2 mx-auto sm:mx-0">
              {/* Previous button */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 sm:p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[32px] sm:min-w-[40px] h-8 sm:h-10 px-2 sm:px-3 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-300 ${
                        currentPage === pageNum
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next button */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 sm:p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
