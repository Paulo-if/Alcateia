import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Calendário mensal customizado do Admin, visualmente unificado com o
 * calendário "Mais datas" do Cliente (CalendarModal).
 *
 * Suporta dois modos:
 *  - 'single': seleção de um único dia (fecha ao selecionar);
 *  - 'range' : seleção de um intervalo (De/Até), aplicado via botão.
 *
 * Apenas a apresentação é tratada aqui — a lógica de datas/disponibilidade
 * fica nos chamadores.
 */
type CalMode = 'single' | 'range';

interface CalendarModalProps {
  open: boolean;
  mode: CalMode;
  title?: string;
  /** single mode */
  value?: string | null;
  onSelect?: (date: string) => void;
  /** range mode */
  startValue?: string | null;
  endValue?: string | null;
  onApply?: (start: string, end: string) => void;
  /** data mínima (YYYY-MM-DD); sem restrição quando vazio/null */
  minDate?: string | null;
  onClose: () => void;
}

const WEEKDAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

function toDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function moveMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function getMonthMatrix(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const firstWeekday = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function CalendarModal({
  open,
  mode,
  title,
  value,
  onSelect,
  startValue,
  endValue,
  onApply,
  minDate,
  onClose,
}: CalendarModalProps) {
  const todayStr = formatYMD(new Date());
  const initialDate = mode === 'single' ? (value || minDate || todayStr) : (startValue || minDate || todayStr);

  const [viewDate, setViewDate] = useState<Date>(() => toDate(initialDate));
  // range: preview de início/fim enquanto navega (só confirma no botão Aplicar)
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const seed = mode === 'single' ? (value || minDate || todayStr) : (startValue || minDate || todayStr);
      setViewDate(toDate(seed));
      setRangeStart(mode === 'range' ? (startValue ?? null) : null);
      setRangeEnd(mode === 'range' ? (endValue ?? null) : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, value, startValue, endValue, minDate]);

  const weeks = useMemo(
    () => getMonthMatrix(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  if (!open) return null;

  const monthsBack = (viewDate.getFullYear() - toDate(initialDate).getFullYear()) * 12 +
    (viewDate.getMonth() - toDate(initialDate).getMonth());
  // limite: não navegar antes da data mínima nem mais de 24 meses à frente
  const canGoPrev = !minDate || viewDate > toDate(minDate);
  const canGoNext = monthsBack < 24;

  const isBeforeMin = (key: string) => !!minDate && key < minDate;

  const handleCell = (key: string) => {
    if (isBeforeMin(key)) return;
    if (mode === 'single') {
      onSelect?.(key);
      onClose();
      return;
    }
    // range
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(key);
      setRangeEnd(null);
    } else {
      let end = key;
      let start = rangeStart;
      if (key < rangeStart) {
        start = key;
        end = rangeStart;
      }
      setRangeEnd(end);
      setRangeStart(start);
    }
  };

  const rangeActive = !!rangeStart && !!rangeEnd;
  const inRange = (key: string) => {
    if (!rangeStart || !rangeEnd) return false;
    return key > (rangeStart < rangeEnd ? rangeStart : rangeEnd) &&
      key < (rangeStart > rangeEnd ? rangeStart : rangeEnd);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label={title || 'Escolher data'}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-[360px] rounded-[22px] border border-white/15 bg-[#141414] p-5 shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between mb-3.5">
          <button
            type="button"
            onClick={() => setViewDate(moveMonth(viewDate, -1))}
            disabled={!canGoPrev}
            aria-label="Mês anterior"
            className="inline-flex items-center justify-center w-9 h-9 rounded-[10px] border border-white/10 bg-transparent text-cream transition-colors hover:border-highlight/40 hover:text-highlight hover:bg-highlight/10 disabled:opacity-35 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>
          <strong className="text-base font-extrabold capitalize text-[#F5F1EA]">
            {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(viewDate)}
          </strong>
          <button
            type="button"
            onClick={() => setViewDate(moveMonth(viewDate, 1))}
            disabled={!canGoNext}
            aria-label="Próximo mês"
            className="inline-flex items-center justify-center w-9 h-9 rounded-[10px] border border-white/10 bg-transparent text-cream transition-colors hover:border-highlight/40 hover:text-highlight hover:bg-highlight/10 disabled:opacity-35 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((w) => (
            <span key={w} className="text-center text-[10px] font-extrabold tracking-[0.06em] text-cream/40">
              {w}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((date, i) => {
            if (!date) {
              return <span key={`empty-${i}`} className="aspect-square" />;
            }
            const key = formatYMD(date);
            const isSelected =
              mode === 'single' ? value === key : key === rangeStart || key === rangeEnd;
            const isToday = key === todayStr;
            const disabled = isBeforeMin(key);

            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => handleCell(key)}
                aria-pressed={isSelected}
                className={cn(
                  'aspect-square inline-flex items-center justify-center rounded-[10px] border border-transparent text-sm font-semibold transition-colors',
                  disabled
                    ? 'text-cream/40 opacity-40 cursor-not-allowed'
                    : 'text-[#F5F1EA] hover:border-highlight/40 hover:bg-highlight/10 hover:text-highlight',
                  inRange(key) && 'bg-highlight/10 text-highlight',
                  isToday && !isSelected && 'ring-1 ring-highlight/50 text-highlight',
                  isSelected &&
                    'border-highlight bg-highlight text-black font-extrabold hover:bg-highlight hover:text-black',
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        {mode === 'single' ? (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-full mt-4 py-2.5 rounded-xl border border-white/10 bg-transparent text-cream/60 font-semibold transition-colors hover:border-highlight/40 hover:text-highlight"
          >
            Fechar
          </button>
        ) : (
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 bg-transparent text-cream/60 font-semibold transition-colors hover:border-highlight/40 hover:text-highlight"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (rangeStart && rangeEnd) {
                  onApply?.(rangeStart, rangeEnd);
                  onClose();
                }
              }}
              disabled={!rangeActive}
              className="flex-1 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-highlight to-[#2bd4ef] text-black transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
