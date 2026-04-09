import { cn } from '../../lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'lowest' | 'low' | 'high' | 'highest';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'lowest', ...props }, ref) => {
    const variants = {
      lowest: 'bg-surface-container-lowest',
      low: 'bg-surface-container-low',
      high: 'bg-surface-container-high',
      highest: 'bg-surface-container-highest',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg p-8 transition-all duration-300',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export { Card };
