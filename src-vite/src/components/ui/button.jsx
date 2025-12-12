// shadcn/ui Button Component
// Based on Radix UI Slot for composition

import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary-600 text-white shadow hover:bg-primary-700 active:bg-primary-800',
        destructive:
          'bg-error-500 text-white shadow-sm hover:bg-error-600 active:bg-error-700',
        outline:
          'border border-gray-200 bg-white shadow-sm hover:bg-gray-50 hover:text-gray-900',
        secondary:
          'bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200',
        ghost:
          'hover:bg-gray-100 hover:text-gray-900',
        link:
          'text-primary-600 underline-offset-4 hover:underline',
        success:
          'bg-success-500 text-white shadow hover:bg-success-600 active:bg-success-700',
        warning:
          'bg-warning-500 text-white shadow hover:bg-warning-600 active:bg-warning-700',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        xl: 'h-12 rounded-lg px-10 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
