-- ============================================================================
-- 20260905000001: Retenção de dados — limpeza de registros com mais de 2 anos
-- ----------------------------------------------------------------------------
-- Script NÃO aplicado ainda (depende do Supabase remoto). Fica pronto para
-- aplicação futura (via SQL console ou agendamento com pg_cron).
--
-- Objetivo: remover registros antigos conforme a política de retenção
-- (`created_at < now() - interval '2 years'`), respeitando as dependências de
-- FK e a ordem correta. Destrutivo: executar com critério.
--
-- Observação sobre o campo usado: o enunciado especifica `created_at` como base
-- da retenção. Para `agendamentos` existe também `data_inicio` (data do
-- atendimento), que pode ser uma alternativa mais semântica — deixamos ambas
-- documentadas e adotamos `created_at` conforme a instrução literal.
--
-- O RPC não é chamado pelo frontend (apenas service_role): não há risco de um
-- usuário da barbearia disparar a limpeza acidentalmente.
-- ============================================================================

drop function if exists public.purge_old_records(integer);

create or replace function public.purge_old_records(p_keep_days integer default 730)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - make_interval(days => greatest(p_keep_days, 1));
begin
  -- 1) Vendas bump vinculadas a agendamentos antigos (FK agendamento_id CASCADE,
  --    mas removemos explicitamente para clareza e independência de ordem).
  delete from public.vendas_bump v
  where v.agendamento_id in (
    select a.id from public.agendamentos a where a.created_at < v_cutoff
  );

  -- 2) Transações financeiras antigas (agendamento_id é SET NULL — sem pb).
  delete from public.transacoes_financeiras
  where created_at < v_cutoff;

  -- 3) Pagamentos antigos (agendamento_id é SET NULL — sem pb).
  delete from public.pagamentos
  where created_at < v_cutoff;

  -- 4) Agendamentos antigos por último (vendas_bump em cascata já tratadas;
  --    transações/pagamentos têm SET NULL e não bloqueiam).
  delete from public.agendamentos
  where created_at < v_cutoff;
end;
$$;

-- Execução restrita à service_role (não exposto ao app).
revoke all on function public.purge_old_records(integer) from anon, public, authenticated;
grant execute on function public.purge_old_records(integer) to service_role;

-- Exemplo de agendamento (executar manualmente ou via pg_cron):
--   select public.purge_old_records(730); -- remove registros com mais de 2 anos
