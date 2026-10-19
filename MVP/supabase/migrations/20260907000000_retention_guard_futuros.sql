-- ============================================================================
-- 20260907000000: Retenção — guarda de agendamentos futuros (corretiva)
-- ----------------------------------------------------------------------------
-- Complementa 20260905000001_retention_2years.sql (NÃO sobrescreve o original:
-- ele já foi aplicado no ambiente local). A rotina original apagava agendamentos
-- apenas por `created_at < cutoff`, o que eliminaria um agendamento FUTURO
-- (data_inicio no futuro) cujo created_at fosse antigo (> 2 anos) — contrariando
-- a política de não excluir dados operacionais/futuros.
--
-- Correção: mantém a elegibilidade por `created_at` (política literal) e adiciona
-- a guarda `data_inicio < now()` para agendamentos — nunca exclui um atendimento
-- futuro, independentemente do created_at. Para vendas_bump, a mesma guarda
-- protege bumps vinculados a agendamentos futuros.
--
-- As demais tabelas (transacoes_financeiras, pagamentos) não possuem conceito de
-- "agendamento futuro" — o critério continua sendo apenas `created_at`.
--
-- Script NÃO aplicado no remoto (igual ao original). Aplica-se em reset local ou
-- SQL console. Destrutivo: executar com critério.
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
  --    Guarda de futuro: só olha para agendamentos cujo atendimento já passou.
  delete from public.vendas_bump v
  where v.agendamento_id in (
    select a.id from public.agendamentos a
    where a.created_at < v_cutoff
      and a.data_inicio < now()
  );

  -- 2) Transações financeiras antigas (agendamento_id é SET NULL — sem pb).
  delete from public.transacoes_financeiras
  where created_at < v_cutoff;

  -- 3) Pagamentos antigos (agendamento_id é SET NULL — sem pb).
  delete from public.pagamentos
  where created_at < v_cutoff;

  -- 4) Agendamentos antigos por último. Criados há mais de 2 anos E com
  --    atendimento já realizado no passado. Futuros sempre preservados.
  delete from public.agendamentos
  where created_at < v_cutoff
    and data_inicio < now();
end;
$$;

-- Execução restrita à service_role (não exposto ao app).
revoke all on function public.purge_old_records(integer) from anon, public, authenticated;
grant execute on function public.purge_old_records(integer) to service_role;

-- Exemplo de agendamento (executar manualmente ou via pg_cron):
--   select public.purge_old_records(730); -- remove registros com mais de 2 anos