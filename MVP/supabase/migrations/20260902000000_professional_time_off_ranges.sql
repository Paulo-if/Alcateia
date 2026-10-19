-- ============================================================================
-- BLOCO 2B EXTENSÃO — Suporte a períodos longos de indisponibilidade (Férias)
-- ----------------------------------------------------------------------------
-- Evolui a tabela professional_time_off de datas únicas para intervalos.
-- Isso evita a duplicação de centenas de registros para férias anuais/mensais.
--
-- Modelo final:
--   professional_id  uuid
--   barbearia_id     uuid
--   start_date       date   (início do bloqueio)
--   end_date         date   (fim do bloqueio, incluso)
--   reason           text
--   created_at       timestamptz
--
-- Folga de um dia:
--   start_date = '2026-09-06'  end_date = '2026-09-06'
--
-- Férias:
--   start_date = '2026-10-01'  end_date = '2026-10-31'
--
-- A migration é idempotente (IF NOT EXISTS / IF EXISTS) e determinística:
-- se aplicada uma única vez sobre a estrutura original (date), produz o
-- modelo final. Dados pré-existentes em `date` são convertidos para um
-- intervalo de 1 dia (start_date = end_date = date).
-- ============================================================================

-- 1. Adiciona a coluna end_date (nullable no momento da adição)
ALTER TABLE professional_time_off
ADD COLUMN IF NOT EXISTS end_date date;

-- 2. Migra dados existentes: end_date recebe o valor de date (período de 1 dia)
UPDATE professional_time_off
SET end_date = date
WHERE end_date IS NULL;

-- 3. Torna end_date obrigatório
ALTER TABLE professional_time_off
ALTER COLUMN end_date SET NOT NULL;

-- 4. Renomeia a coluna date para start_date para clareza.
-- (Sem IF EXISTS: a estrutura original possui a coluna `date`; esta migration
-- roda uma única vez sobre esse estado.)
ALTER TABLE professional_time_off
RENAME COLUMN date TO start_date;

-- 5. Constraints de unicidade.
-- Substitui a unicidade por data única por uma por intervalo.
-- Duplicatas exatas (mesmo professional, mesmo intervalo) continuam proibidas.
ALTER TABLE professional_time_off
DROP CONSTRAINT IF EXISTS uq_timeoff_professional_date;

ALTER TABLE professional_time_off
DROP CONSTRAINT IF EXISTS uq_timeoff_professional_range;

ALTER TABLE professional_time_off
ADD CONSTRAINT uq_timeoff_professional_range UNIQUE (professional_id, start_date, end_date);

-- 6. Índices coerentes com o novo modelo.
-- O antigo idx_timeoff_date (criado sobre `date`) foi renomeado para
-- idx_timeoff_start_date pelo Postgres ao renomear a coluna; para manter
-- nomes explícitos e um índice adequado ao filtro de intervalo, recriamos.
DROP INDEX IF EXISTS idx_timeoff_date;
DROP INDEX IF EXISTS idx_timeoff_start_date;
DROP INDEX IF EXISTS idx_timeoff_end_date;

CREATE INDEX IF NOT EXISTS idx_timeoff_professional ON professional_time_off (professional_id);
CREATE INDEX IF NOT EXISTS idx_timeoff_start_date ON professional_time_off (start_date);
CREATE INDEX IF NOT EXISTS idx_timeoff_end_date ON professional_time_off (end_date);
CREATE INDEX IF NOT EXISTS idx_timeoff_barbearia ON professional_time_off (barbearia_id);

-- Nota arquitetural (não aplicada aqui por escolha de MVP):
-- A validação de overlap (não permitir dois bloqueios que se sobreponham) pode
-- ser feita no futuro via exclusion constraint com btree_gist sobre
-- (professional_id, daterange(start_date, end_date, '[]')). Isso exige a
-- extensão btree_gist e não foi adicionado para não introduzir dependência
-- além do necessário neste bloco.
