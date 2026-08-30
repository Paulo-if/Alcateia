-- ============================================================================
-- AlcateiaBarber — BLOCO 2: RLS (ROW LEVEL SECURITY) E POLÍTICAS DE ACESSO
-- ============================================================================
-- Segurança do banco após o esquema unificado (Bloco 1).
--
-- RESUMO DAS POLÍTICAS:
--   * Role `authenticated` (Admin autenticado no painel):
--       Acesso TOTAL (ALL: select/insert/update/delete) a todas as 10 tabelas.
--       Neste MVP assume-se que o Supabase Auth garante que APENAS usuários
--       do painel (administradores) recebem a role `authenticated`.
--
--   * Role `anon` (Público / Cliente):
--       - CATÁLOGO (somente leitura): barbearias, barbearia_config,
--         servicos, produtos, profissionais  -> SELECT apenas.
--       - OPERACIONAL (leitura e escrita limitadas): clientes, agendamentos,
--         vendas_bump, pagamentos             -> SELECT, INSERT e UPDATE.
--       - FINANCEIRO (BLOQUEADO): transacoes_financeiras NÃO possui nenhuma
--         política para a role `anon`. Apenas o Admin acessa.
--
-- Este arquivo é uma migration que pode ser executada diretamente no
-- SQL Editor do Supabase (schema público).
-- ============================================================================

-- ============================================================================
-- 1. ATIVAÇÃO DO RLS EM TODAS AS TABELAS
-- ============================================================================

ALTER TABLE barbearias             ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbearia_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas_bump            ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos             ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. POLÍTICAS PARA ADMINISTRADORES (role `authenticated`)
--    Acesso TOTAL a todas as tabelas.
--    Observação: o Auth do Supabase já garante que apenas usuários logados
--    no painel Admin recebem a role `authenticated`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- barbearias
-- ----------------------------------------------------------------------------
CREATE POLICY "admin_all_barbearias" ON barbearias
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- barbearia_config
-- ----------------------------------------------------------------------------
CREATE POLICY "admin_all_barbearia_config" ON barbearia_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- servicos
-- ----------------------------------------------------------------------------
CREATE POLICY "admin_all_servicos" ON servicos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- produtos
-- ----------------------------------------------------------------------------
CREATE POLICY "admin_all_produtos" ON produtos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- profissionais
-- ----------------------------------------------------------------------------
CREATE POLICY "admin_all_profissionais" ON profissionais
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- clientes
-- ----------------------------------------------------------------------------
CREATE POLICY "admin_all_clientes" ON clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- agendamentos
-- ----------------------------------------------------------------------------
CREATE POLICY "admin_all_agendamentos" ON agendamentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- vendas_bump
-- ----------------------------------------------------------------------------
CREATE POLICY "admin_all_vendas_bump" ON vendas_bump
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- transacoes_financeiras (FINANCEIRO — exclusivo do Admin)
-- ----------------------------------------------------------------------------
CREATE POLICY "admin_all_transacoes_financeiras" ON transacoes_financeiras
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- pagamentos
-- ----------------------------------------------------------------------------
CREATE POLICY "admin_all_pagamentos" ON pagamentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 3. POLÍTICAS PARA O PÚBLICO / CLIENTE (role `anon`)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CATÁLOGO (somente leitura)
-- ----------------------------------------------------------------------------

-- barbearias
CREATE POLICY "anon_select_barbearias" ON barbearias
  FOR SELECT TO anon USING (true);

-- barbearia_config
CREATE POLICY "anon_select_barbearia_config" ON barbearia_config
  FOR SELECT TO anon USING (true);

-- servicos
CREATE POLICY "anon_select_servicos" ON servicos
  FOR SELECT TO anon USING (true);

-- produtos
CREATE POLICY "anon_select_produtos" ON produtos
  FOR SELECT TO anon USING (true);

-- profissionais
CREATE POLICY "anon_select_profissionais" ON profissionais
  FOR SELECT TO anon USING (true);

-- ----------------------------------------------------------------------------
-- OPERACIONAL (leitura e escrita limitadas: SELECT, INSERT e UPDATE)
-- ----------------------------------------------------------------------------

-- clientes (o cliente cria/atualiza seu próprio cadastro para agendar)
CREATE POLICY "anon_select_clientes" ON clientes
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_clientes" ON clientes
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_clientes" ON clientes
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- agendamentos (o cliente cria e gerencia suas reservas)
CREATE POLICY "anon_select_agendamentos" ON agendamentos
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_agendamentos" ON agendamentos
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_agendamentos" ON agendamentos
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- vendas_bump (order bump / upsell no checkout)
CREATE POLICY "anon_select_vendas_bump" ON vendas_bump
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_vendas_bump" ON vendas_bump
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_vendas_bump" ON vendas_bump
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- pagamentos (checkout / confirmação de pagamento)
CREATE POLICY "anon_select_pagamentos" ON pagamentos
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_pagamentos" ON pagamentos
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_pagamentos" ON pagamentos
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- FINANCEIRO (BLOQUEADO)
-- A tabela transacoes_financeiras NÃO recebe nenhuma política para `anon`.
-- Apenas os administradores (authenticated) podem interagir com ela.
-- ----------------------------------------------------------------------------

-- ============================================================================
-- FIM DA MIGRATION — BLOCO 2 (RLS)
-- ============================================================================
