import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';

/**
 * Indica se o ambiente está devidamente configurado para operar com o Supabase.
 * Sem credenciais, o app entra em modo de demonstração local (fallback) e sinaliza
 * isso claramente na interface — nunca fingindo ser dados de produção.
 */
export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey);

const requireSupabase = (import.meta.env.VITE_REQUIRE_SUPABASE as string | undefined) === 'true';

export function requireSupabaseConfig(): void {
  if (requireSupabase && !isSupabaseConfigured()) {
    throw new Error(
      'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env (veja .env.example).',
    );
  }
}

/**
 * Indica se o app deve operar no modo de demonstração local (com dados fake).
 *
 * Para cumprir a regra "fallbacks de desenvolvimento nunca contaminam produção":
 * - Se `VITE_REQUIRE_SUPABASE=true` e o Supabase NÃO está configurado, lançamos erro
 *   (não permitimos dados fake) em vez de silenciosamente mostrar mocks.
 * - Caso contrário (modo demo explícito, sem Supabase), permitimos os fallbacks.
 *
 * Uso nos services: trocar `if (!isSupabaseConfigured())` por `if (shouldUseFallback())`
 * garante que produção NUNCA mostre dados fake, mesmo que as env vars faltem.
 */
export function shouldUseFallback(): boolean {
  if (isSupabaseConfigured()) return false;
  // Sem credenciais: só permitimos demo se NÃO for exigido Supabase.
  return !requireSupabase;
}

export const supabaseClient: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/** Cliente Supabase que já lança erro claro quando não configurado. */
export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    requireSupabaseConfig();
    throw new Error(
      'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.',
    );
  }
  return supabaseClient;
}
