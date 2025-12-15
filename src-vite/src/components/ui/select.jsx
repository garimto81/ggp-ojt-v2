// Simple Select Component
// Native select with consistent styling (no Radix dependency for simplicity)

import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

const Select = forwardRef(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm',
        'focus:ring-primary-500 focus:border-transparent focus:ring-2 focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'appearance-none bg-right bg-no-repeat',
        // Custom dropdown arrow
        "bg-[url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")] bg-[length:1.5em_1.5em] bg-[right_0.5rem_center]",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = 'Select';

const SelectOption = forwardRef(({ className, ...props }, ref) => {
  return <option ref={ref} className={cn('', className)} {...props} />;
});
SelectOption.displayName = 'SelectOption';

export { Select, SelectOption };
