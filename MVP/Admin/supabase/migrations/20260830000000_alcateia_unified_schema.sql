-- ============================================================================
-- AlcateiaBarber — SCHEMA UNIFICADO (FONTE ÚNICA DE VERDADE)
-- ============================================================================
-- Consolidado do MVP (Admin + Cliente) num ÚNICO modelo de banco.
-- Substitui as 3 migrations antigas:
--   * 20260827202247_create_alcateiabarber_schema.sql      (Admin)
--   * 20260828000000_add_professionals_to_booking_flow.sql (Admin)
--   * 20260829000000_public_booking_flow.sql               (Cliente)
-- O banco pode ser reconstruído do zero (ambiente de desenvolvimento).
-- POR ISSO este arquivo define o schema COMPLETO e deve ser aplicado
-- num schema vazio/preparado. Use o reset do projeto Supabase (ou truncate)
-- antes de aplicar, para evitar conflito com tabelas antigas.
--
-- DIRETRIZES DE BLOCO 1 (fundação):
--   * Uma única fonte de verdade para as 10 entidades.
--   * barbearia_id em todas as entidades com isolamento/relacionamento.
--   * agendamentos.professional_id compatível com profissionais.id (uuid + FK).
--   * tabela pagamentos + colunas de pagamento em agendamentos.
--   * Proteção DEFINITIVA de double booking (GiST) preservada.
--   * Cliente único por telefone (barbearia_id, telefone).
--   * Seeds com UUIDs válidos e FKs corretas, separados do dado de produção.
--   * RLS: NÃO habilitado neste bloco (deferido ao BLOCO 2).
--     O schema já está preparado (barbearia_id como ownership) para o Bloco 2.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- 1. BARBEARIAS
-- ============================================================================
-- A operação atual usa UMA única barbearia. O id padrão abaixo é a referência
-- de ownership usada como DEFAULT nas entidades filhas, mantendo o schema
-- funcional com os inserts atuais do Admin e do Cliente (que não informam
-- barbearia_id explicitamente) e já preparado para RLS no Bloco 2.
-- ============================================================================
CREATE TABLE barbearias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  logo_url text,
  whatsapp text,
  instagram text,
  telefone text,
  endereco text,
  horario_funcionamento text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Referência da barbearia padrão (usada nos DEFAULT das entidades filhas)
INSERT INTO barbearias (id, nome, whatsapp, instagram, endereco)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Alcateia Barber',
  '5511999999999',
  'https://instagram.com/alcateiabarber',
  'Alcatéia Barbearia'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. BARBEARIA CONFIG (configurações públicas consumidas pela Home/Confirmação)
-- ============================================================================
CREATE TABLE barbearia_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES barbearias(id) ON DELETE CASCADE,
  nome text,
  logo_url text,
  whatsapp text,
  instagram text,
  telefone text,
  endereco text,
  horario_funcionamento text,
  maps_embed_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. SERVIÇOS
-- ============================================================================
CREATE TABLE servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES barbearias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  preco numeric(10,2) NOT NULL DEFAULT 0,
  duracao_minutos integer NOT NULL DEFAULT 30,
  icone text DEFAULT 'scissors',
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. PRODUTOS
-- ============================================================================
CREATE TABLE produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES barbearias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  preco_original numeric(10,2) NOT NULL DEFAULT 0,
  preco_bump numeric(10,2) NOT NULL DEFAULT 0,
  imagem_url text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. PROFISSIONAIS
-- ============================================================================
CREATE TABLE profissionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES barbearias(id) ON DELETE CASCADE,
  name text NOT NULL,
  specialty text,
  avatar_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. CLIENTES (telefone = identificador operacional principal por barbearia)
-- ============================================================================
CREATE TABLE clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES barbearias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_clientes_barbearia_telefone UNIQUE (barbearia_id, telefone)
);

-- ============================================================================
-- 7. AGENDAMENTOS
-- ============================================================================
CREATE TABLE agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES barbearias(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  servico_id uuid NOT NULL REFERENCES servicos(id) ON DELETE RESTRICT,
  -- Impede deleção física de profissional que possui histórico de agendamentos.
  -- Desligamento deve usar active=false (soft delete), preservando a atribuição
  -- dos agendamentos e a proteção GiST de double booking (que exige
  -- professional_id NOT NULL).
  professional_id uuid REFERENCES profissionais(id) ON DELETE RESTRICT,
  data_inicio timestamptz NOT NULL,
  data_fim timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'agendado',
  valor_servico numeric(10,2) NOT NULL DEFAULT 0,
  observacoes text,
  -- Pagamento (método e status tratados separadamente)
  payment_method text,                 -- 'online' | 'in_person'
  payment_status text DEFAULT 'pending', -- pending | paid | failed | refunded
  payment_id text,                     -- id do pagamento no provider
  paid_at timestamptz,
  idempotency_key text,                -- evita reserva duplicada no reenvio
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_agendamentos_status CHECK (
    status IN ('agendado', 'confirmado', 'concluido', 'cancelado', 'nao_compareceu')
  ),
  CONSTRAINT chk_agendamentos_payment_method CHECK (
    payment_method IS NULL OR payment_method IN ('online', 'in_person')
  ),
  CONSTRAINT chk_agendamentos_payment_status CHECK (
    payment_status IS NULL OR payment_status IN ('pending', 'paid', 'failed', 'refunded')
  )
);

-- Idempotência
CREATE UNIQUE INDEX uq_agendamentos_idempotency
  ON agendamentos (barbearia_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Índices de performance
CREATE INDEX idx_agendamentos_data_inicio ON agendamentos(data_inicio);
CREATE INDEX idx_agendamentos_servico_id ON agendamentos(servico_id);
CREATE INDEX idx_agendamentos_cliente_id ON agendamentos(cliente_id);
CREATE INDEX idx_agendamentos_professional_id ON agendamentos(professional_id);
CREATE INDEX idx_agendamentos_barbearia_prof_data
  ON agendamentos (barbearia_id, professional_id, data_inicio);

-- ---------------------------------------------------------------------------
-- PROTEÇÃO DEFINITIVA DE DOUBLE BOOKING (GiST)
-- Mesmo profissional + intervalos ativos sobrepostos = não permitir.
-- Cancelados/ausentes NÃO bloqueiam horário.
-- ---------------------------------------------------------------------------
ALTER TABLE agendamentos
  ADD CONSTRAINT no_overlap_agendamentos
  EXCLUDE USING gist (
    barbearia_id WITH =,
    professional_id WITH =,
    tstzrange(data_inicio, data_fim, '[)') WITH &&
  )
  WHERE (professional_id IS NOT NULL AND status NOT IN ('cancelado', 'nao_compareceu'));

-- ============================================================================
-- 8. VENDAS BUMP (order bump e upsell)
-- ============================================================================
CREATE TABLE vendas_bump (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES barbearias(id) ON DELETE CASCADE,
  agendamento_id uuid NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES produtos(id) ON DELETE RESTRICT,
  valor_pago numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vendas_bump_agendamento_id ON vendas_bump(agendamento_id);

-- ============================================================================
-- 9. TRANSAÇÕES FINANCEIRAS
-- ============================================================================
CREATE TABLE transacoes_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES barbearias(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'receita',
  valor numeric(10,2) NOT NULL DEFAULT 0,
  descricao text,
  categoria text DEFAULT 'servico',
  agendamento_id uuid REFERENCES agendamentos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_transacoes_tipo CHECK (tipo IN ('receita', 'despesa'))
);
CREATE INDEX idx_transacoes_financeiras_created_at ON transacoes_financeiras(created_at);

-- ============================================================================
-- 10. PAGAMENTOS (webhook idempotente; sem gateway ainda)
-- ============================================================================
CREATE TABLE pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text NOT NULL UNIQUE,
  agendamento_id uuid REFERENCES agendamentos(id) ON DELETE SET NULL,
  barbearia_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES barbearias(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  provider text,
  paid_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_pagamentos_status CHECK (
    status IS NULL OR status IN ('pending', 'paid', 'failed', 'refunded')
  )
);
CREATE INDEX idx_pagamentos_payment_id ON pagamentos(payment_id);
CREATE INDEX idx_pagamentos_agendamento_id ON pagamentos(agendamento_id);

-- ============================================================================
-- SEEDS — Somente dados de fundação (barbearia padrão e catálogo vazio).
-- Não criar dados comerciais falsos desnecessários.
-- ============================================================================

-- Config público padrão (consumida pela Home/Confirmação)
INSERT INTO barbearia_config (
  id, barbearia_id, nome, whatsapp, instagram, endereco
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Alcateia Barber',
  '5511999999999',
  'https://instagram.com/alcateiabarber',
  'Alcatéia Barbearia'
)
ON CONFLICT (id) DO NOTHING;

-- Profissionais de demonstração (UUIDs válidos, vinculados à barbearia padrão).
-- Equivalem aos seeds das migrations antigas — mantidos para paridade de dev.
INSERT INTO profissionais (id, barbearia_id, name, specialty, avatar_url, active)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Rafael', 'Especialista em degradê', null, true),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Carlos', 'Especialista em barba', null, true),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'João', 'Cortes modernos', null, true),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'Lucas', 'Corte + barba', null, true)
ON CONFLICT (id) DO NOTHING;
