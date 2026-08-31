import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { Product } from '../types';
import { DEV_BUMP_OFFERS } from '../data/devFallback';
import { friendlyError } from './errors';

/**
 * Retorna o produto da oferta de Order Bump (primeiro produto ativo marcado
 * como order bump). NÃO retorna produtos do catálogo normal.
 */
export async function fetchBumpProduct(): Promise<Product | null> {
  const products = await fetchBumpProducts();
  return products[0] ?? null;
}

/**
 * Retorna os produtos ativos marcou como Order Bump (até 3) para o carrossel.
 * Produtos do catálogo normal NÃO são retornados — só os com is_order_bump = true.
 * Em modo de demonstração local (sem Supabase), retorna dados mock de dev.
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
    .eq('is_order_bump', true)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) throw new Error(friendlyError(error, 'Não foi possível carregar as ofertas.'));
  return (data ?? []) as Product[];
}
