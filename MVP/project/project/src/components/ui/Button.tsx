import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-[#c5a572] to-[#a08555] text-black font-semibold hover:from-[#e0c896] hover:to-[#c5a572] shadow-lg shadow-[#c5a572]/20',
  secondary:
    'bg-[#1a1a1a] text-cream border border-[#c5a572]/30 hover:border-[#c5a572]/60 hover:bg-[#222]',
  ghost: 'text-cream/70 hover:text-cream hover:bg-white/5',
  outline:
    'border border-[#c5a572]/40 text-[#c5a572] hover:bg-[#c5a572]/10 hover:border-[#c5a572]',
  danger: 'bg-red-900/30 text-red-400 border border-red-800/50 hover:bg-red-900/50',
};

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-6 py-3 text-sm rounded-xl',
  lg: 'px-8 py-4 text-base rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
