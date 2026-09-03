import { getSupabase, shouldUseFallback } from '../lib/supabase';
import type { Professional } from '../types';
import { DEV_PROFESSIONALS } from '../data/devFallback';
import { friendlyError } from './errors';

/**
 * Retorna os profissionais ativos da barbearia.
 * Em modo de demonstração (Sem Supabase), retorna dados locais sinalizados.
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
  return (data ?? []) as Professional[];
}
