import { Link } from 'react-router-dom';
import { Mail, Github, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative mt-auto border-t border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Left - Branding */}
          <div className="text-center md:text-left">
            <p className="text-sm font-semibold text-gray-900 font-brand">Campus Lost & Found</p>
            <p className="text-xs text-gray-500 mt-1">
              © {new Date().getFullYear()} All rights reserved.
            </p>
          </div>

          {/* Center - Links */}
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
              Privacy Policy
            </Link>
            <a href="mailto:support@campuslostandfound.com" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              Contact
            </a>
          </div>

          {/* Right - Social */}
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/Nalin-Kumar2004"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-all"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href="https://www.linkedin.com/in/nalin-kumar-swe"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all"
            >
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

