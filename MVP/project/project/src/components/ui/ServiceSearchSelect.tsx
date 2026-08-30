import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Clock, Scissors } from 'lucide-react';
import type { Servico } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';

interface ServiceSearchSelectProps {
  servicos: Servico[];
  value: string; // servico.id
  onChange: (servicoId: string) => void;
  error?: boolean;
}

export function ServiceSearchSelect({
  servicos,
  value,
  onChange,
  error = false,
}: ServiceSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedService = servicos.find((s) => s.id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const filteredServicos = servicos.filter((s) =>
    s.nome.toLowerCase().includes(search.toLowerCase()) ||
    (s.descricao && s.descricao.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Botão Gatilho */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all border text-sm',
          'bg-[#121212] text-[#F5F5F5]',
          isOpen ? 'border-highlight/60 ring-2 ring-highlight/15' : 'border-white/10 hover:border-white/20',
          error && 'border-danger/60',
          !selectedService && 'text-cream/40'
        )}
      >
        <div className="flex items-center gap-3 truncate">
          <div className="w-8 h-8 rounded-lg bg-highlight/10 flex items-center justify-center shrink-0 text-highlight">
            <Scissors size={16} />
          </div>
          {selectedService ? (
            <div className="truncate">
              <span className="font-medium text-[#F5F5F5] block truncate">{selectedService.nome}</span>
              <span className="text-xs text-cream/50 flex items-center gap-2">
                <span>{formatCurrency(selectedService.preco)}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {selectedService.duracao_minutos} min
                </span>
              </span>
            </div>
          ) : (
            <span>Selecione um serviço...</span>
          )}
        </div>
        <ChevronDown
          size={18}
          className={cn('text-cream/40 transition-transform duration-200 shrink-0 ml-2', isOpen && 'rotate-180 text-highlight')}
        />
      </button>

      {/* Dropdown Menu com Busca */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-[#161616] border border-white/15 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in max-h-72 flex flex-col backdrop-blur-xl">
          {/* Campo de Busca */}
          <div className="p-3 border-b border-white/10 bg-[#121212] sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cream/40 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar serviço por nome..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#F5F1EA] placeholder:text-cream/35 focus:outline-none focus:border-highlight/50"
              />
            </div>
          </div>

          {/* Lista de Opções */}
          <div className="overflow-y-auto p-1.5 space-y-1 flex-1">
            {filteredServicos.length === 0 ? (
              <div className="py-6 text-center text-xs text-cream/40">
                Nenhum serviço encontrado com "{search}"
              </div>
            ) : (
              filteredServicos.map((servico) => {
                const isSelected = servico.id === value;
                return (
                  <button
                    key={servico.id}
                    type="button"
                    onClick={() => {
                      onChange(servico.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors text-xs',
                      isSelected
                        ? 'bg-highlight/15 text-highlight font-medium'
                        : 'text-cream/80 hover:bg-white/5 hover:text-[#F5F5F5]'
                    )}
                  >
                    <div className="truncate pr-2">
                      <p className={cn('font-medium truncate', isSelected ? 'text-highlight' : 'text-[#F5F5F5]')}>
                        {servico.nome}
                      </p>
                      <p className="text-[11px] text-cream/50 mt-0.5 flex items-center gap-2">
                        <span>{formatCurrency(servico.preco)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Clock size={10} /> {servico.duracao_minutos} min
                        </span>
                      </p>
                    </div>
                    {isSelected && <Check size={16} className="text-highlight shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
