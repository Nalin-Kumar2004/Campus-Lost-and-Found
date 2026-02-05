import { Lock, Database, Eye, Mail, UserCheck } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden pt-24">
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-red-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-600 text-lg">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Section 1 */}
          <div className="bg-gradient-to-br from-white via-white/80 to-white/60 backdrop-blur-xl rounded-[20px] sm:rounded-[24px] p-5 sm:p-8 border border-white/50 shadow-[0_8px_32px_rgba(99,102,241,0.1)]">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Database className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">Information We Collect</h2>
                <div className="space-y-3 text-gray-600 leading-relaxed">
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Email address, name, and password</li>
                    <li>Item details: photos, descriptions, locations, and dates</li>
                    <li>Claim verification details and messages</li>
                    <li>Usage data to improve platform experience</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-gradient-to-br from-white via-white/80 to-white/60 backdrop-blur-xl rounded-[20px] sm:rounded-[24px] p-5 sm:p-8 border border-white/50 shadow-[0_8px_32px_rgba(99,102,241,0.1)]">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-red-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Eye className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">How We Use Your Information</h2>
                <div className="space-y-3 text-gray-600 leading-relaxed">
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Operate and maintain the platform</li>
                    <li>Connect item owners with claimants</li>
                    <li>Send notifications about claims and account updates</li>
                    <li>Improve user experience and security</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-gradient-to-br from-white via-white/80 to-white/60 backdrop-blur-xl rounded-[20px] sm:rounded-[24px] p-5 sm:p-8 border border-white/50 shadow-[0_8px_32px_rgba(99,102,241,0.1)]">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">Information Sharing</h2>
                <div className="space-y-3 text-gray-600 leading-relaxed">
                  <p>We do NOT sell your data. Sharing is limited to:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Item posts are visible to all users</li>
                    <li>Claims are shared with item owners only</li>
                    <li>Legal compliance when required</li>
                  </ul>
                  <p className="mt-3 font-medium">Your email is never publicly displayed.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-gradient-to-br from-white via-white/80 to-white/60 backdrop-blur-xl rounded-[20px] sm:rounded-[24px] p-5 sm:p-8 border border-white/50 shadow-[0_8px_32px_rgba(99,102,241,0.1)]">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">Data Security</h2>
                <div className="space-y-3 text-gray-600 leading-relaxed">
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Encrypted passwords</li>
                    <li>Secure HTTPS connections</li>
                    <li>Regular security updates</li>
                    <li>Limited staff access to data</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5 */}
          <div className="bg-gradient-to-br from-white via-white/80 to-white/60 backdrop-blur-xl rounded-[20px] sm:rounded-[24px] p-5 sm:p-8 border border-white/50 shadow-[0_8px_32px_rgba(99,102,241,0.1)]">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">Your Rights</h2>
                <div className="space-y-3 text-gray-600 leading-relaxed">
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Update your account information anytime</li>
                    <li>Delete your items and account</li>
                    <li>Manage email notification preferences</li>
                    <li>Request your data or account deletion</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="relative group bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-[20px] sm:rounded-[24px] p-[2px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
            <div className="relative bg-white rounded-[18px] sm:rounded-[22px] p-5 sm:p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <Mail className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">Have Questions?</h3>
              <p className="text-gray-600 mb-5 text-sm sm:text-base">We're here to help! Reach out to our support team anytime.</p>
              <a 
                href="mailto:support@campuslostandfound.com" 
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white rounded-xl font-semibold text-sm sm:text-base hover:shadow-lg hover:shadow-indigo-500/50 hover:scale-105 transition-all duration-300 w-full sm:w-auto"
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span className="truncate">support@campuslostandfound.com</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
