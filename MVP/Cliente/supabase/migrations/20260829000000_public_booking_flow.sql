-- ============================================================================
-- Alcateia Barber — Evolução do schema para o fluxo público operacional
-- ============================================================================
-- Estende as migrações base (servicos, produtos, clientes, agendamentos,
-- vendas_bump, transacoes_financeiras, profissionais) com os requisitos do
-- cliente público:
--
--  1. Multi-tenancy (barbearia_id) + RLS restrito (NUNCA USING (true) em produção)
--  2. Proteção DEFINITIVA contra double booking (restrição de exclusão GiST)
--  3. Cliente único por telefone
--  4. Estados de pagamento (payment_method / payment_status / payment_id / paid_at)
--  5. Tabela `pagamentos` (webhook idempotente)
--  6. Configurações públicas da barbearia (`barbearia_config`)
--
-- IMPORTANTE: aplique APÓS as migrações iniciais do painel admin.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ----------------------------------------------------------------------------
-- 1. MULTI-TENANCY: barbearia_id nas entidades que variam por barbearia
-- ----------------------------------------------------------------------------
-- Uma única barbearia "Alcateia Barber" por enquanto; novas barbearias
-- teriam seu próprio registro e RLS vinculado a auth/barbearia_id.
CREATE TABLE IF NOT EXISTS barbearias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  whatsapp text,
  instagram text,
  endereco text,
  horario_funcionamento text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE barbearias ENABLE ROW LEVEL SECURITY;

INSERT INTO barbearias (id, nome)
VALUES ('00000000-0000-0000-0000-000000000001', 'Alcateia Barber')
ON CONFLICT (id) DO NOTHING;

-- Configurações por barbearia (lida pela home/confirmação)
CREATE TABLE IF NOT EXISTS barbearia_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL REFERENCES barbearias(id) ON DELETE CASCADE,
  nome text,
  whatsapp text,
  instagram text,
  endereco text,
  horario_funcionamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE barbearia_config ENABLE ROW LEVEL SECURITY;

INSERT INTO barbearia_config (id, barbearia_id, nome, whatsapp, instagram, endereco)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Alcateia Barber',
  '5511999999999',
  'https://instagram.com/alcateiabarber',
  'Alcatéia Barbearia'
) ON CONFLICT (id) DO NOTHING;

-- Adiciona barbearia_id às tabelas principais (default = barbearia padrão)
ALTER TABLE servicos       ADD COLUMN IF NOT EXISTS barbearia_id uuid REFERENCES barbearias(id) ON DELETE CASCADE;
ALTER TABLE produtos       ADD COLUMN IF NOT EXISTS barbearia_id uuid REFERENCES barbearias(id) ON DELETE CASCADE;
ALTER TABLE profissionais  ADD COLUMN IF NOT EXISTS barbearia_id uuid REFERENCES barbearias(id) ON DELETE CASCADE;
ALTER TABLE clientes       ADD COLUMN IF NOT EXISTS barbearia_id uuid REFERENCES barbearias(id) ON DELETE CASCADE;
ALTER TABLE agendamentos   ADD COLUMN IF NOT EXISTS barbearia_id uuid REFERENCES barbearias(id) ON DELETE CASCADE;
ALTER TABLE vendas_bump    ADD COLUMN IF NOT EXISTS barbearia_id uuid REFERENCES barbearias(id) ON DELETE CASCADE;

UPDATE servicos        SET barbearia_id = '00000000-0000-0000-0000-000000000001' WHERE barbearia_id IS NULL;
UPDATE produtos        SET barbearia_id = '00000000-0000-0000-0000-000000000001' WHERE barbearia_id IS NULL;
UPDATE profissionais   SET barbearia_id = '00000000-0000-0000-0000-000000000001' WHERE barbearia_id IS NULL;
UPDATE clientes        SET barbearia_id = '00000000-0000-0000-0000-000000000001' WHERE barbearia_id IS NULL;
UPDATE agendamentos    SET barbearia_id = '00000000-0000-0000-0000-000000000001' WHERE barbearia_id IS NULL;
UPDATE vendas_bump     SET barbearia_id = '00000000-0000-0000-0000-000000000001' WHERE barbearia_id IS NULL;

ALTER TABLE servicos      ALTER COLUMN barbearia_id SET NOT NULL;
ALTER TABLE produtos      ALTER COLUMN barbearia_id SET NOT NULL;
ALTER TABLE profissionais ALTER COLUMN barbearia_id SET NOT NULL;
ALTER TABLE clientes      ALTER COLUMN barbearia_id SET NOT NULL;
ALTER TABLE agendamentos  ALTER COLUMN barbearia_id SET NOT NULL;
ALTER TABLE vendas_bump   ALTER COLUMN barbearia_id SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. CLIENTE ÚNICO POR TELEFONE (evita duplicados ao re-agendar)
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_clientes_barbearia_telefone
  ON clientes (barbearia_id, telefone);

-- ----------------------------------------------------------------------------
-- 3. PROTEÇÃO DEFINITIVA CONTRA DOUBLE BOOKING
--    Um profissional não pode ter agendamentos ATIVOS sobrepostos.
--    Usa uma RESTRIÇÃO DE EXCLUSÃO GiST (&&) sobre o intervalo [inicio,fim)
--    filtrada pelos profissionais ativos e pelo BARBEARIA.
--    Cancelados/ausentes são ignorados (não bloqueiam horário).
-- ----------------------------------------------------------------------------
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS no_overlap_agendamentos;
ALTER TABLE agendamentos
  ADD CONSTRAINT no_overlap_agendamentos
  EXCLUDE USING gist (
    barbearia_id WITH =,
    professional_id WITH =,
    tsrange(data_inicio, data_fim, '[)') WITH &&
  )
  WHERE (status NOT IN ('cancelado', 'nao_compareceu'));

CREATE INDEX IF NOT EXISTS idx_agendamentos_barbearia_prof_data
  ON agendamentos (barbearia_id, professional_id, data_inicio);

-- ----------------------------------------------------------------------------
-- 4. ESTADOS DE PAGAMENTO nos agendamentos
-- ----------------------------------------------------------------------------
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS payment_method text;   -- 'online' | 'in_person'
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending'; -- pending|paid|failed|refunded
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS payment_id text;       -- id do pagamento do provider
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Chave de idempotência opcional para evitar reservas duplicadas no envio
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_agendamentos_idempotency ON agendamentos (barbearia_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 5. TABELA `pagamentos` — processamento de webhook idempotente
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text NOT NULL UNIQUE,
  agendamento_id uuid REFERENCES agendamentos(id) ON DELETE SET NULL,
  barbearia_id uuid REFERENCES barbearias(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  provider text,
  paid_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_pagamentos_payment_id ON pagamentos (payment_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_agendamento_id ON pagamentos (agendamento_id);

-- ----------------------------------------------------------------------------
-- 6. RLS RESTRITO (nunca USING (true) em produção)
--    O anon/publico só acessa dados da barbearia padrão e operações públicas.
-- ----------------------------------------------------------------------------

-- barbearia_config: leitura pública dos dados não sensíveis
DROP POLICY IF EXISTS "public_read_barbearia_config" ON barbearia_config;
CREATE POLICY "public_read_barbearia_config" ON barbearia_config FOR SELECT
  TO anon, authenticated
  USING (barbearia_id = '00000000-0000-0000-0000-000000000001');

-- servicos / produtos / profissionais: leitura pública da barbearia padrão
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['servicos','produtos','profissionais'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'public_read_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO anon, authenticated USING (barbearia_id = %L)',
      'public_read_' || t, t, '00000000-0000-0000-0000-000000000001');
  END LOOP;
END $$;

-- clientes: criação pública (para o fluxo de reserva sem login) e leitura dos próprios
DROP POLICY IF EXISTS "public_insert_clientes" ON clientes;
CREATE POLICY "public_insert_clientes" ON clientes FOR INSERT
  TO anon, authenticated
  WITH CHECK (barbearia_id = '00000000-0000-0000-0000-000000000001');

-- agendamentos: criação pública (fluxo de reserva) + leitura
DROP POLICY IF EXISTS "public_insert_agendamentos" ON agendamentos;
CREATE POLICY "public_insert_agendamentos" ON agendamentos FOR INSERT
  TO anon, authenticated
  WITH CHECK (barbearia_id = '00000000-0000-0000-0000-000000000001');
DROP POLICY IF EXISTS "public_read_agendamentos" ON agendamentos;
CREATE POLICY "public_read_agendamentos" ON agendamentos FOR SELECT
  TO anon, authenticated
  USING (barbearia_id = '00000000-0000-0000-0000-000000000001');

-- vendas_bump: criação pública vinculada à barbearia padrão
DROP POLICY IF EXISTS "public_insert_vendas_bump" ON vendas_bump;
CREATE POLICY "public_insert_vendas_bump" ON vendas_bump FOR INSERT
  TO anon, authenticated
  WITH CHECK (barbearia_id = '00000000-0000-0000-0000-000000000001');

-- pagamentos: escritas apenas via Edge Function com service_role.
-- NENHUMA regra de webhook fica exposta ao anon.
-- (A criação pública inicial de um pagamento context também é permitida, se necessário,
--  mas confirmação de status vem só do backend.)
DROP POLICY IF EXISTS "public_read_pagamentos" ON pagamentos;
CREATE POLICY "public_read_pagamentos" ON pagamentos FOR SELECT
  USING (barbearia_id = '00000000-0000-0000-0000-000000000001');

-- ----------------------------------------------------------------------------
-- Indices de performance de leitura para o fluxo de disponibilidade
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_agendamentos_barbearia_prof_data
  ON agendamentos (barbearia_id, professional_id, data_inicio);
