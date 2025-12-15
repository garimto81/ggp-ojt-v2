// shadcn/ui Input Component
// Accessible form input with focus states

import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

const Input = forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-gray-700',
        'placeholder:text-gray-400',
        'focus-visible:ring-primary-500 focus-visible:border-transparent focus-visible:ring-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
