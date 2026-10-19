-- ============================================================================
-- BLOCO 2B — RLS mínima para as tabelas de agenda dos profissionais
-- ----------------------------------------------------------------------------
-- Sem RLS, tabelas novas em `public` ficam abertas a leitura/escrita anônima.
-- Este bloco NÃO implementa RLS completo (fica no bloco de segurança), mas
-- liga RLS com policies mínimas seguindo o padrão já existente de
-- `profissionais` (que o Cliente público lê via anon SELECT):
--
--   master  -> ALL          (painel Admin: configura agenda)
--   barbeiro-> SELECT       (própria agenda; escopo por usuário no bloco futuro)
--   anon    -> SELECT       (Cliente público: disponibilidade)
--
-- O RLS completo (escopo por barbearia/usuário, etc.) virá no bloco de
-- segurança, sem perda de histórico.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFESSIONAL_SCHEDULES
-- ----------------------------------------------------------------------------
ALTER TABLE professional_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_all_professional_schedules" ON professional_schedules
  FOR ALL TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

CREATE POLICY "barbeiro_select_professional_schedules" ON professional_schedules
  FOR SELECT TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'barbeiro');

CREATE POLICY "anon_select_professional_schedules" ON professional_schedules
  FOR SELECT TO anon USING (true);

-- ----------------------------------------------------------------------------
-- 2. PROFESSIONAL_TIME_OFF
-- ----------------------------------------------------------------------------
ALTER TABLE professional_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_all_professional_time_off" ON professional_time_off
  FOR ALL TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

CREATE POLICY "barbeiro_select_professional_time_off" ON professional_time_off
  FOR SELECT TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'barbeiro');

CREATE POLICY "anon_select_professional_time_off" ON professional_time_off
  FOR SELECT TO anon USING (true);