import React from 'react';
import { cn } from '@/lib/utils';

interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function InputGroup({ className, ...rest }: InputGroupProps) {
  return (
    <div
      {...rest}
      className={cn('flex items-stretch gap-2', className)}
    />
  );
}

interface InputGroupInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  className?: string;
}

export const InputGroupInput = React.forwardRef<HTMLInputElement, InputGroupInputProps>(
  function InputGroupInput({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        {...rest}
        className={cn(
          'w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder:text-cream/35',
          'focus:outline-none focus:border-highlight/50 focus:ring-2 focus:ring-highlight/15 transition-all',
          className
        )}
      />
    );
  }
);

interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function InputGroupAddon({ className, ...rest }: InputGroupAddonProps) {
  return (
    <div
      {...rest}
      className={cn(
        'flex items-center justify-center shrink-0 px-2 text-cream/40',
        className
      )}
    />
  );
}
