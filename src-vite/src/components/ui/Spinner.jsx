// OJT Master v2.10.0 - Standardized Spinner Component (Issue #76)

/**
 * Unified Spinner component with consistent styling
 * @param {Object} props
 * @param {'sm' | 'md' | 'lg' | 'xl'} props.size - Spinner size
 * @param {'primary' | 'white' | 'gray'} props.color - Spinner color
 * @param {string} props.className - Additional CSS classes
 */
export default function Spinner({ size = 'md', color = 'primary', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  const colorClasses = {
    primary: 'border-blue-500 border-t-transparent',
    green: 'border-green-500 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-400 border-t-transparent',
  };

  return (
    <div
      className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin ${className}`}
      role="status"
      aria-label="로딩 중"
    >
      <span className="sr-only">로딩 중...</span>
    </div>
  );
}

/**
 * Full page loading overlay with spinner
 */
export function LoadingOverlay({ message = '로딩 중...' }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-label="로딩 중"
    >
      <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-4">
        <Spinner size="lg" color="primary" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

/**
 * Inline loading indicator
 */
export function InlineSpinner({ text = '' }) {
  return (
    <div className="flex items-center gap-2">
      <Spinner size="sm" color="primary" />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
}
