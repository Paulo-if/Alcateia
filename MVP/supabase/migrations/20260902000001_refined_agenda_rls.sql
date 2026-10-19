-- ============================================================================
-- BLOCO 2B EXTENSÃO — RLS Refinada para Agenda Individual
-- ----------------------------------------------------------------------------
-- Garante que barbeiros possam gerir apenas a própria agenda, enquanto o
-- Master mantém controle total.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFESSIONAL_SCHEDULES
-- ----------------------------------------------------------------------------

-- Remove policies antigas para evitar conflitos
DROP POLICY IF EXISTS "master_all_professional_schedules" ON professional_schedules;
DROP POLICY IF EXISTS "barbeiro_select_professional_schedules" ON professional_schedules;
DROP POLICY IF EXISTS "anon_select_professional_schedules" ON professional_schedules;

-- Master: ALL
CREATE POLICY "master_all_professional_schedules" ON professional_schedules
  FOR ALL TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

-- Barbeiro: ALL somente na própria agenda
CREATE POLICY "barbeiro_own_professional_schedules" ON professional_schedules
  FOR ALL TO authenticated
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

-- Anon: SELECT apenas (para fluxo de agendamento público)
CREATE POLICY "anon_select_professional_schedules" ON professional_schedules
  FOR SELECT TO anon USING (true);

-- ----------------------------------------------------------------------------
-- 2. PROFESSIONAL_TIME_OFF
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "master_all_professional_time_off" ON professional_time_off;
DROP POLICY IF EXISTS "barbeiro_select_professional_time_off" ON professional_time_off;
DROP POLICY IF EXISTS "anon_select_professional_time_off" ON professional_time_off;

-- Master: ALL
CREATE POLICY "master_all_professional_time_off" ON professional_time_off
  FOR ALL TO authenticated
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

-- Barbeiro: ALL somente na própria agenda
CREATE POLICY "barbeiro_own_professional_time_off" ON professional_time_off
  FOR ALL TO authenticated
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

-- Anon: SELECT apenas
CREATE POLICY "anon_select_professional_time_off" ON professional_time_off
  FOR SELECT TO anon USING (true);
