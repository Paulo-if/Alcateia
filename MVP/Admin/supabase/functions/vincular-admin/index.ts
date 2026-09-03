// ============================================================================
// Edge Function: vincular-admin
// ----------------------------------------------------------------------------
// Víncula o usuário autenticado como o primeiro MASTER de uma instância nova
// (bootstrap). Utilizado na tela "Vincular admin" exibida pelo ProtectedRoute
// quando existe uma sessão autenticada mas ainda NENHUM perfil em `usuarios`.
//
// SEGURANÇA: roda com service_role (bypassa RLS). Só permite o bootstrap se a
// tabela `usuarios` estiver VAZIA — impede que um segundo usuário roube o
// papel de master. Após a criação, a função cria (ou reutiliza) o perfil já
// existente em `usuarios` (caso um operador o tenha pré-criado no banco).
//
// Endpoint:  POST /functions/v1/vincular-admin
// Body:      { nome: string }
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido.' }, 405);
  }

  const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return json({ error: 'Não autorizado.' }, 401);
    }

    const { data: user, error: userError } = await service.auth.getUser(token);
    if (userError || !user.user) {
      return json({ error: 'Não autorizado.' }, 401);
    }
    const callerId = user.user.id;

    // ---------- Só permite bootstrap em instância SEM nenhum master ----------
    // Nota: o master inicial pode ainda não ter perfil (é exatamente o caso
    // de bootstrap). Verificamos se JÁ existe qualquer usuário com papel master.
    const { data: existingMaster } = await service
      .from('usuarios')
      .select('id')
      .eq('papel', 'master')
      .limit(1);

    if (existingMaster && existingMaster.length > 0) {
      return json({ error: 'Já existe um administrador vinculado a esta instância.' }, 409);
    }

    // ---------- Input ----------
    const { nome, password } = await req.json().catch(() => ({}));
    const nomeStr = nome ? String(nome).trim() : null;
    if (!nomeStr) {
      return json({ error: 'Informe o nome do administrador.' }, 400);
    }

    // Valida a senha contra o Supabase Auth para confirmar identidade
    if (!password || typeof password !== 'string' || password.length < 6) {
      return json({ error: 'Confirme sua senha para vincular.' }, 400);
    }

    const emailNorm = (user.user.email ?? '').toLowerCase().trim();
    const authClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await authClient.auth.signInWithPassword({
      email: emailNorm,
      password,
    });
    if (signInError) {
      return json({ error: 'Senha incorreta. Tente novamente.' }, 401);
    }

    // Usuário pode já ter um perfil em `usuarios` (ex.: pré-criado no banco).
    // Se a linha existe, apenas promove para master; senão, cria.
    const { data: existingProfile } = await service
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', callerId)
      .maybeSingle();

    let perfil;
    if (existingProfile) {
      const { data, error } = await service
        .from('usuarios')
        .update({ nome: nomeStr, papel: 'master', ativo: true })
        .eq('id', existingProfile.id)
        .select('*')
        .single();
      if (error) return json({ error: `Falha ao atualizar perfil: ${error.message}` }, 400);
      perfil = data;
    } else {
      const { data, error } = await service
        .from('usuarios')
        .insert({
          auth_user_id: callerId,
          nome: nomeStr,
          email: emailNorm,
          papel: 'master',
          ativo: true,
        })
        .select('*')
        .single();
      if (error) return json({ error: `Falha ao criar perfil: ${error.message}` }, 400);
      perfil = data;
    }

    return json({ usuario: perfil }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno.';
    return json({ error: msg }, 500);
  }
});
