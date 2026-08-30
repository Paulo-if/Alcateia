import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { Product } from '../types';
import { DEV_BUMP } from '../data/devFallback';
import { friendlyError } from './errors';

/**
 * Retorna o produto da oferta de Order Bump (primeiro produto ativo).
 * Ordena pelo mais recente para dar previsibilidade.
 */
export async function fetchBumpProduct(): Promise<Product | null> {
  if (!isSupabaseConfigured()) {
    return DEV_BUMP.product ?? null;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('ativo', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(friendlyError(error, 'Não foi possível carregar a oferta.'));
  return (data && data[0]) as Product | null;
}
