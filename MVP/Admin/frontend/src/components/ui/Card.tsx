import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        'glass rounded-2xl p-4 sm:p-6',
        hover && 'hover-lift cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}
