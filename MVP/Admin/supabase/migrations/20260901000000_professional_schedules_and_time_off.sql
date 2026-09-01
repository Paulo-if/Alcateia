-- ============================================================================
-- BLOCO 2B — Agenda individual dos profissionais
-- ----------------------------------------------------------------------------
-- Cria a estrutura para a disponibilidade semanal de trabalho do profissional
-- (professional_schedules) e os dias de folga/bloqueio específicos
-- (professional_time_off).
--
-- CONVENÇÃO DE DIA DA SEMANA (usada em toda a aplicação):
--   day_of_week: 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta,
--                5 = Sexta, 6 = Sábado, 7 = Domingo
--   (ISO 8601; conversão a partir de Date.getDay(): ((day+6)%7)+1)
--
-- Barbearia default do MVP: '00000000-0000-0000-0000-000000000001'
-- RLS completa será tratada no bloco de segurança; aqui mantemos a estrutura
-- preparada (barbearia_id) sem criar policies novas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFESSIONAL_SCHEDULES
-- Horário padrão de trabalho por dia da semana (por profissional).
-- Permite mais de um intervalo por dia (único intervalo hoje; estrutura aceita
-- múltiplas linhas por (professional_id, day_of_week) no futuro).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS professional_schedules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
  barbearia_id   uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
                 REFERENCES barbearias(id) ON DELETE CASCADE,
  day_of_week    smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time     time NOT NULL,
  end_time       time NOT NULL,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_schedule_start_before_end CHECK (start_time < end_time),
  CONSTRAINT uq_schedules_professional_day UNIQUE (professional_id, day_of_week, start_time)
);

CREATE INDEX IF NOT EXISTS idx_schedules_professional ON professional_schedules (professional_id);
CREATE INDEX IF NOT EXISTS idx_schedules_barbearia ON professional_schedules (barbearia_id);

-- ----------------------------------------------------------------------------
-- 2. PROFESSIONAL_TIME_OFF
-- Datas específicas sem expediente para um profissional (folga, bloqueio).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS professional_time_off (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
  barbearia_id    uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
                  REFERENCES barbearias(id) ON DELETE CASCADE,
  date            date NOT NULL,
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_timeoff_professional_date UNIQUE (professional_id, date)
);

CREATE INDEX IF NOT EXISTS idx_timeoff_professional ON professional_time_off (professional_id);
CREATE INDEX IF NOT EXISTS idx_timeoff_date ON professional_time_off (date);
CREATE INDEX IF NOT EXISTS idx_timeoff_barbearia ON professional_time_off (barbearia_id);

-- REVOKE padrão: sem policies permissivas novas. RLS será ligada no bloco de segurança.