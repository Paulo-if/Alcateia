import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'gold';
}

const variants = {
  default: 'bg-white/10 text-cream/70',
  success: 'bg-green-900/30 text-green-400 border border-green-800/40',
  warning: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/40',
  danger: 'bg-red-900/30 text-red-400 border border-red-800/40',
  gold: 'bg-[#c5a572]/15 text-[#c5a572] border border-[#c5a572]/30',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
