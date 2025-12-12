// Stats Card Component
// Dashboard statistics display card with icon, value, label, and trend

import { cn } from '@/lib/utils';
import { Card, CardContent } from './card';

/**
 * Stats Card for dashboard metrics
 * @param {object} props
 * @param {string} props.icon - Emoji or icon string
 * @param {string|number} props.value - Main value to display
 * @param {string} props.label - Description label
 * @param {string} [props.trend] - Trend indicator (e.g., "↑ 12%")
 * @param {'default'|'success'|'warning'|'error'} [props.variant] - Color variant
 * @param {string} [props.className] - Additional classes
 */
export function StatsCard({
  icon,
  value,
  label,
  trend,
  variant = 'default',
  className,
  ...props
}) {
  const valueColorClass = {
    default: 'text-gray-800',
    success: 'text-success-600',
    warning: 'text-warning-600',
    error: 'text-error-600',
  };

  const trendColorClass = {
    default: 'text-gray-500',
    success: 'text-success-600',
    warning: 'text-warning-600',
    error: 'text-error-600',
  };

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)} {...props}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className={cn('text-2xl font-bold mt-1', valueColorClass[variant])}>
              {value}
            </p>
            {trend && (
              <p className={cn('text-xs mt-1', trendColorClass[variant])}>
                {trend}
              </p>
            )}
          </div>
          {icon && (
            <div className="text-2xl opacity-80">{icon}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Stats Card Grid - Container for multiple stats cards
 */
export function StatsCardGrid({ children, className, columns = 4 }) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
}

export default StatsCard;
