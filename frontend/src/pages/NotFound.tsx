/**
 * 404 NOT FOUND PAGE
 * 
 * Clean, minimal 404 page matching our design system.
 */

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="text-center">
        {/* Large 404 */}
        <h1 className="text-[120px] sm:text-[180px] font-black leading-none bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent select-none">
          404
        </h1>
        
        {/* Simple message */}
        <p className="text-lg text-gray-600 mt-2 mb-8">
          This page doesn't exist
        </p>

        {/* Single CTA */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
