import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';

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
  const { disabled } = rest;

  return (
    <InputGroup
      className={cn(
        'w-full items-center',
        disabled && 'opacity-60 pointer-events-none',
        wrapperClassName
      )}
    >
      <InputGroupAddon>
        <Search size={18} />
      </InputGroupAddon>
      <InputGroupInput
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        {...rest}
      />
      {value && (
        <InputGroupAddon>
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1 text-cream/40 hover:text-[#F5F5F5] rounded-md transition-colors"
            aria-label="Limpar busca"
          >
            <X size={15} />
          </button>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
