import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { Customer } from '../types';
import { friendlyError } from './errors';

export interface FindOrCreateCustomerInput {
  nome: string;
  telefone: string;
}

/**
 * Localiza um cliente existente pelo telefone; se não existir, cria.
 * Garante que o mesmo telefone nunca gere cliente duplicado.
 */
export async function findOrCreateCustomer({
  nome,
  telefone,
}: FindOrCreateCustomerInput): Promise<Customer> {
  const normalized = telefone.replace(/\D/g, '');

  if (!isSupabaseConfigured()) {
    return { id: 'dev-cliente', nome: nome.trim(), telefone: normalized, email: null };
  }

  const supabase = getSupabase();

  // 1) Busca por telefone
  const { data: existing, error: lookupError } = await supabase
    .from('clientes')
    .select('*')
    .eq('telefone', normalized)
    .maybeSingle();

  if (lookupError) throw new Error(friendlyError(lookupError, 'Não foi possível localizar o cliente.'));

  if (existing) return existing as Customer;

  // 2) Cria novo cliente
  const { data: created, error: insertError } = await supabase
    .from('clientes')
    .insert({ nome: nome.trim(), telefone: normalized, email: null })
    .select('*')
    .single();

  if (insertError) throw new Error(friendlyError(insertError, 'Não foi possível registrar o cliente.'));
  return created as Customer;
}
