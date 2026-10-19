import { useState, useCallback, useEffect } from 'react';
import { CalendarRange, Clock, Plus, Trash2, Save, CalendarX2, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ProfessionalSchedule, ProfessionalTimeOff } from '@/types';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { CalendarModal } from '@/components/ui/CalendarModal';
import { cn, formatDateBR } from '@/lib/utils';

const DAYS = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
];

const DEFAULT_START = '09:00';
const DEFAULT_END = '17:00';

interface DaySlot {
  active: boolean;
  start: string;
  end: string;
}

interface AdminAgendaContentProps {
  profissional: { id: string; name: string };
  onSaveSuccess?: () => void;
}

export function AdminAgendaContent({
  profissional,
  onSaveSuccess,
}: AdminAgendaContentProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<ProfessionalSchedule[]>([]);
  const [timeOff, setTimeOff] = useState<ProfessionalTimeOff[]>([]);
  const [days, setDays] = useState<Record<number, DaySlot>>(() => {
    const initial: Record<number, DaySlot> = {};
    for (const day of DAYS) {
      initial[day.value] = { active: false, start: DEFAULT_START, end: DEFAULT_END };
    }
    return initial;
  });
  const [newTimeOff, setNewTimeOff] = useState({ start_date: '', end_date: '', reason: '' });
  const [calFocus, setCalFocus] = useState<'start' | 'end' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [scheduleRes, timeOffRes] = await Promise.all([
      supabase
        .from('professional_schedules')
        .select('*')
        .eq('professional_id', profissional.id)
        .order('day_of_week'),
      supabase
        .from('professional_time_off')
        .select('*')
        .eq('professional_id', profissional.id)
        .order('start_date'),
    ]);

    if (scheduleRes.error || timeOffRes.error) {
      setError(scheduleRes.error?.message ?? timeOffRes.error?.message ?? 'Erro ao carregar agenda.');
      setLoading(false);
      return;
    }

    const scheds = (scheduleRes.data ?? []) as ProfessionalSchedule[];
    setSchedules(scheds);

    const next: Record<number, DaySlot> = {};
    for (const day of DAYS) {
      const found = scheds.find((s) => s.day_of_week === day.value);
      next[day.value] = {
        active: found?.active ?? false,
        start: found?.start_time ? found.start_time.slice(0, 5) : DEFAULT_START,
        end: found?.end_time ? found.end_time.slice(0, 5) : DEFAULT_END,
      };
    }
    setDays(next);

    setTimeOff((timeOffRes.data ?? []) as ProfessionalTimeOff[]);
    setLoading(false);
  }, [profissional.id]);

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  const setDayField = (day: number, patch: Partial<DaySlot>) => {
    setDays((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  const saveSchedule = async () => {
    setSaving(true);
    setError(null);

    const activeRows = DAYS.filter((d) => days[d.value].active)
      .map((d) => ({
        professional_id: profissional.id,
        barbearia_id: schedules[0]?.barbearia_id ?? '00000000-0000-0000-0000-000000000001',
        day_of_week: d.value,
        start_time: days[d.value].start,
        end_time: days[d.value].end,
        active: true,
      }))
      .filter((r) => r.start_time < r.end_time);

    // Guarda o estado anterior para reverter em caso de falha no insert.
    const prevSchedules = schedules;

    const { error: delError } = await supabase
      .from('professional_schedules')
      .delete()
      .eq('professional_id', profissional.id);
    if (delError) {
      setSaving(false);
      setError(delError.message);
      return;
    }

    if (activeRows.length === 0) {
      setSchedules([]);
      setSaving(false);
      onSaveSuccess?.();
      return;
    }

    const { data, error: insError } = await supabase
      .from('professional_schedules')
      .insert(activeRows)
      .select();
    if (insError) {
      // Reverte a lista em memória para o estado anterior (o delete já ocorreu).
      setSchedules(prevSchedules);
      setSaving(false);
      setError(insError.message);
      return;
    }
    setSchedules((data ?? []) as ProfessionalSchedule[]);
    setSaving(false);
    onSaveSuccess?.();
  };

  const addTimeOff = async () => {
    if (!newTimeOff.start_date || !newTimeOff.end_date) return;

    // Valida ordem: início não pode vir depois do fim.
    if (newTimeOff.start_date > newTimeOff.end_date) {
      setError('A data de início não pode ser posterior à data de fim.');
      return;
    }

    // Valida overlap com folgas/bloqueios existentes do profissional.
    const overlap = timeOff.find((t) => {
      const noOverlap =
        newTimeOff.end_date < t.start_date || newTimeOff.start_date > t.end_date;
      return !noOverlap;
    });
    if (overlap) {
      setError(
        `Este período se sobrepõe a um bloqueio existente (${formatDateBR(overlap.start_date)}${
          overlap.start_date !== overlap.end_date
            ? ` até ${formatDateBR(overlap.end_date)}`
            : ''
        }). Remova ou ajuste antes de adicionar.`,
      );
      return;
    }

    setSaving(true);
    setError(null);

    const { data, error: insError } = await supabase
      .from('professional_time_off')
      .insert({
        professional_id: profissional.id,
        barbearia_id: '00000000-0000-0000-0000-000000000001',
        start_date: newTimeOff.start_date,
        end_date: newTimeOff.end_date,
        reason: newTimeOff.reason.trim() || null,
      })
      .select();
    if (insError) {
      setSaving(false);
      setError(insError.message);
      return;
    }
    if (data?.length) {
      setTimeOff((prev) => [...prev, data[0] as ProfessionalTimeOff]);
      setNewTimeOff({ start_date: '', end_date: '', reason: '' });
    }
    setSaving(false);
  };

  const removeTimeOff = async (id: string) => {
    setError(null);
    const { error: delError } = await supabase
      .from('professional_time_off')
      .delete()
      .eq('id', id);
    if (delError) {
      setError(delError.message);
      return;
    }
    setTimeOff((prev) => prev.filter((t) => t.id !== id));
  };

  const activeDayCount = DAYS.filter((d) => days[d.value].active).length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-800/50 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-cream/40 text-sm animate-pulse">
          Carregando agenda...
        </div>
      ) : (
        <>
          {/* Horários da semana */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CalendarRange size={16} className="text-highlight" />
              <h4 className="font-display text-lg text-cream tracking-wide">
                Horários da Semana
              </h4>
              <span className="text-[11px] text-cream/40 ml-auto">
                {activeDayCount} {activeDayCount === 1 ? 'dia ativo' : 'dias ativos'}
              </span>
            </div>

            <div className="space-y-1.5">
              {DAYS.map((day) => {
                const slot = days[day.value];
                return (
                  <div
                    key={day.value}
                    className={cn(
                      'p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 transition-colors',
                      slot.active
                        ? 'bg-white/[0.04] border-white/10'
                        : 'bg-white/[0.01] border-white/5 opacity-60',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Switch
                        checked={slot.active}
                        onChange={(checked) => setDayField(day.value, { active: checked })}
                        size="sm"
                        label={`${day.label} ativo`}
                      />
                      <span className="text-sm text-cream font-medium">{day.label}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) => setDayField(day.value, { start: e.target.value })}
                        disabled={!slot.active}
                        className={cn(
                          'min-w-0 flex-1 sm:flex-none bg-[#121212] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-cream sm:w-auto',
                          !slot.active && 'opacity-40 cursor-not-allowed',
                        )}
                      />
                      <span className="text-cream/40 text-xs shrink-0">até</span>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => setDayField(day.value, { end: e.target.value })}
                        disabled={!slot.active}
                        className={cn(
                          'min-w-0 flex-1 sm:flex-none bg-[#121212] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-cream sm:w-auto',
                          !slot.active && 'opacity-40 cursor-not-allowed',
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[11px] text-cream/40 flex items-center gap-1.5">
                <Clock size={12} /> O dia sem ativação não terá expediente.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={saveSchedule}
                disabled={saving}
              >
                <Save size={14} /> {saving ? 'Salvando...' : 'Salvar Agenda'}
              </Button>
            </div>
          </div>

          {/* Folgas e bloqueios */}
          <div className="border-t border-white/10 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <CalendarX2 size={16} className="text-[#4FE7FF]" />
              <h4 className="font-display text-lg text-cream tracking-wide">
                Folgas e Bloqueios
              </h4>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-cream/40 uppercase pl-1">Início</span>
                <button
                  type="button"
                  onClick={() => setCalFocus('start')}
                  className="inline-flex items-center gap-2 bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-sm text-cream hover:border-highlight/50 transition-colors whitespace-nowrap"
                >
                  <Calendar size={14} className="text-highlight shrink-0" />
                  {newTimeOff.start_date ? formatDateBR(newTimeOff.start_date) : 'Início'}
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-cream/40 uppercase pl-1">Fim</span>
                <button
                  type="button"
                  onClick={() => setCalFocus('end')}
                  className="inline-flex items-center gap-2 bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-sm text-cream hover:border-highlight/50 transition-colors whitespace-nowrap"
                >
                  <Calendar size={14} className="text-highlight shrink-0" />
                  {newTimeOff.end_date ? formatDateBR(newTimeOff.end_date) : 'Fim'}
                </button>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-[10px] text-cream/40 uppercase pl-1">Motivo (opcional)</span>
                <input
                  type="text"
                  placeholder="Férias, curso, etc."
                  value={newTimeOff.reason}
                  onChange={(e) => setNewTimeOff((prev) => ({ ...prev, reason: e.target.value }))}
                  className="bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-sm text-cream placeholder:text-cream/30"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addTimeOff}
                disabled={saving || !newTimeOff.start_date || !newTimeOff.end_date}
                className="mt-5"
              >
                <Plus size={14} /> Adicionar
              </Button>
            </div>

            {timeOff.length === 0 ? (
              <p className="text-xs text-cream/30 py-3">
                Nenhuma folga cadastrada.
              </p>
            ) : (
              <div className="space-y-1.5">
                {timeOff.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm text-cream font-medium">
                        {formatDateBR(t.start_date)} {t.start_date !== t.end_date && `até ${formatDateBR(t.end_date)}`}
                      </span>
                    </div>
                    <span className="text-xs text-cream/50 truncate flex-1">
                      {t.reason || 'Bloqueio'}
                    </span>
                    <button
                      onClick={() => removeTimeOff(t.id)}
                      className="text-cream/40 hover:text-red-400 transition-colors p-1"
                      aria-label={`Remover folga de ${formatDateBR(t.start_date)}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Calendário customizado (padrão "Mais datas") - folgas */}
      <CalendarModal
        open={calFocus !== null}
        mode="single"
        title={calFocus === 'start' ? 'Data de início' : 'Data de fim'}
        value={calFocus === 'start' ? (newTimeOff.start_date || null) : (newTimeOff.end_date || null)}
        onSelect={(date) => {
          setNewTimeOff((prev) =>
            calFocus === 'start'
              ? { ...prev, start_date: date }
              : { ...prev, end_date: date }
          );
        }}
        onClose={() => setCalFocus(null)}
      />
    </div>
  );
}
