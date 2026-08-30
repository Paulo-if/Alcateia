/*
# AlcateiaBarber — Schema inicial

Cria as tabelas do app de agendamentos de barbearia: serviços, produtos, clientes,
agendamentos, vendas de order bump e transações financeiras. Todos com RLS habilitado.

1. Novas tabelas
- `servicos` — serviços oferecidos (corte, barba, etc.) com preço e duração
- `produtos` — produtos para venda / order bump (pomadas, acessórios)
- `clientes` — clientes que fazem agendamentos
- `agendamentos` — agendamentos vinculando cliente + serviço + horário
- `vendas_bump` — vendas de produtos adicionais no checkout (order bump)
- `transacoes_financeiras` — registro financeiro de cada agendamento/venda

2. Segurança
- RLS habilitado em todas as tabelas
- Políticas permitem leitura/escrita anônimas (app sem login — barbearia usa painel admin sem auth)
- TO anon, authenticated em todas as políticas
*/

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================== SERVIÇOS =====================
CREATE TABLE IF NOT EXISTS servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  preco numeric(10,2) NOT NULL DEFAULT 0,
  duracao_minutos integer NOT NULL DEFAULT 30,
  icone text DEFAULT 'scissors',
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_servicos" ON servicos;
CREATE POLICY "anon_select_servicos" ON servicos FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_servicos" ON servicos;
CREATE POLICY "anon_insert_servicos" ON servicos FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_servicos" ON servicos;
CREATE POLICY "anon_update_servicos" ON servicos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_servicos" ON servicos;
CREATE POLICY "anon_delete_servicos" ON servicos FOR DELETE
  TO anon, authenticated USING (true);

-- ===================== PRODUTOS =====================
CREATE TABLE IF NOT EXISTS produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  preco_original numeric(10,2) NOT NULL DEFAULT 0,
  preco_bump numeric(10,2) NOT NULL DEFAULT 0,
  imagem_url text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_produtos" ON produtos;
CREATE POLICY "anon_select_produtos" ON produtos FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_produtos" ON produtos;
CREATE POLICY "anon_insert_produtos" ON produtos FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_produtos" ON produtos;
CREATE POLICY "anon_update_produtos" ON produtos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_produtos" ON produtos;
CREATE POLICY "anon_delete_produtos" ON produtos FOR DELETE
  TO anon, authenticated USING (true);

-- ===================== CLIENTES =====================
CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_clientes" ON clientes;
CREATE POLICY "anon_select_clientes" ON clientes FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_clientes" ON clientes;
CREATE POLICY "anon_insert_clientes" ON clientes FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_clientes" ON clientes;
CREATE POLICY "anon_update_clientes" ON clientes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_clientes" ON clientes;
CREATE POLICY "anon_delete_clientes" ON clientes FOR DELETE
  TO anon, authenticated USING (true);

-- ===================== AGENDAMENTOS =====================
CREATE TABLE IF NOT EXISTS agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  servico_id uuid NOT NULL REFERENCES servicos(id) ON DELETE RESTRICT,
  data_inicio timestamptz NOT NULL,
  data_fim timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'agendado',
  valor_servico numeric(10,2) NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agendamentos_data_inicio ON agendamentos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_agendamentos_servico_id ON agendamentos(servico_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_id ON agendamentos(cliente_id);

DROP POLICY IF EXISTS "anon_select_agendamentos" ON agendamentos;
CREATE POLICY "anon_select_agendamentos" ON agendamentos FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_agendamentos" ON agendamentos;
CREATE POLICY "anon_insert_agendamentos" ON agendamentos FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_agendamentos" ON agendamentos;
CREATE POLICY "anon_update_agendamentos" ON agendamentos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_agendamentos" ON agendamentos;
CREATE POLICY "anon_delete_agendamentos" ON agendamentos FOR DELETE
  TO anon, authenticated USING (true);

-- ===================== VENDAS BUMP =====================
CREATE TABLE IF NOT EXISTS vendas_bump (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id uuid NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  valor_pago numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE vendas_bump ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_vendas_bump_agendamento_id ON vendas_bump(agendamento_id);

DROP POLICY IF EXISTS "anon_select_vendas_bump" ON vendas_bump;
CREATE POLICY "anon_select_vendas_bump" ON vendas_bump FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_vendas_bump" ON vendas_bump;
CREATE POLICY "anon_insert_vendas_bump" ON vendas_bump FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_vendas_bump" ON vendas_bump;
CREATE POLICY "anon_update_vendas_bump" ON vendas_bump FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_vendas_bump" ON vendas_bump;
CREATE POLICY "anon_delete_vendas_bump" ON vendas_bump FOR DELETE
  TO anon, authenticated USING (true);

-- ===================== TRANSACOES FINANCEIRAS =====================
CREATE TABLE IF NOT EXISTS transacoes_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'receita',
  valor numeric(10,2) NOT NULL DEFAULT 0,
  descricao text,
  categoria text DEFAULT 'servico',
  agendamento_id uuid REFERENCES agendamentos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE transacoes_financeiras ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_transacoes_financeiras_created_at ON transacoes_financeiras(created_at);

DROP POLICY IF EXISTS "anon_select_transacoes" ON transacoes_financeiras;
CREATE POLICY "anon_select_transacoes" ON transacoes_financeiras FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_transacoes" ON transacoes_financeiras;
CREATE POLICY "anon_insert_transacoes" ON transacoes_financeiras FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_transacoes" ON transacoes_financeiras;
CREATE POLICY "anon_update_transacoes" ON transacoes_financeiras FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_transacoes" ON transacoes_financeiras;
CREATE POLICY "anon_delete_transacoes" ON transacoes_financeiras FOR DELETE
  TO anon, authenticated USING (true);
