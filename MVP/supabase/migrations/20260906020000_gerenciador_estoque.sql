-- =============================================================================
-- GERENCIADOR COMPLETO DE ESTOQUE
-- Evolui o sistema de estoque existente com: fornecedores, custo de compra,
-- saídas classificadas, inventário, serviço↔produto, KPIs, relatórios, e
-- permissão de entrada para barbeiro.
-- Requer: 20260906000000_sistema_estoque.sql (já aplicada)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABELA: fornecedores
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbearia_id uuid NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  documento text,
  telefone text,
  email text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fornecedores_barbearia_nome
  ON public.fornecedores (barbearia_id, lower(trim(nome)));

-- -----------------------------------------------------------------------------
-- 2. TABELA: produto_servico (produtos vinculados a serviços)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.produto_servico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbearia_id uuid NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
  servico_id uuid NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade integer NOT NULL DEFAULT 1
    CONSTRAINT produto_servico_quantidade_check CHECK (quantidade >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_produto_servico UNIQUE (servico_id, produto_id)
);

-- -----------------------------------------------------------------------------
-- 3. CAMPOS NOVOS EM produtos
-- -----------------------------------------------------------------------------
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS categoria text;

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS marca text;

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS sku text;

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS unidade_medida text NOT NULL DEFAULT 'un';

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS custo_compra numeric(12,2);

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS data_validade date;

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produtos_fornecedor_id_fkey') THEN
    ALTER TABLE public.produtos
      ADD CONSTRAINT produtos_fornecedor_id_fkey
      FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Proteger custo de compra do anon (catalogo publico)
REVOKE SELECT (custo_compra) ON public.produtos FROM anon;

-- -----------------------------------------------------------------------------
-- 4. CAMPOS NOVOS EM estoque_movimentacoes
-- -----------------------------------------------------------------------------
ALTER TABLE public.estoque_movimentacoes
  ADD COLUMN IF NOT EXISTS data_movimentacao timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.estoque_movimentacoes
  ADD COLUMN IF NOT EXISTS valor_unitario numeric(12,2);

ALTER TABLE public.estoque_movimentacoes
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid;

ALTER TABLE public.estoque_movimentacoes
  ADD COLUMN IF NOT EXISTS nota_fiscal text;

ALTER TABLE public.estoque_movimentacoes
  ADD COLUMN IF NOT EXISTS motivo text;

ALTER TABLE public.estoque_movimentacoes
  ADD COLUMN IF NOT EXISTS cliente_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'estoque_movimentacoes_fornecedor_id_fkey') THEN
    ALTER TABLE public.estoque_movimentacoes
      ADD CONSTRAINT estoque_movimentacoes_fornecedor_id_fkey
      FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'estoque_movimentacoes_cliente_id_fkey') THEN
    ALTER TABLE public.estoque_movimentacoes
      ADD CONSTRAINT estoque_movimentacoes_cliente_id_fkey
      FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Estender CHECK de origem para incluir novas classificacoes
ALTER TABLE public.estoque_movimentacoes
  DROP CONSTRAINT IF EXISTS estoque_movimentacoes_origem_check;

ALTER TABLE public.estoque_movimentacoes
  ADD CONSTRAINT estoque_movimentacoes_origem_check
  CHECK (origem IN ('manual','venda','order_bump','ajuste','consumo','perda','servico'));

-- Recriar unique index de idempotencia: (referencia_id, produto_id) por saida ativa
DROP INDEX IF EXISTS public.uq_estoque_movimentacoes_saida_ativa;

CREATE UNIQUE INDEX IF NOT EXISTS uq_estoque_movimentacoes_saida_ativa
  ON public.estoque_movimentacoes (referencia_id, produto_id)
  WHERE tipo = 'saida' AND NOT estornado;

-- Indices para consultas do gerenciador
CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_data
  ON public.estoque_movimentacoes (data_movimentacao DESC);

CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_tipo_origem
  ON public.estoque_movimentacoes (tipo, origem, estornado)
  WHERE tipo = 'saida';

-- -----------------------------------------------------------------------------
-- 5. RLS: novas tabelas + ajustes
-- -----------------------------------------------------------------------------

-- fornecedores
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS master_all_fornecedores ON public.fornecedores;
CREATE POLICY master_all_fornecedores
  ON public.fornecedores FOR ALL
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

DROP POLICY IF EXISTS barbeiro_select_fornecedores ON public.fornecedores;
CREATE POLICY barbeiro_select_fornecedores
  ON public.fornecedores FOR SELECT
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'barbeiro');

GRANT SELECT ON public.fornecedores TO authenticated;
GRANT SELECT ON public.fornecedores TO service_role;

-- produto_servico
ALTER TABLE public.produto_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS master_all_produto_servico ON public.produto_servico;
CREATE POLICY master_all_produto_servico
  ON public.produto_servico FOR ALL
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master')
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master');

GRANT SELECT ON public.produto_servico TO authenticated;
GRANT SELECT ON public.produto_servico TO service_role;

-- estoque_movimentacoes: barbeiro so ve suas proprias entradas (protege custo de compras alheias)
DROP POLICY IF EXISTS barbeiro_select_estoque_movimentacoes ON public.estoque_movimentacoes;
CREATE POLICY barbeiro_select_estoque_movimentacoes
  ON public.estoque_movimentacoes FOR SELECT
  USING (
    (current_usuario()).ativo
    AND (current_usuario()).papel = 'barbeiro'
    AND tipo = 'entrada'
    AND criado_por = (current_usuario()).id
  );

-- -----------------------------------------------------------------------------
-- 6. CORE: evoluir registrar_movimentacao_estoque
--    Params novos (defaults preservam chamadas existentes do trigger).
--    Remove o overload antigo de 7 params (criado quando a assinatura mudou)
--    para nao deixar chamadas posicionais ambiguas.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.registrar_movimentacao_estoque(uuid, text, integer, text, uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.registrar_movimentacao_estoque(
  p_produto_id uuid,
  p_tipo text,
  p_quantidade integer,
  p_origem text,
  p_referencia_id uuid DEFAULT NULL,
  p_observacao text DEFAULT NULL,
  p_ignorar_insuficiente boolean DEFAULT false,
  p_data_movimentacao timestamptz DEFAULT NULL,
  p_valor_unitario numeric DEFAULT NULL,
  p_fornecedor_id uuid DEFAULT NULL,
  p_nota_fiscal text DEFAULT NULL,
  p_motivo text DEFAULT NULL,
  p_cliente_id uuid DEFAULT NULL
)
RETURNS public.estoque_movimentacoes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbearia_id uuid;
  v_anterior integer;
  v_posterior integer;
  v_saida_id uuid;
  v_ya_saida boolean;
  v_mov public.estoque_movimentacoes;
BEGIN
  IF p_tipo NOT IN ('entrada','saida') THEN
    RAISE EXCEPTION 'Tipo de movimentacao invalido: %', p_tipo;
  END IF;

  IF p_quantidade < 1 THEN
    RAISE EXCEPTION 'Quantidade invalida: %', p_quantidade;
  END IF;

  IF p_origem NOT IN ('manual','venda','order_bump','ajuste','consumo','perda','servico') THEN
    RAISE EXCEPTION 'Origem de movimentacao invalida: %', p_origem;
  END IF;

  IF p_valor_unitario IS NOT NULL AND p_valor_unitario < 0 THEN
    RAISE EXCEPTION 'Valor unitario invalido: %', p_valor_unitario;
  END IF;

  -- Reversao: entrada de ajuste estorna a saida ativa correspondente (mesmo produto)
  IF p_tipo = 'entrada' AND p_origem = 'ajuste' AND p_referencia_id IS NOT NULL THEN
    SELECT em.id INTO v_saida_id
      FROM public.estoque_movimentacoes em
     WHERE em.referencia_id = p_referencia_id
       AND em.produto_id = p_produto_id
       AND em.tipo = 'saida'
       AND NOT em.estornado
     ORDER BY em.created_at DESC LIMIT 1;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    UPDATE public.estoque_movimentacoes SET estornado = true WHERE id = v_saida_id;
  END IF;

  -- Idempotencia de saida: se ja existe saida ativa para referencia+produto, nada a fazer
  IF p_tipo = 'saida' AND p_referencia_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.estoque_movimentacoes em
       WHERE em.referencia_id = p_referencia_id
         AND em.produto_id = p_produto_id
         AND em.tipo = 'saida'
         AND NOT em.estornado
    ) INTO v_ya_saida;

    IF v_ya_saida THEN
      RETURN NULL;
    END IF;
  END IF;

  -- Lock da linha do produto
  SELECT barbearia_id, estoque_atual INTO v_barbearia_id, v_anterior
    FROM public.produtos
   WHERE id = p_produto_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto nao encontrado.';
  END IF;

  IF p_tipo = 'saida' AND v_anterior < p_quantidade THEN
    IF p_ignorar_insuficiente THEN
      RETURN NULL;
    END IF;
    RAISE EXCEPTION 'Estoque insuficiente para este produto.';
  END IF;

  v_posterior := v_anterior + (CASE WHEN p_tipo = 'entrada' THEN p_quantidade ELSE -p_quantidade END);

  UPDATE public.produtos
     SET estoque_atual = v_posterior,
         custo_compra = CASE
           WHEN p_tipo = 'entrada' AND p_valor_unitario IS NOT NULL
             THEN p_valor_unitario
           ELSE custo_compra
         END
   WHERE id = p_produto_id;

  INSERT INTO public.estoque_movimentacoes (
    barbearia_id, produto_id, tipo, quantidade,
    estoque_anterior, estoque_posterior,
    origem, referencia_id, estornado, observacao, criado_por,
    data_movimentacao, valor_unitario, fornecedor_id,
    nota_fiscal, motivo, cliente_id
  ) VALUES (
    v_barbearia_id, p_produto_id, p_tipo, p_quantidade,
    v_anterior, v_posterior,
    p_origem, p_referencia_id, false, p_observacao,
    (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()),
    COALESCE(p_data_movimentacao, now()),
    p_valor_unitario, p_fornecedor_id,
    p_nota_fiscal, p_motivo, p_cliente_id
  )
  ON CONFLICT (referencia_id, produto_id) WHERE tipo = 'saida' AND NOT estornado
  DO NOTHING
  RETURNING * INTO v_mov;

  RETURN v_mov;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. RPC: registrar_entrada_estoque (master + barbeiro)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_entrada_estoque(
  p_produto_id uuid,
  p_quantidade integer,
  p_valor_unitario numeric DEFAULT NULL,
  p_fornecedor_id uuid DEFAULT NULL,
  p_nota_fiscal text DEFAULT NULL,
  p_data_movimentacao timestamptz DEFAULT NULL,
  p_observacao text DEFAULT NULL
)
RETURNS public.estoque_movimentacoes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario public.usuarios;
  v_mov public.estoque_movimentacoes;
BEGIN
  v_usuario := public.current_usuario();

  IF v_usuario IS NULL OR NOT v_usuario.ativo OR v_usuario.papel NOT IN ('master','barbeiro') THEN
    RAISE EXCEPTION 'Acesso restrito: somente usuarios autorizados podem registrar entradas.';
  END IF;

  IF p_fornecedor_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.fornecedores WHERE id = p_fornecedor_id) THEN
      RAISE EXCEPTION 'Fornecedor nao encontrado.';
    END IF;
  END IF;

  v_mov := public.registrar_movimentacao_estoque(
    p_produto_id, 'entrada', p_quantidade, 'manual',
    NULL, p_observacao, false,
    p_data_movimentacao, p_valor_unitario, p_fornecedor_id,
    p_nota_fiscal, NULL, NULL
  );

  RETURN v_mov;
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. RPC: registrar_saida_estoque (somente master)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_saida_estoque(
  p_produto_id uuid,
  p_quantidade integer,
  p_motivo text,
  p_observacao text DEFAULT NULL
)
RETURNS public.estoque_movimentacoes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario public.usuarios;
  v_origem text;
  v_mov public.estoque_movimentacoes;
BEGIN
  v_usuario := public.current_usuario();

  IF v_usuario IS NULL OR NOT v_usuario.ativo OR v_usuario.papel <> 'master' THEN
    RAISE EXCEPTION 'Acesso restrito: somente o master pode registrar saidas.';
  END IF;

  IF p_motivo NOT IN ('Consumo interno','Perda/avaria','Ajuste manual') THEN
    RAISE EXCEPTION 'Motivo de saida invalido: %', p_motivo;
  END IF;

  v_origem := CASE p_motivo
    WHEN 'Consumo interno' THEN 'consumo'
    WHEN 'Perda/avaria'    THEN 'perda'
    WHEN 'Ajuste manual'   THEN 'manual'
  END;

  v_mov := public.registrar_movimentacao_estoque(
    p_produto_id, 'saida', p_quantidade, v_origem,
    NULL, COALESCE(p_observacao, p_motivo), false,
    NULL, NULL, NULL, NULL, p_motivo, NULL
  );

  RETURN v_mov;
END;
$$;

-- -----------------------------------------------------------------------------
-- 9. RPC: realizar_inventario (somente master)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.realizar_inventario(
  p_produto_id uuid,
  p_quantidade_fisica integer,
  p_motivo text,
  p_observacao text DEFAULT NULL
)
RETURNS public.estoque_movimentacoes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario public.usuarios;
  v_atual integer;
  v_diff integer;
  v_mov public.estoque_movimentacoes;
BEGIN
  v_usuario := public.current_usuario();

  IF v_usuario IS NULL OR NOT v_usuario.ativo OR v_usuario.papel <> 'master' THEN
    RAISE EXCEPTION 'Acesso restrito: somente o master pode realizar inventario.';
  END IF;

  IF p_quantidade_fisica < 0 THEN
    RAISE EXCEPTION 'Quantidade fisica nao pode ser negativa.';
  END IF;

  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RAISE EXCEPTION 'Motivo do ajuste e obrigatorio.';
  END IF;

  SELECT estoque_atual INTO v_atual
    FROM public.produtos WHERE id = p_produto_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto nao encontrado.';
  END IF;

  v_diff := p_quantidade_fisica - v_atual;

  IF v_diff = 0 THEN
    RETURN NULL;
  END IF;

  IF v_diff > 0 THEN
    v_mov := public.registrar_movimentacao_estoque(
      p_produto_id, 'entrada', v_diff, 'ajuste',
      NULL, p_observacao, false,
      NULL, NULL, NULL, NULL, p_motivo, NULL
    );
  ELSE
    v_mov := public.registrar_movimentacao_estoque(
      p_produto_id, 'saida', -v_diff, 'ajuste',
      NULL, p_observacao, false,
      NULL, NULL, NULL, NULL, p_motivo, NULL
    );
  END IF;

  RETURN v_mov;
END;
$$;

-- -----------------------------------------------------------------------------
-- 10. RPCs DE RELATORIOS (somente master via role-check interno)
-- -----------------------------------------------------------------------------

-- KPIs do estoque
CREATE OR REPLACE FUNCTION public.kpis_estoque()
RETURNS TABLE (
  total_unidades bigint,
  valor_total_estoque numeric,
  skus_baixo bigint,
  skus_esgotados bigint,
  skus_vencidos bigint,
  skus_vencendo bigint,
  total_produtos bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_usuario public.usuarios;
BEGIN
  v_usuario := public.current_usuario();
  IF v_usuario IS NULL OR NOT v_usuario.ativo OR v_usuario.papel <> 'master' THEN
    RAISE EXCEPTION 'Acesso restrito: somente o master pode ver KPIs.';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(p.estoque_atual), 0)::bigint,
    COALESCE(SUM(p.estoque_atual * COALESCE(p.custo_compra, 0)), 0)::numeric,
    COUNT(*) FILTER (WHERE p.estoque_atual > 0 AND p.estoque_minimo > 0 AND p.estoque_atual <= p.estoque_minimo)::bigint,
    COUNT(*) FILTER (WHERE p.estoque_atual = 0)::bigint,
    COUNT(*) FILTER (WHERE p.data_validade IS NOT NULL AND p.data_validade < CURRENT_DATE)::bigint,
    COUNT(*) FILTER (WHERE p.data_validade IS NOT NULL AND p.data_validade >= CURRENT_DATE AND p.data_validade <= CURRENT_DATE + INTERVAL '30 days')::bigint,
    COUNT(*)::bigint
  FROM public.produtos p;
END;
$$;

-- Ranking de vendas (order_bump + venda)
CREATE OR REPLACE FUNCTION public.ranking_vendas(p_dias integer DEFAULT 30)
RETURNS TABLE (produto_id uuid, produto_nome text, total bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_usuario public.usuarios;
BEGIN
  v_usuario := public.current_usuario();
  IF v_usuario IS NULL OR NOT v_usuario.ativo OR v_usuario.papel <> 'master' THEN
    RAISE EXCEPTION 'Acesso restrito.';
  END IF;

  RETURN QUERY
  SELECT em.produto_id, p.nome, SUM(em.quantidade)::bigint
    FROM public.estoque_movimentacoes em
    JOIN public.produtos p ON p.id = em.produto_id
   WHERE em.tipo = 'saida'
     AND em.origem IN ('order_bump','venda')
     AND NOT em.estornado
     AND em.data_movimentacao >= (CURRENT_TIMESTAMP - (p_dias || ' days')::interval)
   GROUP BY em.produto_id, p.nome
   ORDER BY total DESC;
END;
$$;

-- Ranking de consumo (consumo interno + servico)
CREATE OR REPLACE FUNCTION public.ranking_consumo(p_dias integer DEFAULT 30)
RETURNS TABLE (produto_id uuid, produto_nome text, total bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_usuario public.usuarios;
BEGIN
  v_usuario := public.current_usuario();
  IF v_usuario IS NULL OR NOT v_usuario.ativo OR v_usuario.papel <> 'master' THEN
    RAISE EXCEPTION 'Acesso restrito.';
  END IF;

  RETURN QUERY
  SELECT em.produto_id, p.nome, SUM(em.quantidade)::bigint
    FROM public.estoque_movimentacoes em
    JOIN public.produtos p ON p.id = em.produto_id
   WHERE em.tipo = 'saida'
     AND em.origem IN ('consumo','servico')
     AND NOT em.estornado
     AND em.data_movimentacao >= (CURRENT_TIMESTAMP - (p_dias || ' days')::interval)
   GROUP BY em.produto_id, p.nome
   ORDER BY total DESC;
END;
$$;

-- Produtos parados (sem saida comercial/consumo no periodo)
CREATE OR REPLACE FUNCTION public.rel_produtos_parados(p_dias integer DEFAULT 30)
RETURNS TABLE (id uuid, nome text, ativo boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_usuario public.usuarios;
BEGIN
  v_usuario := public.current_usuario();
  IF v_usuario IS NULL OR NOT v_usuario.ativo OR v_usuario.papel <> 'master' THEN
    RAISE EXCEPTION 'Acesso restrito.';
  END IF;

  RETURN QUERY
  SELECT p.id, p.nome, p.ativo
    FROM public.produtos p
   WHERE NOT EXISTS (
     SELECT 1 FROM public.estoque_movimentacoes em
      WHERE em.produto_id = p.id
        AND em.tipo = 'saida'
        AND NOT em.estornado
        AND em.origem IN ('order_bump','venda','consumo','servico')
        AND em.data_movimentacao >= (CURRENT_TIMESTAMP - (p_dias || ' days')::interval)
   )
   ORDER BY p.nome;
END;
$$;

-- Compras por periodo
CREATE OR REPLACE FUNCTION public.rel_compras(p_inicio date, p_fim date)
RETURNS TABLE (
  data_movimentacao timestamptz,
  produto_id uuid,
  produto_nome text,
  quantidade integer,
  valor_unitario numeric,
  total numeric,
  fornecedor_nome text,
  nota_fiscal text,
  responsavel text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_usuario public.usuarios;
BEGIN
  v_usuario := public.current_usuario();
  IF v_usuario IS NULL OR NOT v_usuario.ativo OR v_usuario.papel <> 'master' THEN
    RAISE EXCEPTION 'Acesso restrito.';
  END IF;

  RETURN QUERY
  SELECT em.data_movimentacao, em.produto_id, p.nome,
         em.quantidade, em.valor_unitario,
         (em.quantidade * COALESCE(em.valor_unitario, 0))::numeric,
         f.nome, em.nota_fiscal, u.nome
    FROM public.estoque_movimentacoes em
    JOIN public.produtos p ON p.id = em.produto_id
    LEFT JOIN public.fornecedores f ON f.id = em.fornecedor_id
    LEFT JOIN public.usuarios u ON u.id = em.criado_por
   WHERE em.tipo = 'entrada'
     AND em.origem = 'manual'
     AND em.data_movimentacao >= p_inicio::timestamptz
     AND em.data_movimentacao < (p_fim + 1)::timestamptz
   ORDER BY em.data_movimentacao DESC;
END;
$$;

-- Perdas por periodo
CREATE OR REPLACE FUNCTION public.rel_perdas(p_inicio date, p_fim date)
RETURNS TABLE (
  data_movimentacao timestamptz,
  produto_id uuid,
  produto_nome text,
  quantidade integer,
  custo_unitario numeric,
  valor_total numeric,
  responsavel text,
  motivo text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_usuario public.usuarios;
BEGIN
  v_usuario := public.current_usuario();
  IF v_usuario IS NULL OR NOT v_usuario.ativo OR v_usuario.papel <> 'master' THEN
    RAISE EXCEPTION 'Acesso restrito.';
  END IF;

  RETURN QUERY
  SELECT em.data_movimentacao, em.produto_id, p.nome,
         em.quantidade, p.custo_compra,
         (em.quantidade * COALESCE(p.custo_compra, 0))::numeric,
         u.nome, em.motivo
    FROM public.estoque_movimentacoes em
    JOIN public.produtos p ON p.id = em.produto_id
    LEFT JOIN public.usuarios u ON u.id = em.criado_por
   WHERE em.tipo = 'saida'
     AND em.origem = 'perda'
     AND NOT em.estornado
     AND em.data_movimentacao >= p_inicio::timestamptz
     AND em.data_movimentacao < (p_fim + 1)::timestamptz
   ORDER BY em.data_movimentacao DESC;
END;
$$;

-- Custo dos servicos (custo total de produtos vinculados)
CREATE OR REPLACE FUNCTION public.rel_custo_servicos()
RETURNS TABLE (servico_id uuid, servico_nome text, custo_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_usuario public.usuarios;
BEGIN
  v_usuario := public.current_usuario();
  IF v_usuario IS NULL OR NOT v_usuario.ativo OR v_usuario.papel <> 'master' THEN
    RAISE EXCEPTION 'Acesso restrito.';
  END IF;

  RETURN QUERY
  SELECT s.id, s.nome,
         COALESCE(SUM(ps.quantidade * COALESCE(p.custo_compra, 0)), 0)::numeric
    FROM public.servicos s
    LEFT JOIN public.produto_servico ps ON ps.servico_id = s.id
    LEFT JOIN public.produtos p ON p.id = ps.produto_id
   GROUP BY s.id, s.nome
   ORDER BY custo_total DESC;
END;
$$;

-- -----------------------------------------------------------------------------
-- 11. TRIGGER: evoluir para incluir produtos de servico + cliente
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.processar_movimentacoes_agendamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_cliente_id uuid;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT cliente_id INTO v_cliente_id
    FROM public.agendamentos WHERE id = NEW.id;

  IF NEW.status = 'concluido' THEN
    -- Bumps: saida order_bump (1 unidade por linha)
    FOR r IN
      SELECT vb.id AS bump_id, vb.produto_id
        FROM public.vendas_bump vb
       WHERE vb.agendamento_id = NEW.id
         AND vb.produto_id IS NOT NULL
    LOOP
      PERFORM public.registrar_movimentacao_estoque(
        r.produto_id, 'saida', 1, 'order_bump',
        r.bump_id, 'Venda de order bump vinculada ao agendamento',
        true, NULL, NULL, NULL, NULL, NULL, v_cliente_id
      );
    END LOOP;

    -- Produtos vinculados ao servico: saida servico
    FOR r IN
      SELECT ps.produto_id, ps.quantidade
        FROM public.produto_servico ps
       WHERE ps.servico_id = NEW.servico_id
    LOOP
      PERFORM public.registrar_movimentacao_estoque(
        r.produto_id, 'saida', r.quantidade, 'servico',
        NEW.id, 'Produto utilizado em servico',
        true, NULL, NULL, NULL, NULL, NULL, v_cliente_id
      );
    END LOOP;

  ELSIF OLD.status = 'concluido' THEN
    -- Estorno: devolve bumps
    FOR r IN
      SELECT vb.id AS bump_id, vb.produto_id
        FROM public.vendas_bump vb
       WHERE vb.agendamento_id = NEW.id
         AND vb.produto_id IS NOT NULL
    LOOP
      PERFORM public.registrar_movimentacao_estoque(
        r.produto_id, 'entrada', 1, 'ajuste',
        r.bump_id, 'Estorno: agendamento saiu de concluido',
        true
      );
    END LOOP;

    -- Estorno: devolve produtos de servico
    FOR r IN
      SELECT ps.produto_id, ps.quantidade
        FROM public.produto_servico ps
       WHERE ps.servico_id = NEW.servico_id
    LOOP
      PERFORM public.registrar_movimentacao_estoque(
        r.produto_id, 'entrada', r.quantidade, 'ajuste',
        NEW.id, 'Estorno servico: agendamento saiu de concluido',
        true
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 12. PERMISSOES DE EXECUCAO (RPCs)
-- -----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.registrar_entrada_estoque(uuid, integer, numeric, uuid, text, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_entrada_estoque(uuid, integer, numeric, uuid, text, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_entrada_estoque(uuid, integer, numeric, uuid, text, timestamptz, text) TO service_role;

REVOKE ALL ON FUNCTION public.registrar_saida_estoque(uuid, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_saida_estoque(uuid, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_saida_estoque(uuid, integer, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.realizar_inventario(uuid, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.realizar_inventario(uuid, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.realizar_inventario(uuid, integer, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.kpis_estoque() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kpis_estoque() TO authenticated;
GRANT EXECUTE ON FUNCTION public.kpis_estoque() TO service_role;

REVOKE ALL ON FUNCTION public.ranking_vendas(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ranking_vendas(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ranking_vendas(integer) TO service_role;

REVOKE ALL ON FUNCTION public.ranking_consumo(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ranking_consumo(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ranking_consumo(integer) TO service_role;

REVOKE ALL ON FUNCTION public.rel_produtos_parados(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rel_produtos_parados(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rel_produtos_parados(integer) TO service_role;

REVOKE ALL ON FUNCTION public.rel_compras(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rel_compras(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rel_compras(date, date) TO service_role;

REVOKE ALL ON FUNCTION public.rel_perdas(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rel_perdas(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rel_perdas(date, date) TO service_role;

REVOKE ALL ON FUNCTION public.rel_custo_servicos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rel_custo_servicos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rel_custo_servicos() TO service_role;
