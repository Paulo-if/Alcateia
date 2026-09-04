import { getSupabase, shouldUseFallback } from '../lib/supabase';
import type { Professional } from '../types';
import { DEV_PROFESSIONALS } from '../data/devFallback';
import { friendlyError } from './errors';

/**
 * Retorna os profissionais ativos da barbearia.
 * Em modo de demonstração (Sem Supabase), retorna dados locais sinalizados.
 *
 * TASK 13 — [INTEGRIDADE] Barbeiro sem agenda não pode receber agendamentos:
 * apenas profissionais com ao menos um expediente ATIVO em `professional_schedules`
 * são considerados "agendáveis" e aparecem no fluxo público de agendamento.
 */
export async function fetchProfessionals(): Promise<Professional[]> {
  if (shouldUseFallback()) {
    return DEV_PROFESSIONALS;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profissionais')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) throw new Error(friendlyError(error, 'Não foi possível carregar os profissionais.'));
  const all = (data ?? []) as Professional[];

  const { data: scheduleRows, error: schedError } = await supabase
    .from('professional_schedules')
    .select('professional_id')
    .eq('active', true);

  if (schedError) return all;

  const ids = new Set(
    (scheduleRows ?? []).map((r: { professional_id: string }) => r.professional_id),
  );
  return all.filter((p) => ids.has(p.id));
}
