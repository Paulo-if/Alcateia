import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { Service } from '../types';
import { DEV_SERVICES } from '../data/devFallback';
import { friendlyError } from './errors';

/** Serviços ativos ordenados pela ordem definida no painel. */
export async function fetchServices(): Promise<Service[]> {
  if (!isSupabaseConfigured()) {
    return DEV_SERVICES;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('servicos')
    .select('*')
    .eq('ativo', true)
    .order('ordem', { ascending: true });

  if (error) throw new Error(friendlyError(error, 'Não foi possível carregar os serviços.'));
  return (data ?? []) as Service[];
}
