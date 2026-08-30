import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  className,
  wrapperClassName,
  ...rest
}: SearchInputProps) {
  return (
    <div className={cn('relative flex items-center w-full', wrapperClassName)}>
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-cream/40 flex items-center justify-center">
        <Search size={18} className="transition-colors group-focus-within:text-highlight" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full bg-[#121212] border border-white/10 rounded-xl py-2.5 pl-11 pr-10 text-sm text-[#F5F5F5] placeholder:text-cream/35',
          'focus:outline-none focus:border-highlight/50 focus:ring-2 focus:ring-highlight/15 transition-all',
          className
        )}
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-cream/40 hover:text-[#F5F5F5] rounded-md transition-colors"
          aria-label="Limpar busca"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
