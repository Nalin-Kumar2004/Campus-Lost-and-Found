import { useEffect } from 'react';
import { X, Upload, Search, MessageSquare, CheckCircle } from 'lucide-react';

interface HowItWorksProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorks({ isOpen, onClose }: HowItWorksProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const steps = [
    {
      icon: Upload,
      title: 'Post Item',
      description: 'Upload photos and describe your lost or found item.',
      gradient: 'from-indigo-500 to-purple-500',
      bgGradient: 'from-white via-indigo-50/40 to-purple-50/30',
      borderColor: 'border-indigo-100/50',
      hoverBorder: 'hover:border-indigo-200/60',
      hoverFrom: 'group-hover:from-indigo-500/5',
      hoverTo: 'group-hover:to-purple-500/5',
      shadowColor: 'rgba(99,102,241,0.08)'
    },
    {
      icon: Search,
      title: 'Browse & Search',
      description: 'Filter by category, location, and date.',
      gradient: 'from-pink-500 to-red-500',
      bgGradient: 'from-white via-pink-50/40 to-red-50/30',
      borderColor: 'border-pink-100/50',
      hoverBorder: 'hover:border-pink-200/60',
      hoverFrom: 'group-hover:from-pink-500/5',
      hoverTo: 'group-hover:to-red-500/5',
      shadowColor: 'rgba(236,72,153,0.08)'
    },
    {
      icon: MessageSquare,
      title: 'Submit Claim',
      description: 'Found a match? Submit verification details.',
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-white via-green-50/40 to-emerald-50/30',
      borderColor: 'border-green-100/50',
      hoverBorder: 'hover:border-green-200/60',
      hoverFrom: 'group-hover:from-green-500/5',
      hoverTo: 'group-hover:to-emerald-500/5',
      shadowColor: 'rgba(34,197,94,0.08)'
    },
    {
      icon: CheckCircle,
      title: 'Get Reunited',
      description: 'Coordinate pickup and mark as completed.',
      gradient: 'from-cyan-500 to-blue-500',
      bgGradient: 'from-white via-cyan-50/40 to-blue-50/30',
      borderColor: 'border-cyan-100/50',
      hoverBorder: 'hover:border-cyan-200/60',
      hoverFrom: 'group-hover:from-cyan-500/5',
      hoverTo: 'group-hover:to-blue-500/5',
      shadowColor: 'rgba(6,182,212,0.08)'
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200" 
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-[24px] shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              How It Works
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">4 simple steps to get started</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps - 2x2 Grid */}
        <div className="p-7">
          <div className="grid grid-cols-2 gap-5">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`group relative bg-gradient-to-br ${step.bgGradient} rounded-[20px] p-5 border ${step.borderColor} shadow-[0_2px_12px_${step.shadowColor}] hover:shadow-[0_12px_32px_rgba(99,102,241,0.15)] ${step.hoverBorder} hover:-translate-y-1.5 transition-all duration-400 backdrop-blur-sm overflow-hidden min-h-[140px] flex items-center`}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent ${step.hoverFrom} ${step.hoverTo} transition-all duration-400`}></div>
                
                <div className="relative flex items-start gap-4 w-full z-10">
                  {/* Icon with number */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-14 h-14 bg-gradient-to-br ${step.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-400`}>
                      <step.icon className="w-7 h-7 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-gradient-to-br from-white to-gray-50 border-2 border-white rounded-full flex items-center justify-center shadow-md">
                      <span className="text-[11px] font-bold text-gray-700">{index + 1}</span>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1.5 group-hover:scale-105 transition-transform duration-300">{step.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
