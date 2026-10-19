-- =============================================================================
-- SISTEMA DE ESTOQUE POR PRODUTO
-- Saldo derivado de movimentacoes imutaveis + baixa automatica de order bumps
-- no momento em que o agendamento transiciona para 'concluido'.
-- Idempotente: pode ser re-executado em esquema limpo ou ja migrado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. COLUNAS DE ESTOQUE EM produtos
-- -----------------------------------------------------------------------------

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS estoque_atual integer NOT NULL DEFAULT 0
  CONSTRAINT produtos_estoque_atual_check CHECK (estoque_atual >= 0);

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS estoque_minimo integer NOT NULL DEFAULT 0
  CONSTRAINT produtos_estoque_minimo_check CHECK (estoque_minimo >= 0);

-- -----------------------------------------------------------------------------
-- 2. TABELA DE MOVIMENTACOES DE ESTOQUE (imutavel por design: nunca se exclui)
--    estornado: marcador em "saidas" de venda/order_bump quando a venda foi
--    desfeita. Libera o slot unico permitindo nova saida no proximo 'concluido'.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.estoque_movimentacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbearia_id uuid NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  tipo text NOT NULL CONSTRAINT estoque_movimentacoes_tipo_check CHECK (tipo IN ('entrada','saida')),
  quantidade integer NOT NULL CONSTRAINT estoque_movimentacoes_quantidade_check CHECK (quantidade >= 1),
  estoque_anterior integer NOT NULL CONSTRAINT estoque_movimentacoes_anterior_check CHECK (estoque_anterior >= 0),
  estoque_posterior integer NOT NULL
    CONSTRAINT estoque_movimentacoes_posterior_check
    CHECK (
      estoque_posterior >= 0
      AND estoque_posterior = estoque_anterior + (CASE WHEN tipo = 'entrada' THEN quantidade ELSE -quantidade END)
    ),
  origem text NOT NULL
    CONSTRAINT estoque_movimentacoes_origem_check
    CHECK (origem IN ('manual','venda','order_bump','ajuste')),
  referencia_id uuid,
  estornado boolean NOT NULL DEFAULT false,
  observacao text,
  criado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Coluna de estado da saida (idempotencia de re-execucao em tabela ja criada).
ALTER TABLE public.estoque_movimentacoes
  ADD COLUMN IF NOT EXISTS estornado boolean NOT NULL DEFAULT false;

-- Idempotencia real de negocio: uma UNICA "saida ativa" por referencia
-- (ex.: vendas_bump). Ao estornar, a saida e marcada estornado=true e o slot
-- fica livre; entradas de ajuste nao sao unique (ciclos concluir/cancelar/...).
CREATE UNIQUE INDEX IF NOT EXISTS uq_estoque_movimentacoes_saida_ativa
  ON public.estoque_movimentacoes (referencia_id)
  WHERE tipo = 'saida' AND NOT estornado;

DROP INDEX IF EXISTS public.uq_estoque_movimentacoes_referencia_tipo;

CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_produto_data
  ON public.estoque_movimentacoes (produto_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_criado_em
  ON public.estoque_movimentacoes (created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. RLS em estoque_movimentacoes
--    master: tudo; barbeiro: somente leitura; anon: sem acesso.
-- -----------------------------------------------------------------------------

ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS master_all_estoque_movimentacoes ON public.estoque_movimentacoes;
CREATE POLICY master_all_estoque_movimentacoes
  ON public.estoque_movimentacoes
  FOR ALL
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'master'::text)
  WITH CHECK ((current_usuario()).ativo AND (current_usuario()).papel = 'master'::text);

DROP POLICY IF EXISTS barbeiro_select_estoque_movimentacoes ON public.estoque_movimentacoes;
CREATE POLICY barbeiro_select_estoque_movimentacoes
  ON public.estoque_movimentacoes
  FOR SELECT
  USING ((current_usuario()).ativo AND (current_usuario()).papel = 'barbeiro'::text);

-- -----------------------------------------------------------------------------
-- 4. NUCLEO: registrar_movimentacao_estoque
--    Ajusta produtos.estoque_atual e grava a movimentacao de forma atomica
--    (lock FOR UPDATE na linha do produto).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.registrar_movimentacao_estoque(
  p_produto_id uuid,
  p_tipo text,
  p_quantidade integer,
  p_origem text,
  p_referencia_id uuid DEFAULT NULL,
  p_observacao text DEFAULT NULL,
  p_ignorar_insuficiente boolean DEFAULT false
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
  v_ya_estornada boolean;
  v_mov public.estoque_movimentacoes;
BEGIN
  IF p_tipo NOT IN ('entrada','saida') THEN
    RAISE EXCEPTION 'Tipo de movimentacao invalida: %', p_tipo;
  END IF;

  IF p_quantidade < 1 THEN
    RAISE EXCEPTION 'Quantidade invalida: %', p_quantidade;
  END IF;

  IF p_origem NOT IN ('manual','venda','order_bump','ajuste') THEN
    RAISE EXCEPTION 'Origem de movimentacao invalida: %', p_origem;
  END IF;

  -- Reversao (entrada tipo 'ajuste'): so devolve ao estoque e estorna a saida
  -- original SE existir uma saida ativa para a mesma referencia.
  IF p_tipo = 'entrada' AND p_origem = 'ajuste' AND p_referencia_id IS NOT NULL THEN
    SELECT em.id
      INTO v_saida_id
      FROM public.estoque_movimentacoes em
     WHERE em.referencia_id = p_referencia_id AND em.tipo = 'saida' AND NOT em.estornado
     ORDER BY em.created_at DESC
     LIMIT 1;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    UPDATE public.estoque_movimentacoes
       SET estornado = true
     WHERE id = v_saida_id;
  END IF;

  -- Saida de venda/order_bump ja ativa para a referencia => nada a fazer
  -- (idempotencia do mesmo evento de conclusao / corrida paralela).
  IF p_tipo = 'saida' AND p_referencia_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
        FROM public.estoque_movimentacoes em
       WHERE em.referencia_id = p_referencia_id AND em.tipo = 'saida' AND NOT em.estornado
    ) INTO v_ya_estornada;

    IF v_ya_estornada THEN
      RETURN NULL;
    END IF;
  END IF;

  -- Lock da linha do produto para evitar corrida entre movimentacoes paralelas.
  SELECT barbearia_id, estoque_atual
    INTO v_barbearia_id, v_anterior
    FROM public.produtos
   WHERE id = p_produto_id
     FOR UPDATE;

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
     SET estoque_atual = v_posterior
   WHERE id = p_produto_id;

  INSERT INTO public.estoque_movimentacoes (
    barbearia_id, produto_id, tipo, quantidade, estoque_anterior, estoque_posterior,
    origem, referencia_id, estornado, observacao, criado_por
  ) VALUES (
    v_barbearia_id, p_produto_id, p_tipo, p_quantidade, v_anterior, v_posterior,
    p_origem, p_referencia_id, false, p_observacao, (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  )
  ON CONFLICT (referencia_id) WHERE tipo = 'saida' AND NOT estornado DO NOTHING
  RETURNING * INTO v_mov;

  RETURN v_mov;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. RPC PUBLICA: movimentar_estoque (entrada/saida manual - somente MASTER)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.movimentar_estoque(
  p_produto_id uuid,
  p_tipo text,
  p_quantidade integer,
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

  IF v_usuario IS NULL OR NOT v_usuario.ativo OR v_usuario.papel <> 'master'::text THEN
    RAISE EXCEPTION 'Acesso restrito: somente o master pode movimentar estoque manualmente.';
  END IF;

  v_mov := public.registrar_movimentacao_estoque(
    p_produto_id,
    p_tipo,
    p_quantidade,
    'manual',
    NULL,
    p_observacao,
    false
  );

  RETURN v_mov;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. TRIGGER: baixa/estorno automatico de order bumps quando o agendamento
--    entra ou sai do status 'concluido' (mesmo criterio do financeiro).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.processar_movimentacoes_agendamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'concluido'::text THEN
    -- Baixa de estoque para cada bump vendido no agendamento (1 unidade por linha).
    FOR r IN
      SELECT vb.id AS bump_id, vb.produto_id
        FROM public.vendas_bump vb
       WHERE vb.agendamento_id = NEW.id
         AND vb.produto_id IS NOT NULL
    LOOP
      PERFORM public.registrar_movimentacao_estoque(
        r.produto_id,
        'saida',
        1,
        'order_bump',
        r.bump_id,
        'Venda de order bump vinculada ao agendamento',
        true
      );
    END LOOP;
  ELSIF OLD.status = 'concluido'::text THEN
    -- Estorno: devolve ao estoque SEM apagar historico (nova movimentacao de ajuste).
    FOR r IN
      SELECT vb.id AS bump_id, vb.produto_id
        FROM public.vendas_bump vb
       WHERE vb.agendamento_id = NEW.id
         AND vb.produto_id IS NOT NULL
    LOOP
      PERFORM public.registrar_movimentacao_estoque(
        r.produto_id,
        'entrada',
        1,
        'ajuste',
        r.bump_id,
        'Estorno: agendamento saiu de concluido',
        true
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_estoque_vendas_agendamento'
  ) THEN
    CREATE TRIGGER trg_estoque_vendas_agendamento
      AFTER UPDATE ON public.agendamentos
      FOR EACH ROW
      EXECUTE FUNCTION public.processar_movimentacoes_agendamento();
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. PERMISSOES: somente authenticated (master logado) executa o RPC manual.
--    Nucleo e trigger ficam restritos (executados internamente / definer).
-- -----------------------------------------------------------------------------

GRANT SELECT ON public.estoque_movimentacoes TO authenticated;
GRANT SELECT ON public.estoque_movimentacoes TO service_role;

REVOKE ALL ON FUNCTION public.movimentar_estoque(uuid, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.movimentar_estoque(uuid, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.movimentar_estoque(uuid, text, integer, text) TO service_role;

REVOKE ALL ON FUNCTION public.registrar_movimentacao_estoque(uuid, text, integer, text, uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_movimentacao_estoque(uuid, text, integer, text, uuid, text, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.processar_movimentacoes_agendamento() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.processar_movimentacoes_agendamento() TO service_role;