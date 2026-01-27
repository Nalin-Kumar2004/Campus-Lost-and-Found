// Loader styles injected via CSS-in-JS
const loaderStyles = `
  .loader {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: inline-block;
    position: relative;
    border-top: 4px solid #3b82f6;
    border-right: 4px solid transparent;
    box-sizing: border-box;
    animation: rotation 1s linear infinite;
  }
  .loader::after {
    content: '';  
    box-sizing: border-box;
    position: absolute;
    left: 0;
    top: 0;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border-bottom: 4px solid #ec4899;
    border-left: 4px solid transparent;
  }
  
  .loader-sm { width: 24px; height: 24px; }
  .loader-sm::after { width: 24px; height: 24px; border-width: 2px; }
  .loader-sm { border-width: 2px; }
  
  .loader-md { width: 36px; height: 36px; }
  .loader-md::after { width: 36px; height: 36px; border-width: 3px; }
  .loader-md { border-width: 3px; }
  
  .loader-lg { width: 48px; height: 48px; }
  .loader-lg::after { width: 48px; height: 48px; border-width: 4px; }
  .loader-lg { border-width: 4px; }
  
  .loader-xl { width: 64px; height: 64px; }
  .loader-xl::after { width: 64px; height: 64px; border-width: 5px; }
  .loader-xl { border-width: 5px; }

  @keyframes rotation {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject styles once
if (typeof document !== 'undefined') {
  const styleId = 'loader-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = loaderStyles;
    document.head.appendChild(styleEl);
  }
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Spinner({ size = 'lg', className = '' }: SpinnerProps) {
  const sizeClass = `loader-${size}`;
  
  return (
    <span className={`loader ${sizeClass} text-indigo-600 ${className}`}></span>
  );
}

// Named export for consistency
export { Spinner };

// Page loading spinner with text
export function PageSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <span className="loader text-indigo-600"></span>
        {text && (
          <p className="text-sm font-medium text-gray-600">{text}</p>
        )}
      </div>
    </div>
  );
}

// Button spinner (inline, smaller, white for dark buttons)
export function ButtonSpinner() {
  return (
    <span className="loader loader-sm text-white inline-block mr-2" style={{ width: '20px', height: '20px' }}></span>
  );
}
