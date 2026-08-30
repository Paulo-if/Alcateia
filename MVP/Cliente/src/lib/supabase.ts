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
