import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Clock, MapPin, Tag, Calendar, ArrowRight, Search as SearchIcon, ChevronDown } from 'lucide-react';
import { useItems } from '../hooks/useQueries';
import { PageSpinner } from '../components/Spinner';

export default function Home() {
  const [scrollPosition, setScrollPosition] = useState(0);

  /**
   * REACT QUERY - Data Fetching
   * 
   * Benefits over useState + useEffect:
   * - Automatic caching (if user navigates away and back, data is instant)
   * - Background refetching when data becomes stale
   * - Loading/error states built-in
   * - No boilerplate code
   * - Request deduplication (multiple components using same query = 1 request)
   */
  const { data, isLoading } = useItems({ limit: 50 });
  
  // Extract items from response
  const allItems = data?.items ?? [];
  const latestItems = useMemo(() => allItems.slice(0, 4), [allItems]);

  // Calculate quick stats
  const stats = useMemo(() => {
    const lostCount = allItems.filter(i => i.type === 'LOST').length;
    const foundCount = allItems.filter(i => i.type === 'FOUND').length;
    const unclaimedCount = allItems.filter(i => i.status === 'UNCLAIMED').length;
    const todayCount = allItems.filter(i => {
      const today = new Date().toISOString().split('T')[0];
      return i.createdAt.split('T')[0] === today;
    }).length;

    return { lostCount, foundCount, unclaimedCount, todayCount };
  }, [allItems]);

  // Continuous smooth auto-scroll
  useEffect(() => {
    if (latestItems.length === 0) return;
    
    const scrollInterval = setInterval(() => {
      setScrollPosition((prev) => {
        const cardWidth = 480; // Approximate card width + gap for smoother scroll
        const maxScroll = latestItems.length * cardWidth;
        const newPosition = prev + 2.5; // Smooth fast continuous scroll
        
        // Reset to beginning when reaching end for seamless infinite loop
        return newPosition >= maxScroll ? 0 : newPosition;
      });
    }, 20); // Update every 20ms for smooth animation

    return () => clearInterval(scrollInterval);
  }, [latestItems.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <PageSpinner text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Subtle decorative elements */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-full blur-3xl"></div>
      <div className="absolute bottom-40 left-20 w-96 h-96 bg-gradient-to-br from-blue-100/40 to-indigo-100/40 rounded-full blur-3xl"></div>

      {/* HERO SECTION - Minimal Floating Elements */}
      <section className="min-h-screen flex flex-col justify-center items-center relative pb-32 pt-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
            {/* Main headline - floating freely */}
            <div className="text-center max-w-5xl mx-auto mb-8 fade-in">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.25] tracking-tight">
                <span className="inline-block bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300">
                  Reuniting
                </span>
                {' '}
                <span className="inline-block text-gray-900 hover:scale-105 transition-transform duration-300">Lost Items</span>
                {' '}
                <br className="hidden sm:block" />
                <span className="inline-block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300">
                  with Their Owners
                </span>
              </h1>
            </div>

            {/* Description - Premium Card with Micro-interactions */}
            <div className="text-center mb-12 fade-in animation-delay-200 animate-float-delayed">
              <div className="relative inline-block max-w-3xl">
                {/* Gradient background glow on hover */}
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 rounded-[1.75rem] opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-700"></div>
                
                {/* Card content */}
                <div className="relative group px-10 py-7 rounded-[1.75rem] bg-white border border-gray-200/80 shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:border-indigo-300/60 hover:shadow-[0_8px_32px_rgba(99,102,241,0.15)] hover:-translate-y-0.5 transition-all duration-500 ease-out">
                  {/* Subtle inner highlight */}
                  <div className="absolute inset-0 rounded-[1.75rem] bg-gradient-to-b from-white to-transparent opacity-60"></div>
                  
                  {/* Text content */}
                  <p className="relative text-lg md:text-xl text-gray-600 leading-[1.7] font-medium tracking-tight">
                    A modern platform to help our campus community recover lost belongings and return found items <span className="text-indigo-600 font-semibold">quickly and securely</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA buttons - floating freely */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center fade-in animation-delay-300">
              {/* Primary CTA */}
              <Link
                to="/post-item"
                className="group/btn relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white font-bold text-lg rounded-2xl shadow-[0_8px_32px_rgba(99,102,241,0.35)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.5)] hover:-translate-y-1 hover:scale-105 active:scale-100 transition-all duration-300 overflow-hidden whitespace-nowrap"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"></div>
                
                <span className="relative font-ui font-medium">Report an Item</span>
                <ArrowRight className="w-5 h-5 relative group-hover/btn:translate-x-1 transition-transform duration-300" />
              </Link>

              {/* Secondary CTA */}
              <Link
                to="/browse"
                className="group/btn relative inline-flex items-center gap-3 px-8 py-4 bg-white/80 backdrop-blur-md text-gray-700 font-bold text-lg rounded-2xl border-2 border-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:bg-white hover:border-indigo-300 hover:shadow-[0_8px_40px_rgba(99,102,241,0.2)] hover:-translate-y-1 hover:scale-105 active:scale-100 transition-all duration-300"
              >
                <SearchIcon className="w-5 h-5 relative group-hover/btn:scale-110 group-hover/btn:text-indigo-600 transition-all duration-300" />
                <span className="relative font-ui font-medium group-hover/btn:bg-gradient-to-r group-hover/btn:from-indigo-600 group-hover/btn:to-purple-600 group-hover/btn:bg-clip-text group-hover/btn:text-transparent transition-all duration-300">Browse All Items</span>
              </Link>
            </div>
          </div>
          
          {/* Scroll button */}
          <button
            onClick={() => {
              const latestItemsSection = document.getElementById('latest-items-section');
              if (latestItemsSection) {
                const navbarHeight = 80;
                const elementPosition = latestItemsSection.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = elementPosition - navbarHeight;
                
                window.scrollTo({
                  top: offsetPosition,
                  behavior: 'smooth'
                });
              }
            }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 group cursor-pointer z-10"
          >
            <span className="text-xs font-bold tracking-[0.2em] uppercase px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-indigo-100 shadow-lg text-gray-700 group-hover:scale-110 group-hover:bg-white group-hover:border-indigo-200 transition-all duration-500">
              Scroll to explore
            </span>
            <div className="relative">
              <div className="absolute inset-0 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400/30 via-purple-400/30 to-blue-400/30 blur-xl group-hover:blur-2xl transition-all duration-700"></div>
              
              <div className="relative w-14 h-14 rounded-full bg-white/80 backdrop-blur-md border border-indigo-100 flex items-center justify-center shadow-[0_8px_32px_rgba(99,102,241,0.2)] group-hover:shadow-[0_12px_48px_rgba(99,102,241,0.35)] group-hover:scale-110 group-hover:bg-white group-hover:border-indigo-200 transition-all duration-500 animate-bounce">
                <ChevronDown className="w-6 h-6 text-indigo-600 group-hover:translate-y-1 transition-transform duration-300" strokeWidth={2.5} />
              </div>
            </div>
          </button>
        </section>

      {/* LATEST ITEMS CAROUSEL */}
      <section id="latest-items-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8 scroll-mt-20">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight font-brand">Latest Items</h2>
            <p className="text-lg text-gray-600 font-medium">Recently reported lost and found items</p>
          </div>
          <Link
            to="/browse"
            className="hidden sm:inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-bold text-lg group"
          >
            <span>View All</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {latestItems.length === 0 ? (
          <div className="text-center py-20 bg-white/60 backdrop-blur-sm border-2 border-dashed border-gray-300 rounded-3xl hover:border-indigo-400 transition-all duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Tag className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No items yet</h3>
            <p className="text-lg text-gray-600 mb-6">Be the first to report a lost or found item!</p>
            <Link to="/post-item" className="btn-gradient text-lg">
              Report an Item
            </Link>
          </div>
        ) : (
          <div className="relative">
            {/* Carousel Container with Edge Fade Effect */}
            <div className="relative overflow-hidden">
              {/* Left Fade Gradient - softer, wider fade */}
              <div className="absolute left-0 top-0 bottom-0 w-48 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, rgba(238, 242, 255, 1) 0%, rgba(238, 242, 255, 0.8) 25%, rgba(238, 242, 255, 0.4) 60%, transparent 100%)' }}></div>
              
              {/* Right Fade Gradient - softer, wider fade */}
              <div className="absolute right-0 top-0 bottom-0 w-48 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, rgba(236, 254, 255, 1) 0%, rgba(236, 254, 255, 0.8) 25%, rgba(236, 254, 255, 0.4) 60%, transparent 100%)' }}></div>
              
              <div
                className="flex gap-6"
                style={{ 
                  transform: `translateX(-${scrollPosition}px)`,
                  transition: 'transform 0.05s linear',
                  willChange: 'transform'
                }}
              >
                {/* Duplicate items for infinite scroll effect */}
                {[...latestItems, ...latestItems].map((item, index) => (
                  <div key={`${item.id}-${index}`} className="w-[40vw] max-w-[500px] min-w-[350px] flex-shrink-0">
                    <Link to={`/items/${item.id}`} className="group block">
                      <article className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full">
                        {/* Image */}
                        <div className="aspect-[21/9] bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50 relative overflow-hidden">
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
                            <span className={`px-3 py-1 text-xs font-black uppercase rounded-full backdrop-blur-md shadow-lg border-2 ${item.type === 'LOST'
                              ? 'bg-red-500 text-white border-red-300'
                              : 'bg-green-500 text-white border-green-300'
                              }`}>
                              {item.type}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-3">
                          {/* Badges */}
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {item.category}
                            </span>
                            <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-lg border ${item.status === 'UNCLAIMED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              item.status === 'CLAIMED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-green-50 text-green-700 border-green-200'
                              }`}>
                              {item.status}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="text-base font-bold text-gray-900 group-hover:gradient-text transition-all duration-300 mb-2 line-clamp-1">
                            {item.title}
                          </h3>

                          {/* Description */}
                          <p className="text-sm text-gray-600 line-clamp-1 mb-3 leading-relaxed">
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
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* View All Button for Mobile */}
        <div className="mt-8 sm:hidden text-center">
          <Link to="/browse" className="btn-gradient inline-flex items-center gap-2 group">
            <span>View All Items</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* QUICK STATS - Apple-Inspired Design */}
      <section className="py-12 mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {/* Lost Items Card */}
            <div className="group relative bg-gradient-to-br from-white via-pink-50/40 to-red-50/30 rounded-[28px] py-8 px-7 border border-pink-100/50 shadow-[0_2px_12px_rgba(236,72,153,0.08),0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(236,72,153,0.15),0_4px_12px_rgba(0,0,0,0.1)] hover:border-pink-200/60 hover:-translate-y-1.5 transition-all duration-400 min-h-[180px] flex items-center backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 via-transparent to-red-500/0 group-hover:from-pink-500/5 group-hover:to-red-500/5 transition-all duration-400"></div>
              <div className="flex items-start justify-evenly gap-3 w-full relative z-10">
                <div className="flex flex-col">
                  <div className="text-5xl font-semibold text-gray-900 mb-1.5 leading-none tracking-tight group-hover:scale-105 transition-transform duration-300 font-stats">{stats.lostCount}</div>
                  <div className="text-[13px] font-medium text-gray-600">Lost Items</div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-[0_8px_24px_rgba(236,72,153,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
                  <SearchIcon className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Found Items Card */}
            <div className="group relative bg-gradient-to-br from-white via-green-50/40 to-emerald-50/30 rounded-[28px] py-8 px-7 border border-green-100/50 shadow-[0_2px_12px_rgba(34,197,94,0.08),0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(34,197,94,0.15),0_4px_12px_rgba(0,0,0,0.1)] hover:border-green-200/60 hover:-translate-y-1.5 transition-all duration-400 min-h-[180px] flex items-center backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 via-transparent to-emerald-500/0 group-hover:from-green-500/5 group-hover:to-emerald-500/5 transition-all duration-400"></div>
              <div className="flex items-start justify-evenly gap-3 w-full relative z-10">
                <div className="flex flex-col">
                  <div className="text-5xl font-semibold text-gray-900 mb-1.5 leading-none tracking-tight group-hover:scale-105 transition-transform duration-300 font-stats">{stats.foundCount}</div>
                  <div className="text-[13px] font-medium text-gray-600">Found Items</div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-[0_8px_24px_rgba(34,197,94,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
                  <Tag className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Unclaimed Card */}
            <div className="group relative bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/30 rounded-[28px] py-8 px-7 border border-indigo-100/50 shadow-[0_2px_12px_rgba(99,102,241,0.08),0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.15),0_4px_12px_rgba(0,0,0,0.1)] hover:border-indigo-200/60 hover:-translate-y-1.5 transition-all duration-400 min-h-[180px] flex items-center backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-transparent to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-400"></div>
              <div className="flex items-start justify-evenly gap-3 w-full relative z-10">
                <div className="flex flex-col">
                  <div className="text-5xl font-semibold text-gray-900 mb-1.5 leading-none tracking-tight group-hover:scale-105 transition-transform duration-300 font-stats">{stats.unclaimedCount}</div>
                  <div className="text-[13px] font-medium text-gray-600">Unclaimed</div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-[0_8px_24px_rgba(99,102,241,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
                  <TrendingUp className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Posted Today Card */}
            <div className="group relative bg-gradient-to-br from-white via-cyan-50/40 to-blue-50/30 rounded-[28px] py-8 px-7 border border-cyan-100/50 shadow-[0_2px_12px_rgba(6,182,212,0.08),0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(6,182,212,0.15),0_4px_12px_rgba(0,0,0,0.1)] hover:border-cyan-200/60 hover:-translate-y-1.5 transition-all duration-400 min-h-[180px] flex items-center backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-transparent to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-400"></div>
              <div className="flex items-start justify-evenly gap-3 w-full relative z-10">
                <div className="flex flex-col">
                  <div className="text-5xl font-semibold text-gray-900 mb-1.5 leading-none tracking-tight group-hover:scale-105 transition-transform duration-300 font-stats">{stats.todayCount}</div>
                  <div className="text-[13px] font-medium text-gray-600">Posted Today</div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-[0_8px_24px_rgba(6,182,212,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
                  <Clock className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION - Glass Cards with Visual Richness */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
        {/* Floating gradient orbs background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-indigo-300/30 to-purple-300/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-72 h-72 bg-gradient-to-br from-blue-300/30 to-cyan-300/30 rounded-full blur-3xl"></div>
        </div>

        {/* Section Header */}
        <div className="text-center mb-10 relative z-10">
          <button
            onClick={() => {
              const section = document.getElementById('how-it-works-cards');
              if (section) {
                const navbarHeight = 80;
                const elementPosition = section.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = elementPosition - navbarHeight;
                
                window.scrollTo({
                  top: offsetPosition,
                  behavior: 'smooth'
                });
              }
            }}
            className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-indigo-100 text-gray-600 mb-4 shadow-sm hover:scale-110 hover:bg-white hover:border-indigo-200 transition-all duration-500 cursor-pointer group"
          >
            <span>How It Works</span>
            <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform duration-300" />
          </button>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight font-brand">
            Three Simple Steps to <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Success</span>
          </h2>
        </div>

        {/* Glass Cards Grid with Timeline */}
        <div id="how-it-works-cards" className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10 relative">
            
            {/* Connecting line - desktop only */}
            <div className="hidden md:block absolute top-16 left-[16.666%] right-[16.666%] h-[3px] bg-gradient-to-r from-indigo-200 via-purple-200 to-blue-200 rounded-full"></div>
            
            {/* Card 1: Report It - Apple Stats Style */}
            <div className="group relative bg-gradient-to-br from-white via-pink-50/40 to-red-50/30 rounded-[28px] p-6 border border-pink-100/50 shadow-[0_2px_12px_rgba(236,72,153,0.08),0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(236,72,153,0.15),0_4px_12px_rgba(0,0,0,0.1)] hover:border-pink-200/60 hover:-translate-y-1.5 transition-all duration-400 backdrop-blur-sm overflow-hidden">
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 via-transparent to-red-500/0 group-hover:from-pink-500/5 group-hover:to-red-500/5 transition-all duration-400"></div>
              
              <div className="relative z-10">
                {/* Number badge with glow */}
                <div className="relative mb-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-[0_8px_24px_rgba(236,72,153,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
                    <span className="text-xl font-bold text-white">1</span>
                  </div>
                </div>
                
                {/* Icon in glass container */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-50 to-red-50 border border-pink-100 mb-5 shadow-sm group-hover:scale-110 group-hover:border-pink-200 transition-all duration-300">
                  <Tag className="w-7 h-7 text-pink-600 group-hover:scale-110 transition-transform duration-300" strokeWidth={2} />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2 tracking-tight group-hover:scale-105 transition-transform duration-300">
                  Report It
                </h3>
                <p className="text-[13px] font-medium text-gray-600 leading-relaxed mb-3">
                  Post your lost or found item in just 60 seconds
                </p>
                
                {/* Feature tag */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-50 border border-pink-100">
                  <Clock className="w-3.5 h-3.5 text-pink-600" />
                  <span className="text-xs font-semibold text-pink-700">Quick & Easy</span>
                </div>
              </div>
            </div>

            {/* Card 2: Get Matched - Apple Stats Style */}
            <div className="group relative bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/30 rounded-[28px] p-6 border border-indigo-100/50 shadow-[0_2px_12px_rgba(99,102,241,0.08),0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.15),0_4px_12px_rgba(0,0,0,0.1)] hover:border-indigo-200/60 hover:-translate-y-1.5 transition-all duration-400 backdrop-blur-sm overflow-hidden">
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-transparent to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-400"></div>
              
              <div className="relative z-10">
                {/* Number badge with glow */}
                <div className="relative mb-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-[0_8px_24px_rgba(99,102,241,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
                    <span className="text-xl font-bold text-white">2</span>
                  </div>
                </div>
                
                {/* Icon in glass container */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 mb-5 shadow-sm group-hover:scale-110 group-hover:border-indigo-200 transition-all duration-300">
                  <SearchIcon className="w-7 h-7 text-indigo-600 group-hover:scale-110 transition-transform duration-300" strokeWidth={2} />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2 tracking-tight group-hover:scale-105 transition-transform duration-300">
                  Get Matched
                </h3>
                <p className="text-[13px] font-medium text-gray-600 leading-relaxed mb-3">
                  Receive instant alerts when there's a potential match
                </p>
                
                {/* Feature tag */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100">
                  <SearchIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-semibold text-indigo-700">Smart Alerts</span>
                </div>
              </div>
            </div>

            {/* Card 3: Claim It - Apple Stats Style */}
            <div className="group relative bg-gradient-to-br from-white via-cyan-50/40 to-blue-50/30 rounded-[28px] p-6 border border-cyan-100/50 shadow-[0_2px_12px_rgba(6,182,212,0.08),0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(6,182,212,0.15),0_4px_12px_rgba(0,0,0,0.1)] hover:border-cyan-200/60 hover:-translate-y-1.5 transition-all duration-400 backdrop-blur-sm overflow-hidden">
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-transparent to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-400"></div>
              
              <div className="relative z-10">
                {/* Number badge with glow */}
                <div className="relative mb-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-[0_8px_24px_rgba(6,182,212,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
                    <span className="text-xl font-bold text-white">3</span>
                  </div>
                </div>
                
                {/* Icon in glass container */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100 mb-5 shadow-sm group-hover:scale-110 group-hover:border-cyan-200 transition-all duration-300">
                  <ArrowRight className="w-7 h-7 text-cyan-600 group-hover:scale-110 transition-transform duration-300" strokeWidth={2} />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2 tracking-tight group-hover:scale-105 transition-transform duration-300">
                  Claim It
                </h3>
                <p className="text-[13px] font-medium text-gray-600 leading-relaxed mb-3">
                  Verify ownership and arrange safe pickup
                </p>
                
                {/* Feature tag */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-50 border border-cyan-100">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-600" />
                  <span className="text-xs font-semibold text-cyan-700">Secure</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Link
              to="/post-item"
              className="group/btn relative inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white font-bold text-lg rounded-[1.25rem] shadow-[0_8px_32px_rgba(99,102,241,0.35)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.5)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 overflow-hidden"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              
              <span className="relative">Get Started Now</span>
              <ArrowRight className="w-5 h-5 relative group-hover/btn:translate-x-1 transition-transform duration-300" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
