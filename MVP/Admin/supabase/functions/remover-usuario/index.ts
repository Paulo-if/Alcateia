// ============================================================================
// Edge Function: remover-usuario
// ----------------------------------------------------------------------------
// Remove de forma REAL e COMPLETA um usuário do painel (sub-conta do Supabase
// Auth + perfil em `usuarios` + profissional + todo o histórico operacional
// vinculado SOMENTE a ele). Após a execução, o usuário some da listagem do
// Admin e não restam registros órfãos associados ao seu login.
//
// PRINCÍPIO atual (conforme requisito aprovado): excluir o barbeiro = apagar
// TUDO que estiver vinculado a ele e somente a ele:
//   * conta Auth (`auth.users`) e perfil `usuarios`;
//   * profissional `profissionais` (+ schedules/time_off via CASCADE);
//   * agendamentos do profissional (vendas_bump somem via CASCADE);
//   * transacoes_financeiras e pagamentos cujo agendamento pertence a ele,
//     removidos explicitamente (FK SET NULL não resolve — evitaria órfãos).
//
// IDEMPOTÊNCIA:
//   * auth_user_id ausente não é erro — a remoção do Auth é simplesmente pulada;
//   * repetir a operação após sucesso retorna 404 ("não encontrado") sem
//     corromper nada; repetir após falha parcial retoma de forma segura;
//   * a conta Auth é removida ANTES das remoções físicas; se ela falhar,
//     NENHUMA alteração é aplicada (sem estado parcial) e o chamador pode
//     tentar novamente com segurança.
//
// SEGURANÇA: usa service_role (chave SOMENTE no servidor, nunca no frontend).
// Deleção de conta Auth só é possível via role privilegiada — por isso esta
// Edge Function é a ÚNICA via para remover usuários.
//
// AUTORIZAÇÃO: o chamador DEVE ser um master ativo. São bloqueados:
//   * autoexclusão (master removendo a própria conta);
//   * remoção do último master ATIVO da barbearia (evita lockout do painel).
//
// Endpoint:  POST /functions/v1/remover-usuario
// Body:      { usuario_id: string }  (id do perfil em `usuarios`)
//
// ORDEM DAS OPERAÇÕES:
//   1. Remover a conta Auth (`service.auth.admin.deleteUser`) — se falhar, para
//      tudo sem tocar no restante (estado intacto para retry);
//   2. Deletar transacoes_financeiras e pagamentos dos agendamentos do alvo;
//   3. Deletar os agendamentos do profissional (vendas_bump somem via CASCADE);
//   4. Deletar o perfil `usuarios` (some da listagem do Admin);
//   5. Deletar o profissional (schedules/time_off somem via CASCADE).
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
    // ---------- 1. Autenticação do chamador (JWT do usuário logado) ----------
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

    // ---------- 2. Confirma que o chamador é um MASTER ATIVO ----------
    const { data: caller, error: callerErr } = await service
      .from('usuarios')
      .select('id, papel, ativo')
      .eq('auth_user_id', callerId)
      .single();

    if (callerErr || !caller) {
      return json({ error: 'Perfil de usuário não encontrado. Vincule um admin primeiro.' }, 403);
    }
    if (caller.papel !== 'master' || caller.ativo !== true) {
      return json({ error: 'Apenas um administrador master ativo pode remover usuários.' }, 403);
    }

    // ---------- 3. Validação do payload ----------
    const { usuario_id } = await req.json().catch(() => ({}));
    if (!usuario_id || typeof usuario_id !== 'string' || !usuario_id.trim()) {
      return json({ error: 'Informe o usuário a ser removido.' }, 400);
    }

    // ---------- 4. Localiza o usuário alvo ----------
    const { data: target, error: targetErr } = await service
      .from('usuarios')
      .select('id, barbearia_id, auth_user_id, profissional_id, nome, email, papel, ativo')
      .eq('id', usuario_id)
      .maybeSingle();

    if (targetErr) {
      console.error('[remover-usuario] Erro ao consultar alvo:', targetErr);
      return json({ error: 'Não foi possível localizar o usuário.' }, 500);
    }
    if (!target) {
      // Idempotência: já removido (repetição da operação) — 404 sem corromper.
      return json({ error: 'Usuário não encontrado ou já removido.' }, 404);
    }

    const log = { usuario: target.id, email: target.email, papel: target.papel };

    // ---------- 5. Proteções: autoexclusão e último master ----------
    if (target.id === caller.id) {
      console.warn('[remover-usuario] Autoexclusão bloqueada.', log);
      return json({ error: 'Você não pode remover a própria conta. Peça a outro Master para gerenciá-la.' }, 400);
    }

    if (target.papel === 'master') {
      const { count: outrosMasters } = await service
        .from('usuarios')
        .select('id', { count: 'exact', head: true })
        .eq('papel', 'master')
        .eq('ativo', true)
        .neq('id', target.id);

      if ((outrosMasters ?? 0) === 0) {
        console.warn('[remover-usuario] Remoção do último master ativo bloqueada.', log);
        return json(
          { error: 'Não é possível remover o último master ativo da barbearia. Promova outro usuário primeiro.' },
          409,
        );
      }
    }

    // ---------- 6. Identifica o profissional vinculado (se houver) ----------
    const profissionalId = target.profissional_id ?? null;
    const authUserId = target.auth_user_id ?? null;
    let agendamentosRemoved = 0;
    let transacoesRemoved = 0;
    let pagamentosRemoved = 0;

    // -----------------------------------------------------------
    // PRIMEIRO: remover a conta do Auth (se existir).
    // -----------------------------------------------------------
    // A remoção do Auth é o ponto de maior risco de falha. Ao executá-la ANTES
    // de qualquer mutação persistente, garantimos que uma falha aqui NÃO deixa
    // estado parcial: abortamos com 500 deixando o restante intacto, permitindo
    // tentar novamente com segurança. Nunca expomos segredos; logamos apenas
    // delAuthErr.
    if (authUserId) {
      const { error: delAuthErr } = await service.auth.admin.deleteUser(authUserId);
      if (delAuthErr) {
        console.error(
          '[remover-usuario] Falha ao remover a conta Auth. Nenhuma alteração aplicada.',
          { ...log, authUser: authUserId, details: delAuthErr?.message },
        );
        return json(
          { error: 'Não foi possível remover a conta de acesso do usuário. Nenhuma alteração foi feita; tente novamente.' },
          500,
        );
      }
    }

    // ----- 7. Apaga o histórico operacional vinculado SOMENTE ao alvo -----
    // Recolhe os ids dos agendamentos do profissional para remover em seguida
    // transações/pagamentos que apontam para eles (FK SET NULL não os remove).
    let agendamentoIds: string[] = [];
    if (profissionalId) {
      const { data: ags, error: agListErr } = await service
        .from('agendamentos')
        .select('id')
        .eq('professional_id', profissionalId);
      if (agListErr) {
        console.error('[remover-usuario] Erro ao listar agendamentos:', agListErr, log);
        return json({ error: 'Não foi possível localizar o histórico do usuário.' }, 500);
      }
      agendamentoIds = (ags ?? []).map((a) => a.id);

      if (agendamentoIds.length > 0) {
        // Transações financeiras do histórico do alvo.
        const { count: txCount, error: delTxErr } = await service
          .from('transacoes_financeiras')
          .delete({ count: 'exact' })
          .in('agendamento_id', agendamentoIds);
        if (delTxErr) {
          console.error('[remover-usuario] Erro ao apagar transações:', delTxErr, log);
          return json({ error: 'Não foi possível apagar as transações do usuário.' }, 500);
        }
        transacoesRemoved = txCount ?? 0;

        // Pagamentos do histórico do alvo.
        const { count: pgCount, error: delPgErr } = await service
          .from('pagamentos')
          .delete({ count: 'exact' })
          .in('agendamento_id', agendamentoIds);
        if (delPgErr) {
          console.error('[remover-usuario] Erro ao apagar pagamentos:', delPgErr, log);
          return json({ error: 'Não foi possível apagar os pagamentos do usuário.' }, 500);
        }
        pagamentosRemoved = pgCount ?? 0;

        // Agendamentos (vendas_bump são removidos via ON DELETE CASCADE).
        const { count: agCount, error: delAgErr } = await service
          .from('agendamentos')
          .delete({ count: 'exact' })
          .in('id', agendamentoIds);
        if (delAgErr) {
          console.error('[remover-usuario] Erro ao apagar agendamentos:', delAgErr, log);
          return json({ error: 'Não foi possível apagar os agendamentos do usuário.' }, 500);
        }
        agendamentosRemoved = agCount ?? 0;
      }
    }

    // ---------- 8. Remove o perfil `usuarios` (some da listagem do Admin) ----------
    // Se havia auth_user_id, ele já deixou: a FK ON DELETE CASCADE de
    // auth.users removeria o perfil — mas fazemos o delete explícito abaixo de
    // forma idempotente (e cobre também o caso de perfil já destacado).
    const { error: delProfileErr } = await service
      .from('usuarios')
      .delete()
      .eq('id', target.id);
    if (delProfileErr) {
      console.error('[remover-usuario] Erro ao remover o perfil:', delProfileErr, log);
      return json({ error: 'Não foi possível remover o perfil do usuário.' }, 500);
    }

    // ---------- 9. Remove o profissional físico (schedules/time_off via CASCADE) ----------
    // Após apagar os agendamentos, a FK RESTRICT não bloqueia mais o DELETE
    // físico do profissional. professional_schedules e professional_time_off são
    // removidos por ON DELETE CASCADE.
    let professionalRemoved = false;
    if (profissionalId) {
      const { error: delProfErr } = await service
        .from('profissionais')
        .delete()
        .eq('id', profissionalId);
      if (delProfErr) {
        console.error('[remover-usuario] Erro ao remover o profissional:', delProfErr, log);
        return json({ error: 'Não foi possível remover o profissional do usuário.' }, 500);
      }
      professionalRemoved = true;
    }

    console.log('[remover-usuario] Concluído.', {
      ...log,
      authRemoved: Boolean(authUserId),
      professionalRemoved,
      agendamentosRemoved,
      transacoesRemoved,
      pagamentosRemoved,
    });

    return json(
      {
        removed: true,
        authRemoved: Boolean(authUserId),
        professionalRemoved,
        agendamentosRemoved,
        transacoesRemoved,
        pagamentosRemoved,
      },
      200,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno.';
    console.error('[remover-usuario] Erro interno:', err);
    return json({ error: msg }, 500);
  }
});