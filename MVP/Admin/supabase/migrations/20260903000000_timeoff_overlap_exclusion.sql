-- ============================================================================
-- BLOCO 2B EXTENSÃO — Validação de overlap de folgas/bloqueios (professional_time_off)
-- ----------------------------------------------------------------------------
-- Implementa a validação de overlap que foi deferida na migration
-- 20260902000000_professional_time_off_ranges.sql (ver nota arquitetural).
--
-- Objetivo: impedir que um profissional tenha dois bloqueios de time-off que
-- se sobreponham (ex.: 01/09–10/09 e 05/09–15/09), evitando "lixo" no banco e
-- estado inconsistente na UI.
--
-- Usa a exclusão constraint com btree_gist sobre
-- (professional_id, daterange(start_date, end_date, '[]')). A extensão
-- btree_gist JÁ está habilitada na migration base (20260830000000).
--
-- A constraint trata o intervalo como inclusivo em ambas as pontas ('[]').
-- ============================================================================

-- Remove eventual constraint anterior antes de recriar (idempotente).
ALTER TABLE professional_time_off
DROP CONSTRAINT IF EXISTS no_overlap_timeoff;

-- Exclusion constraint que impede sobreposição de períodos por profissional.
ALTER TABLE professional_time_off
ADD CONSTRAINT no_overlap_timeoff
EXCLUDE USING gist (
  professional_id WITH =,
  daterange(start_date, end_date, '[]') WITH &&
);
