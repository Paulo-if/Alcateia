// ============================================================================
// Edge Function: criar-usuario
// ----------------------------------------------------------------------------
// Cria uma sub-conta no Supabase Auth (auth.users) e, na sequência, um perfil
// na tabela `usuarios` vinculado a ela.
//
// SEGURANÇA: utiliza a role `service_role` (chave service_role SOMENTE no
// servidor). Rodando como Edge Function, as policies RLS são BYPASSADAS —
// portanto esta função é a ÚNICA via para criar usuários do painel.
//
// AUTORIZAÇÃO: apenas um usuário `master` (com perfil ativo em `usuarios`)
// pode criar/gerenciar outros usuários. A função confere isso lendo a tabela
// `usuarios` diretamente (bypassando RLS) com base no auth.uid() do chamador.
//
// Endpoint:  POST /functions/v1/criar-usuario
// Body:      { nome, email, password, papel?: 'master'|'barbeiro' }
//
// OBSERVAÇÃO: quando papel == 'barbeiro', o profissional correspondente é
// criado AUTOMATICAMENTE (name derivado do nome, active=true, mesma barbearia)
// e vinculado ao usuário via `usuarios.profissional_id`. NÃO existe mais o
// campo manual "profissional vinculado".
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
    // Garante que o chamador é um usuário autenticado.
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

    // Confere que o chamador possui perfil MASTER ATIVO.
    const { data: caller, error: callerErr } = await service
      .from('usuarios')
      .select('id, papel, ativo')
      .eq('auth_user_id', callerId)
      .single();

    if (callerErr || !caller) {
      return json({ error: 'Perfil de usuário não encontrado. Vincule um admin primeiro.' }, 403);
    }
    if (caller.papel !== 'master' || caller.ativo !== true) {
      return json({ error: 'Apenas um administrador master pode criar usuários.' }, 403);
    }

    // ---------- Validação do payload ----------
    const { nome, email, password, papel = 'barbeiro' } = await req.json().catch(() => ({}));

    if (!nome || !String(nome).trim()) {
      return json({ error: 'Informe o nome.' }, 400);
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return json({ error: 'Informe um e-mail válido.' }, 400);
    }
    if (!password || String(password).length < 6) {
      return json({ error: 'A senha deve ter ao menos 6 caracteres.' }, 400);
    }
    if (papel !== 'master' && papel !== 'barbeiro') {
      return json({ error: 'Papel inválido (use master ou barbeiro).' }, 400);
    }

    const emailNorm = String(email).trim().toLowerCase();
    const nomeTrim = String(nome).trim();

    // ---------- Cria a sub-conta no Auth (service_role) ----------
    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email: emailNorm,
      password: String(password),
      email_confirm: true,
      user_metadata: { nome: nomeTrim, papel },
    });

    if (authError) {
      return json({ error: `Falha ao criar usuário: ${authError.message}` }, 400);
    }
    if (!authData.user) {
      return json({ error: 'Falha ao criar usuário.' }, 400);
    }

    // ---------- (Barbeiro) Cria o profissional AUTOMATICAMENTE ----------
    // O profissional nasce com o nome derivado do usuário, active=true e a
    // mesma barbearia (via DEFAULT do schema). Se a criação falhar, desfaz a
    // sub-conta do Auth para não deixar órfão.
    let profissionalUuid: string | null = null;
    if (papel === 'barbeiro') {
      const { data: prof, error: profInsertErr } = await service
        .from('profissionais')
        .insert({ name: nomeTrim, active: true })
        .select('id')
        .single();

      if (profInsertErr || !prof) {
        await service.auth.admin.deleteUser(authData.user.id);
        return json(
          { error: `Falha ao criar o profissional: ${profInsertErr?.message ?? 'erro'}` },
          400,
        );
      }
      profissionalUuid = prof.id;
    }

    // ---------- Cria o perfil em `usuarios` vinculado ao auth_user_id ----------
    const { data: perfil, error: perfilError } = await service
      .from('usuarios')
      .insert({
        auth_user_id: authData.user.id,
        nome: nomeTrim,
        email: emailNorm,
        papel,
        profissional_id: profissionalUuid,
      })
      .select('*')
      .single();

    if (perfilError) {
      // Rollback: remove a sub-conta do Auth e o profissional recém-criado.
      if (profissionalUuid) {
        await service.from('profissionais').delete().eq('id', profissionalUuid);
      }
      await service.auth.admin.deleteUser(authData.user.id);
      return json({ error: `Falha ao criar perfil: ${perfilError.message}` }, 400);
    }

    return json({ user: authData.user, usuario: perfil }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno.';
    return json({ error: msg }, 500);
  }
});
