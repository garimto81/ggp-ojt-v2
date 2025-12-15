// shadcn/ui Progress Component
// Accessible progress bar

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Progress = forwardRef(({ className, value = 0, max = 100, ...props }, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-gray-200', className)}
      {...props}
    >
      <div
        className="bg-primary-500 h-full transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
});
Progress.displayName = 'Progress';

// Variant with different colors
const ProgressVariant = forwardRef(
  ({ className, value = 0, max = 100, variant = 'default', ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const variantStyles = {
      default: 'bg-primary-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      error: 'bg-error-500',
    };

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-gray-200', className)}
        {...props}
      >
        <div
          className={cn('h-full transition-all duration-300 ease-in-out', variantStyles[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);
ProgressVariant.displayName = 'ProgressVariant';

export { Progress, ProgressVariant };
