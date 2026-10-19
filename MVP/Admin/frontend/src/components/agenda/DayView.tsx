import { useMemo } from 'react';
import { CheckCircle2, XCircle, CalendarX, Clock } from 'lucide-react';
import type { Agendamento, Servico, Cliente, Profissional } from '@/types';
import { formatCurrency, formatTime, formatDateInput, cn } from '@/lib/utils';
import {
  getBarbershopDateKey,
  getBarbershopMinutes,
  getBarbershopNowMinutes,
  getBarbershopTodayKey,
} from '@/lib/timezone';

export type AgendamentoDayItem = Agendamento & {
  servico?: Pick<Servico, 'id' | 'nome' | 'duracao_minutos'> | null;
  cliente?: Pick<Cliente, 'id' | 'nome' | 'telefone' | 'email'> | null;
  profissional?: Pick<Profissional, 'id' | 'name' | 'specialty'> | null;
};

interface DayViewProps {
  date: Date | string;
  agendamentos: AgendamentoDayItem[];
  onSelectEvent?: (agendamento: AgendamentoDayItem) => void;
  onSlotClick?: (dateStr: string, timeStr: string) => void;
  startHour?: number;
  endHour?: number;
  className?: string;
  compact?: boolean; // Para uso em cards compactos (ex: Dashboard)
}

const HOUR_HEIGHT_PX = 64; // altura de 1 hora na grade
const COMPACT_HOUR_HEIGHT_PX = 52;

export function DayView({
  date,
  agendamentos,
  onSelectEvent,
  onSlotClick,
  startHour = 8,
  endHour = 20,
  className,
  compact = false,
}: DayViewProps) {
  const targetDate = useMemo(() => (typeof date === 'string' ? new Date(`${date}T00:00:00`) : date), [date]);
  // "Hoje" é determinado no fuso da barbearia (America/Sao_Paulo), não no do navegador.
  const targetKey = useMemo(() => getBarbershopDateKey(targetDate), [targetDate]);
  const isToday = targetKey === getBarbershopTodayKey();

  const hourHeight = compact ? COMPACT_HOUR_HEIGHT_PX : HOUR_HEIGHT_PX;
  const totalHours = endHour - startHour;
  const gridHeight = totalHours * hourHeight;

  // Horários exibidos na coluna
  const hoursList = useMemo(() => {
    const list: number[] = [];
    for (let h = startHour; h < endHour; h++) {
      list.push(h);
    }
    return list;
  }, [startHour, endHour]);

  // Posição atual da linha do tempo (relógio da barbearia)
  const nowPosition = useMemo(() => {
    if (!isToday) return null;
    const nowMinutes = getBarbershopNowMinutes();
    if (nowMinutes < startHour * 60 || nowMinutes > endHour * 60) return null;
    return ((nowMinutes - startHour * 60) / 60) * hourHeight;
  }, [isToday, startHour, endHour, hourHeight]);

  // Agora no fuso da barbearia (usado para os estados temporais dos cards)
  const nowSPMinutes = isToday ? getBarbershopNowMinutes() : null;

  // Processar eventos e calcular posições respeitando a duração real
  const positionedEvents = useMemo(() => {
    return agendamentos.map((ag) => {
      const startDate = new Date(ag.data_inicio);
      const endDate = new Date(ag.data_fim);

      // Posiciona pelos minutos do relógio da barbearia (não do navegador).
      const startMinutes = getBarbershopMinutes(startDate);
      const endMinutes = getBarbershopMinutes(endDate);

      const gridStartMinutes = startHour * 60;
      const topMinutes = Math.max(0, startMinutes - gridStartMinutes);
      const durationMinutes = Math.max(20, endMinutes - startMinutes || (ag.servico?.duracao_minutos ?? 30));

      const top = (topMinutes / 60) * hourHeight;
      const height = Math.max(26, (durationMinutes / 60) * hourHeight - 3);

      // Estado temporal (apenas quando a grade mostra o dia de hoje no fuso SP):
      // passado => escuro/transparente; acontecendo agora => destaque; futuro => normal.
      let temporal: 'past' | 'now' | 'future' | null = null;
      if (isToday && nowSPMinutes !== null && ag.status !== 'cancelado') {
        if (nowSPMinutes > endMinutes) temporal = 'past';
        else if (nowSPMinutes >= startMinutes) temporal = 'now';
        else temporal = 'future';
      }

      return {
        ...ag,
        top,
        height,
        temporal,
        startTimeFormatted: formatTime(startDate),
        endTimeFormatted: formatTime(endDate),
      };
    });
  }, [agendamentos, startHour, hourHeight, isToday, nowSPMinutes]);

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSlotClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const totalMinutes = (offsetY / hourHeight) * 60;
    const clickedHour = Math.floor(startHour + totalMinutes / 60);
    const clickedMinute = Math.floor((totalMinutes % 60) / 30) * 30;

    const formattedTime = `${clickedHour.toString().padStart(2, '0')}:${clickedMinute.toString().padStart(2, '0')}`;
    const dateStr = formatDateInput(targetDate);
    onSlotClick(dateStr, formattedTime);
  };

  return (
    <div className={cn('relative w-full rounded-2xl bg-[#0D0D0D] border border-white/10 overflow-hidden flex flex-col', className)}>
      {/* Grade de Horários com Scroll */}
      <div className="relative overflow-y-auto max-h-[580px] select-none p-2 sm:p-3">
        <div className="relative flex" style={{ minHeight: `${gridHeight}px` }}>
          {/* Coluna de Horas */}
          <div className="w-12 sm:w-16 shrink-0 border-r border-white/5 pr-2 sm:pr-3 flex flex-col select-none">
            {hoursList.map((hour) => (
              <div
                key={hour}
                style={{ height: `${hourHeight}px` }}
                className="relative -top-2.5 text-right text-[11px] font-medium text-cream/40"
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Área Central da Grade */}
          <div
            onClick={handleGridClick}
            className="flex-1 relative ml-2 sm:ml-4 cursor-pointer"
            title="Clique para agendar neste horário"
          >
            {/* Linhas Horizontais das Horas */}
            {hoursList.map((hour, idx) => (
              <div
                key={hour}
                style={{ top: `${idx * hourHeight}px` }}
                className="absolute left-0 right-0 border-t border-white/[0.06] pointer-events-none"
              >
                <div
                  style={{ top: `${hourHeight / 2}px` }}
                  className="absolute left-0 right-0 border-t border-dashed border-white/[0.025]"
                />
              </div>
            ))}

            {/* Linha Vermelha de Agora */}
            {nowPosition !== null && (
              <div
                style={{ top: `${nowPosition}px` }}
                className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#F51D1D] -ml-1.5 shadow-md shadow-[#F51D1D]/50" />
                <div className="flex-1 h-[1.5px] bg-[#F51D1D]/80" />
              </div>
            )}

            {/* Empty State visual integrado */}
            {agendamentos.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none py-12 px-4 text-center z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-2 text-cream/30">
                  <CalendarX size={20} />
                </div>
                <h4 className="text-xs font-semibold text-[#F5F1EA] mb-0.5">Nenhum agendamento</h4>
                <p className="text-[11px] text-cream/40 max-w-xs">
                  Não existem horários reservados para este dia.
                </p>
              </div>
            )}

            {/* Eventos Posicionados */}
            {positionedEvents.map((event) => {
              const isConcluido = event.status === 'concluido';
              const isCancelado = event.status === 'cancelado';
              const isCompactMode = compact || event.height < 50;

              return (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEvent?.(event);
                  }}
                  style={{
                    top: `${event.top}px`,
                    height: `${event.height}px`,
                  }}
                  className={cn(
                    'absolute left-1 right-2 sm:right-3 rounded-xl z-10 cursor-pointer overflow-hidden',
                    'transition-all duration-150 hover:scale-[1.01] hover:shadow-xl hover:z-30 group border',
                    isCompactMode ? 'flex items-center px-2.5' : 'flex flex-col justify-between p-2 sm:p-2.5 leading-tight',
                    isConcluido
                      ? 'bg-[#81FF4D]/15 border-[#81FF4D]/40 text-cream hover:border-[#81FF4D]'
                      : isCancelado
                      ? 'bg-[#F51D1D]/15 border-[#F51D1D]/30 text-cream opacity-60'
                      : event.temporal === 'past'
                      ? 'bg-[#0D0D0D]/60 border-white/10 text-cream/50 opacity-50 hover:border-highlight/40'
                      : event.temporal === 'now'
                      ? 'bg-gradient-to-r from-[#14333d] to-[#0f232b] border-highlight text-white shadow-lg shadow-highlight/15 hover:border-highlight'
                      : 'bg-gradient-to-r from-[#182830] to-[#121c22] border-highlight/40 text-white hover:border-highlight shadow-sm'
                  )}
                >
                  {isCompactMode ? (
                    /* FORMATO COMPACTO LIMPO: "Nome do Cliente • Serviço" em linha única */
                    <div className="w-full flex items-center justify-between gap-1.5 overflow-hidden">
                      <span className="text-xs font-semibold text-[#F5F1EA] truncate group-hover:text-highlight transition-colors">
                        {event.cliente?.nome || 'Cliente'}
                        {event.servico?.nome && (
                          <span className="text-cream/60 font-normal"> • {event.servico.nome}</span>
                        )}
                      </span>
                      {isConcluido && <CheckCircle2 size={12} className="text-[#81FF4D] shrink-0" />}
                      {isCancelado && <XCircle size={12} className="text-[#F51D1D] shrink-0" />}
                    </div>
                  ) : (
                    /* FORMATO DETALHADO (apenas quando houver altura suficiente e não for compacto) */
                    <>
                      <div className="flex items-start justify-between gap-1 overflow-hidden">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <p className="text-xs sm:text-sm font-bold truncate text-[#F5F1EA] m-0 group-hover:text-highlight transition-colors">
                              {event.cliente?.nome || 'Cliente'}
                            </p>
                            {isConcluido && <CheckCircle2 size={12} className="text-[#81FF4D] shrink-0" />}
                            {isCancelado && <XCircle size={12} className="text-[#F51D1D] shrink-0" />}
                          </div>

                          {event.servico?.nome && (
                            <p className="text-[11px] text-cream/70 truncate m-0 mt-0.5 font-medium">
                              {event.servico.nome}
                            </p>
                          )}

                          {event.profissional?.name && (
                            <p className="text-[10px] text-highlight/80 truncate m-0 mt-0.5 font-medium">
                              {event.profissional.name}
                            </p>
                          )}
                        </div>

                        <span className="text-[11px] font-bold text-highlight shrink-0">
                          {formatCurrency(event.valor_servico)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-cream/60 font-mono overflow-hidden mt-1">
                        <Clock size={10} className="text-highlight/80 shrink-0" />
                        <span className="truncate">
                          {event.startTimeFormatted} — {event.endTimeFormatted}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
