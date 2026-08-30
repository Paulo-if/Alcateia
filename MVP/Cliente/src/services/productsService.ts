import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { Product } from '../types';
import { DEV_BUMP_OFFERS } from '../data/devFallback';
import { friendlyError } from './errors';

/**
 * Retorna o produto da oferta de Order Bump (primeiro produto ativo).
 * Ordena pelo mais recente para dar previsibilidade.
 */
export async function fetchBumpProduct(): Promise<Product | null> {
  const products = await fetchBumpProducts();
  return products[0] ?? null;
}

/**
 * Retorna os produtos ativos para o carrossel de Order Bump (até 3).
 * Em modo de demonstração local, retorna ofertas mockadas (estrutura pronta
 * para receber a lista real do Supabase).
 */
export async function fetchBumpProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    return DEV_BUMP_OFFERS.map((o) => o.product!).filter(Boolean);
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('ativo', true)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) throw new Error(friendlyError(error, 'Não foi possível carregar as ofertas.'));
  return (data ?? []) as Product[];
}
