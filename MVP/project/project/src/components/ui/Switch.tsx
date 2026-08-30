import React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export function Switch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className,
  label,
}: SwitchProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onChange(!checked);
    }
  };

  const dimensions = {
    sm: { track: 'w-9 h-5', knob: 'w-3.5 h-3.5', translate: 'translate-x-4' },
    md: { track: 'w-12 h-6.5 py-0.5 px-0.5', knob: 'w-5 h-5', translate: 'translate-x-5.5' },
    lg: { track: 'w-14 h-7.5 py-1 px-1', knob: 'w-5.5 h-5.5', translate: 'translate-x-6.5' },
  }[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label || (checked ? 'Ativo' : 'Inativo')}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'relative inline-flex items-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight/50',
        dimensions.track,
        checked
          ? 'bg-gradient-to-r from-[#4FE7FF] to-[#2bd4ef] shadow-lg shadow-highlight/20'
          : 'bg-white/10 hover:bg-white/15',
        disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
    >
      <span
        className={cn(
          'inline-block rounded-full bg-white shadow-md transform transition-transform duration-300 pointer-events-none',
          dimensions.knob,
          checked ? dimensions.translate : 'translate-x-0.5',
          !checked && 'bg-cream/70'
        )}
      />
    </button>
  );
}
