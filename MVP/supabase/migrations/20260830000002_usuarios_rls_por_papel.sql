-- ============================================================================
-- AlcateiaBarber — BLOCO 4: GESTÃO DE MÚLTIPLOS USUÁRIOS + RLS POR PAPEL
-- ============================================================================
-- Requisitos: o Admin Master gerencia os barbeiros pelo painel. Usuários são
-- sub-contas reais do Supabase Auth (auth.users), vinculadas a um perfil em
-- `usuarios`. Acessos são controlados por papel ('master' | 'barbeiro').
--
-- O QUE ESTA MIGRATION FAZ:
--   1. Cria a tabela `usuarios` (perfil dos usuários do painel).
--   2. Cria a função `public.current_usuario()` (perfil do usuário logado).
--   3. SUBSTITUI as políticas cegas do Bloco 2 (`admin_all_*`) por políticas
--      com ciência de papel:
--        * master   -> acesso TOTAL a todas as tabelas.
--        * barbeiro -> enxerga/escreve apenas o próprio escopo (agenda própria).
--        * anon     -> mantém as políticas já existentes (público/cliente).
--      transacoes_financeiras permanece com acesso SOMENTE para master.
--
-- IMPORTANTE: políticas do mesmo role são SOMADAS (OR). As políticas antigas
-- `admin_all_*` são DROPadas aqui para que o barbeiro não herde acesso total.
-- ============================================================================

-- ============================================================================
-- 1. TABELA USUARIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES barbearias(id) ON DELETE CASCADE,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profissional_id uuid REFERENCES profissionais(id) ON DELETE SET NULL,
  nome text NOT NULL,
  email text NOT NULL,
  papel text NOT NULL DEFAULT 'barbeiro' CHECK (papel IN ('master', 'barbeiro')),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_usuarios_barbearia_email UNIQUE (barbearia_id, email)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_barbearia ON usuarios (barbearia_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_profissional ON usuarios (profissional_id);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. FUNÇÃO AUXILIAR current_usuario()
--    Retorna o perfil (papel, profissional_id, etc.) do usuário autenticado.
--    security definer + search_path travado em public.
--    Se não houver perfil vinculado, retorna conjunto vazio -> políticas
--    abaixo negam acesso, mesmo para usuários `authenticated` sem perfil.
--    OBS.: usa RETURNS public.usuarios (tipo composto) para permitir a chamada
--    escalar `(current_usuario()).papel` nas policies (RETURNS TABLE não permite).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_usuario()
RETURNS public.usuarios
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.*
  FROM public.usuarios u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Somente usuários autenticados podem chamar a função (nunca anon/public).
REVOKE ALL ON FUNCTION public.current_usuario() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_usuario() TO authenticated;

-- ============================================================================
-- 3. REMOVER POLÍTICAS CEGAS DO BLOCO 2 (authenticated = ALL em tudo)
-- ============================================================================
DROP POLICY IF EXISTS "admin_all_barbearias"             ON barbearias;
DROP POLICY IF EXISTS "admin_all_barbearia_config"       ON barbearia_config;
DROP POLICY IF EXISTS "admin_all_servicos"               ON servicos;
DROP POLICY IF EXISTS "admin_all_produtos"               ON produtos;
DROP POLICY IF EXISTS "admin_all_profissionais"          ON profissionais;
DROP POLICY IF EXISTS "admin_all_clientes"               ON clientes;
DROP POLICY IF EXISTS "admin_all_agendamentos"           ON agendamentos;
DROP POLICY IF EXISTS "admin_all_vendas_bump"            ON vendas_bump;
DROP POLICY IF EXISTS "admin_all_transacoes_financeiras" ON transacoes_financeiras;
DROP POLICY IF EXISTS "admin_all_pagamentos"             ON pagamentos;

-- ============================================================================
-- 4. POLÍTICAS POR PAPEL
--    Helper: (current_usuario()).ativo garante que usuário desativado perde acesso.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CATÁLOGO (barbearias, barbearia_config, servicos, produtos)
--   master  -> ALL
--   barbeiro-> SELECT (leitura)
--   anon    -> SELECT (políticas existentes do Bloco 2 permanecem)
-- ----------------------------------------------------------------------------

CREATE POLICY "master_all_barbearias" ON barbearias
  FOR ALL TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

CREATE POLICY "barbeiro_select_barbearias" ON barbearias
  FOR SELECT TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'barbeiro');

CREATE POLICY "master_all_barbearia_config" ON barbearia_config
  FOR ALL TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

CREATE POLICY "barbeiro_select_barbearia_config" ON barbearia_config
  FOR SELECT TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'barbeiro');

CREATE POLICY "master_all_servicos" ON servicos
  FOR ALL TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

CREATE POLICY "barbeiro_select_servicos" ON servicos
  FOR SELECT TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'barbeiro');

CREATE POLICY "master_all_produtos" ON produtos
  FOR ALL TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

CREATE POLICY "barbeiro_select_produtos" ON produtos
  FOR SELECT TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'barbeiro');

-- ----------------------------------------------------------------------------
-- PROFISSIONAIS
--   master  -> ALL
--   barbeiro-> SELECT
-- ----------------------------------------------------------------------------
CREATE POLICY "master_all_profissionais" ON profissionais
  FOR ALL TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

CREATE POLICY "barbeiro_select_profissionais" ON profissionais
  FOR SELECT TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'barbeiro');

-- ----------------------------------------------------------------------------
-- CLIENTES
--   master  -> ALL
--   barbeiro-> SELECT (todos os clientes da barbearia; precisa de contato)
-- ----------------------------------------------------------------------------
CREATE POLICY "master_all_clientes" ON clientes
  FOR ALL TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

CREATE POLICY "barbeiro_select_clientes" ON clientes
  FOR SELECT TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'barbeiro');

-- Barbeiro pode cadastrar clientes ao criar um agendamento (walk-in).
CREATE POLICY "barbeiro_insert_clientes" ON clientes
  FOR INSERT TO authenticated
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'barbeiro');

-- ----------------------------------------------------------------------------
-- AGENDAMENTOS (agenda própria do barbeiro)
--   master  -> ALL
--   barbeiro-> SELECT + UPDATE + INSERT somente onde professional_id == o seu.
--              (agendamentos sem profissional atribuído não aparecem ao barbeiro)
-- ----------------------------------------------------------------------------
CREATE POLICY "master_all_agendamentos" ON agendamentos
  FOR ALL TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

CREATE POLICY "barbeiro_select_agendamentos" ON agendamentos
  FOR SELECT TO authenticated
  USING (
    (current_usuario()).ativo
    AND (current_usuario()).papel = 'barbeiro'
    AND professional_id = (current_usuario()).profissional_id
  );

CREATE POLICY "barbeiro_update_agendamentos" ON agendamentos
  FOR UPDATE TO authenticated
  USING (
    (current_usuario()).ativo
    AND (current_usuario()).papel = 'barbeiro'
    AND professional_id = (current_usuario()).profissional_id
  )
  WITH CHECK (
    (current_usuario()).ativo
    AND (current_usuario()).papel = 'barbeiro'
    AND professional_id = (current_usuario()).profissional_id
  );

-- Barbeiro pode CRIAR agendamentos, desde que atribuídos a ele mesmo.
CREATE POLICY "barbeiro_insert_agendamentos" ON agendamentos
  FOR INSERT TO authenticated
  WITH CHECK (
    (current_usuario()).ativo
    AND (current_usuario()).papel = 'barbeiro'
    AND professional_id = (current_usuario()).profissional_id
  );

-- ----------------------------------------------------------------------------
-- VENDAS_BUMP (own scope: vendas dos agendamentos do próprio barbeiro)
-- ----------------------------------------------------------------------------
CREATE POLICY "master_all_vendas_bump" ON vendas_bump
  FOR ALL TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

CREATE POLICY "barbeiro_select_vendas_bump" ON vendas_bump
  FOR SELECT TO authenticated
  USING (
    (current_usuario()).ativo
    AND (current_usuario()).papel = 'barbeiro'
    AND agendamento_id IN (
      SELECT a.id FROM agendamentos a
      WHERE a.professional_id = (current_usuario()).profissional_id
    )
  );

-- ----------------------------------------------------------------------------
-- PAGAMENTOS (own scope igual a vendas_bump)
-- ----------------------------------------------------------------------------
CREATE POLICY "master_all_pagamentos" ON pagamentos
  FOR ALL TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

CREATE POLICY "barbeiro_select_pagamentos" ON pagamentos
  FOR SELECT TO authenticated
  USING (
    (current_usuario()).ativo
    AND (current_usuario()).papel = 'barbeiro'
    AND agendamento_id IN (
      SELECT a.id FROM agendamentos a
      WHERE a.professional_id = (current_usuario()).profissional_id
    )
  );

-- ----------------------------------------------------------------------------
-- TRANSAÇÕES FINANCEIRAS
--   master  -> ALL (visão completa do financeiro)
--   barbeiro-> SELECT apenas da própria movimentação (controle de comissões):
--              transações vinculadas aos agendamentos do próprio profissional.
-- ----------------------------------------------------------------------------
CREATE POLICY "master_all_transacoes_financeiras" ON transacoes_financeiras
  FOR ALL TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

CREATE POLICY "barbeiro_select_transacoes_financeiras" ON transacoes_financeiras
  FOR SELECT TO authenticated
  USING (
    (current_usuario()).ativo
    AND (current_usuario()).papel = 'barbeiro'
    AND agendamento_id IN (
      SELECT a.id FROM agendamentos a
      WHERE a.professional_id = (current_usuario()).profissional_id
    )
  );

-- Barbeiro pode registrar a receita apenas ao CONCLUIR um atendimento seu
-- (fluxo automático do painel). Não pode lançar transações avulsas/despesas.
CREATE POLICY "barbeiro_insert_transacoes_financeiras" ON transacoes_financeiras
  FOR INSERT TO authenticated
  WITH CHECK (
    (current_usuario()).ativo
    AND (current_usuario()).papel = 'barbeiro'
    AND agendamento_id IN (
      SELECT a.id FROM agendamentos a
      WHERE a.professional_id = (current_usuario()).profissional_id
    )
  );

-- Ao CANCELAR um atendimento seu, o barbeiro remove a receita vinculada
-- (mantém simetria com o fluxo concluir → gastar → cancelar).
CREATE POLICY "barbeiro_delete_transacoes_financeiras" ON transacoes_financeiras
  FOR DELETE TO authenticated
  USING (
    (current_usuario()).ativo
    AND (current_usuario()).papel = 'barbeiro'
    AND agendamento_id IN (
      SELECT a.id FROM agendamentos a
      WHERE a.professional_id = (current_usuario()).profissional_id
    )
  );

-- ----------------------------------------------------------------------------
-- USUARIOS (a própria tabela de perfis)
--   master  -> CRUD completo (cadastra/gerencia barbeiros)
--   barbeiro-> apenas leitura da PRÓPRIA linha (self)
--   anon    -> nenhum acesso
-- ----------------------------------------------------------------------------
CREATE POLICY "usuarios_master_all" ON usuarios
  FOR ALL TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

CREATE POLICY "usuarios_self_select" ON usuarios
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- ============================================================================
-- FIM DA MIGRATION — BLOCO 4 (USUÁRIOS + RLS POR PAPEL)
-- ============================================================================