import { useCallback, useEffect, useState } from 'react';
import { CalendarRange, Clock, Plus, Trash2, Save, CalendarX2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ProfessionalSchedule, ProfessionalTimeOff } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { cn, formatDateBR } from '@/lib/utils';

// day_of_week: 1 = Segunda ... 7 = Domingo (ISO 8601)
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

interface AdminAgendaProfissionalProps {
  open: boolean;
  onClose: () => void;
  profissional: { id: string; name: string } | null;
}

export function AdminAgendaProfissional({
  open,
  onClose,
  profissional,
}: AdminAgendaProfissionalProps) {
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
  const [newTimeOff, setNewTimeOff] = useState({ date: '', reason: '' });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!open || !profissional) return;
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
        .order('date'),
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
  }, [open, profissional]);

  useEffect(() => {
    if (open && profissional) load();
    if (!open) setError(null);
  }, [open, profissional, load]);

  const setDayField = (day: number, patch: Partial<DaySlot>) => {
    setDays((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  const saveSchedule = async () => {
    if (!profissional) return;
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

    // Reescreve a agenda semanal do profissional (poucas linhas, operação administrativa).
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
      return;
    }

    const { data, error: insError } = await supabase
      .from('professional_schedules')
      .insert(activeRows)
      .select();
    if (insError) {
      setSaving(false);
      setError(insError.message);
      return;
    }
    setSchedules((data ?? []) as ProfessionalSchedule[]);
    setSaving(false);
  };

  const addTimeOff = async () => {
    if (!profissional || !newTimeOff.date) return;
    setSaving(true);
    setError(null);

    const { data, error: insError } = await supabase
      .from('professional_time_off')
      .insert({
        professional_id: profissional.id,
        barbearia_id: '00000000-0000-0000-0000-000000000001',
        date: newTimeOff.date,
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
      setNewTimeOff({ date: '', reason: '' });
    }
    setSaving(false);
  };

  const removeTimeOff = async (id: string) => {
    if (!profissional) return;
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
    <Modal open={open} onClose={onClose} title="Agenda do Profissional" maxWidth="max-w-2xl">
      <p className="text-xs text-cream/50 mb-5 capitalize">
        {profissional?.name ?? 'Profissional'}
      </p>

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
        <div className="space-y-6">
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
                      'p-2.5 rounded-xl border flex items-center gap-3 transition-colors',
                      slot.active
                        ? 'bg-white/[0.04] border-white/10'
                        : 'bg-white/[0.01] border-white/5 opacity-60',
                    )}
                  >
                    <Switch
                      checked={slot.active}
                      onChange={(checked) => setDayField(day.value, { active: checked })}
                      size="sm"
                      label={`${day.label} ativo`}
                    />
                    <span className="text-sm text-cream w-20 shrink-0">{day.label}</span>
                    <div className="flex items-center gap-2 ml-auto">
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) => setDayField(day.value, { start: e.target.value })}
                        disabled={!slot.active}
                        className={cn(
                          'bg-[#121212] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-cream',
                          !slot.active && 'opacity-40 cursor-not-allowed',
                        )}
                      />
                      <span className="text-cream/40 text-xs">até</span>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => setDayField(day.value, { end: e.target.value })}
                        disabled={!slot.active}
                        className={cn(
                          'bg-[#121212] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-cream',
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
              <input
                type="date"
                value={newTimeOff.date}
                onChange={(e) => setNewTimeOff((prev) => ({ ...prev, date: e.target.value }))}
                className="bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-sm text-cream"
              />
              <input
                type="text"
                placeholder="Motivo (opcional)"
                value={newTimeOff.reason}
                onChange={(e) => setNewTimeOff((prev) => ({ ...prev, reason: e.target.value }))}
                className="flex-1 bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-sm text-cream placeholder:text-cream/30"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={addTimeOff}
                disabled={saving || !newTimeOff.date}
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
                    <span className="text-sm text-cream font-medium">
                      {formatDateBR(t.date)}
                    </span>
                    <span className="text-xs text-cream/50 truncate flex-1">
                      {t.reason || 'Bloqueio'}
                    </span>
                    <button
                      onClick={() => removeTimeOff(t.id)}
                      className="text-cream/40 hover:text-red-400 transition-colors p-1"
                      aria-label={`Remover folga de ${formatDateBR(t.date)}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}