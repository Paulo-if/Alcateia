-- ============================================================================
-- 20260905000000: Aviso de banco ficando cheio (estrutura)
-- ----------------------------------------------------------------------------
-- Script não aplicado ainda (depende do Supabase remoto). Fica pronto para
-- aplicação futura. Nesta mudança criamos apenas uma função RPC, sem inventar
-- métrica falsa no frontend e sem expor a service_role.
--
-- A função retorna o tamanho REAL do banco em bytes. O frontend (somente o
-- papel MASTER) exibe esse valor e sinaliza quando a ocupação ultrapassa um
-- limite configurável. Sem RPC (função ainda não criada no remoto) o aviso
-- simplesmente não aparece — sendo honesto sobre o que se conhece.
-- ============================================================================

-- Remove versões anteriores, se houver.
drop function if exists public.get_database_size();

-- Função segura (security definer, roda como superusuário) que devolve o
-- tamanho atual do banco em bytes. Não é preciso service_role no client.
create or replace function public.get_database_size()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select pg_catalog.pg_database_size(pg_catalog.current_database());
$$;

-- Não liberar para anônimos. Apenas usuários autenticados podem consultar;
-- a exibição no app é restrita ao papel MASTER.
revoke all on function public.get_database_size() from anon, public;
grant execute on function public.get_database_size() to authenticated;
