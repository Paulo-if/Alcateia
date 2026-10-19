-- ============================================================================
-- AlcateiaBarber — SEED LOCAL (volume realista p/ testes)  [V2]
-- ============================================================================
-- Roda automaticamente no `supabase db reset` (config [db.seed]).
-- SOMENTE ambiente local (Docker). Nada aqui toca o banco remoto.
-- Tudo é marcado como TESTE e é DETERMINÍSTICO (sem random()): os mesmos
-- registros/id/valores são gerados a cada reset -> contagens conferíveis.
-- Idempotente (ON CONFLICT DO NOTHING / filtros de mitigação).
--
-- RESUMO DO VOLUME:
--   * 50 clientes (@teste.com), telefones 11 dígitos únicos.
--   * 225 agendamentos: 209 nos últimos 6 meses (Abr..Set) com tendência de
--     crescimento e preenchimento de Set 5 a 30 (seção 4b), + 16 futuros
--     (próximos 15 dias, agendado/confirmado).
--   * Distribuição por barbeiro não uniforme: P1=45, P2=40, P3=37, P4=36
--     (histórico base) + 51 extra em Set (rotaciona os 4 ativos).
--   * Status realista (passado): ~91% concluido + ~9% cancelado/nao_compareceu.
--     Nenhum 'agendado'/'confirmado' no passado (webhook de confirmação
--     automática ainda não existe — passado só concluído/cancelado/faltou).
--     Futuros (16) permanecem agendado/confirmado.
--   * vendas_bump = ~30% dos concluídos, usando os 4 produtos marcados como
--     Order Bump na migration 20260905000003 (preco_bump como valor pago).
--   * transacoes_financeiras: 6 meses x 5 lançamentos (aluguel/energia/
--     material + 2 receitas avulsas por mês) = 30, + 5 extras em Set 13-30
--     (seção 7b: 3 despesas + 2 receitas).
--   * Logins de teste: master@alcatei.test / master123 e barbeiro@alcatei.test
--     / barbeiro123 (reutilizados — não duplicados).
--   * 26 produtos do catálogo com estoque inicial (seção 9): ~65% normal,
--     ~19% estoque baixo, ~12% esgotados, + 3 vencendo (30 dias) e 2 vencidos;
--     custo_compra e data_validade preenchidos (datas relativas a CURRENT_DATE).
--
-- FÓRMULA DE RECEITA (financeService): concluído(valor_servico) + bump(valor_pago)
-- + transacoes 'receita' SEM agendamento vinculado. Despesa = transacoes 'despesa'.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PROFISSIONAIS (4 ativos + 1 inativo p/ provar bloqueio por active=false)
-- ============================================================================
INSERT INTO profissionais (id, barbearia_id, name, specialty, avatar_url, active)
VALUES
  ('b0000001-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001', 'Barbeiro Teste 1', 'Corte + barba', NULL, true),
  ('b0000002-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000001', 'Barbeiro Teste 2', 'Degradê', NULL, true),
  ('b0000003-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000001', 'Barbeiro Teste 3', 'Barboterapia', NULL, true),
  ('b0000004-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000001', 'Barbeiro Teste 4', 'Cortes modernos', NULL, true),
  ('b0000005-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000001', 'Barbeiro Teste 5 (inativo)', 'Inativo - não deve aparecer', NULL, false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. EXPEDIENTE — seg a sex 09:00-18:00 (inclusive p/ o inativo)
-- ============================================================================
INSERT INTO professional_schedules (professional_id, barbearia_id, day_of_week, start_time, end_time, active)
SELECT p.id::uuid, '00000000-0000-0000-0000-000000000001', d.dow, '09:00'::time, '18:00'::time, true
FROM (VALUES
  ('b0000001-0000-4000-8000-000000000001'),
  ('b0000002-0000-4000-8000-000000000002'),
  ('b0000003-0000-4000-8000-000000000003'),
  ('b0000004-0000-4000-8000-000000000004'),
  ('b0000005-0000-4000-8000-000000000005')
) AS p(id)
CROSS JOIN (SELECT generate_series(1, 5) AS dow) d
ON CONFLICT (professional_id, day_of_week, start_time) DO NOTHING;

-- ============================================================================
-- 3. CLIENTES (50) — nomes brasileiros comuns, e-mail @teste.com, fone 11 díg
-- ============================================================================
INSERT INTO clientes (id, barbearia_id, nome, telefone, email)
SELECT
  ('c' || lpad(to_hex(n), 7, '0') || '-0000-4000-8000-' || lpad(to_hex(n), 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000001',
  (ARRAY[
    'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Souza', 'Carlos Pereira',
    'Juliana Lima', 'Marcos Silva', 'Fernanda Costa', 'Rafael Almeida', 'Camila Nascimento',
    'Bruno Carvalho', 'Larissa Gomes', 'Diego Martins', 'Patrícia Rocha', 'Thiago Barbosa',
    'Vanessa Ribeiro', 'Rodrigo Cardoso', 'Amanda Ferreira', 'Felipe Moreira', 'Bianca Araújo',
    'Gustavo Pinto', 'Letícia Correia', 'André Ramos', 'Mariana Teixeira', 'Vinícius Mendes',
    'Carina Freitas', 'Leonardo Sales', 'Taís Barros', 'Fábio Antunes', 'Natália Campos',
    'Henrique Azevedo', 'Paula Monteiro', 'Matheus Rezende', 'Jéssica Lopes', 'Ronaldo Vieira',
    'Débora Castilho', 'Caio Sanches', 'Beatriz Fonseca', 'Igor Machado', 'Sabrina Teles',
    'Murilo Cordeiro', 'Isadora Sant Ana', 'Renato Bittencourt', 'Aline Vasconcelos', 'Otávio Nogueira',
    'Gabriela Dantas', 'Wesley Figueiredo', 'Júlia Barreto', 'Emerson Coutinho', 'Luciana Andrade'
  ])[n],
  '1197101' || lpad(n::text, 4, '0'),
  lower(regexp_replace(
    translate(nome,
      'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöùûüç',
      'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'),
    '[^a-z ]', '', 'g')
  ) || '@teste.com'
FROM (
  SELECT n,
         (ARRAY[
           'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Souza', 'Carlos Pereira',
           'Juliana Lima', 'Marcos Silva', 'Fernanda Costa', 'Rafael Almeida', 'Camila Nascimento',
           'Bruno Carvalho', 'Larissa Gomes', 'Diego Martins', 'Patrícia Rocha', 'Thiago Barbosa',
           'Vanessa Ribeiro', 'Rodrigo Cardoso', 'Amanda Ferreira', 'Felipe Moreira', 'Bianca Araújo',
           'Gustavo Pinto', 'Letícia Correia', 'André Ramos', 'Mariana Teixeira', 'Vinícius Mendes',
           'Carina Freitas', 'Leonardo Sales', 'Taís Barros', 'Fábio Antunes', 'Natália Campos',
           'Henrique Azevedo', 'Paula Monteiro', 'Matheus Rezende', 'Jéssica Lopes', 'Ronaldo Vieira',
           'Débora Castilho', 'Caio Sanches', 'Beatriz Fonseca', 'Igor Machado', 'Sabrina Teles',
           'Murilo Cordeiro', 'Isadora Sant Ana', 'Renato Bittencourt', 'Aline Vasconcelos', 'Otávio Nogueira',
           'Gabriela Dantas', 'Wesley Figueiredo', 'Júlia Barreto', 'Emerson Coutinho', 'Luciana Andrade'
         ])[n] AS nome
  FROM generate_series(1, 50) AS n
) c
ON CONFLICT (barbearia_id, telefone) DO NOTHING;

-- ============================================================================
-- 4. AGENDAMENTOS — histórico (158) nos últimos 6 meses + FUTUROS (16)
--    Distribuição por barbeiro P1=45 P2=40 P3=37 P4=36, tendência de crescimento:
--    Abr: 23 | Mai: 27 | Jun: 28 | Jul: 31 | Ago: 33 | Set: 67 (16 + 51 na 4b)
--    Um agendamento por (barbeiro, dia) -> nunca viola o GiST no_overlap.
-- ============================================================================
WITH svc AS (
  SELECT * FROM (VALUES
    (0,    119, '62515ff5-ae30-4fd9-92e1-aaa4950e23e5', 15.00, 10),  -- Acabamento (pezinho)
    (120,  269, 'e6d346cc-f850-4d59-9815-bebe03caf0d8', 40.00, 40),  -- Barba (barboterapia)
    (270,  329, '160a83b1-ae40-4999-beeb-77a9e7fad248', 25.00, 30),  -- Barba Express
    (330,  569, '4253a743-ce63-4de1-bb4d-bdf3cb2519f2', 40.00, 40),  -- Corte
    (570,  629, '646e20ab-ba35-429c-af6b-22c15be53049', 20.00, 10),  -- Depilação Nasal
    (630,  679, '0d2fba36-bb3b-4253-afdf-bbc485a5fcdc', 25.00, 10),  -- Hidratação
    (680,  739, '560c4c96-64c0-4452-a6bf-514aa93f599a', 15.00, 10),  -- Sobrancelha
    (740,  789, '6059cef6-c241-43e4-be6f-d36f8e5ea4a4', 60.00, 50),  -- CORTE + HIDRATAÇÃO
    (790,  909, '223b2f7d-a810-40ec-9d32-be55cd73e815', 75.00, 60),  -- CORTE + BARBA
    (910,  949, '61f18c44-8fbc-43ee-b5b6-4420dc096f59', 90.00, 70),  -- CORTE + BARBA + SOBRANCELHA
    (950,  979, '6d6c7c31-3606-4a59-976d-08ecabe9ba6c', 55.00, 50),  -- CORTE + SOBRANCELHA
    (980,  999, '972e1915-f6ee-416a-b415-7d24922a4d89', 130.00, 90)  -- combo completo (raro)
  ) AS t(lo, hi, id, preco, dur)
),
grid AS (
  SELECT
    p, idx,
    CASE p
      WHEN 1 THEN CASE WHEN idx < 8  THEN 0 WHEN idx < 16 THEN 1 WHEN idx < 24 THEN 2 WHEN idx < 33 THEN 3 WHEN idx < 42 THEN 4 ELSE 5 END
      WHEN 2 THEN CASE WHEN idx < 7  THEN 0 WHEN idx < 14 THEN 1 WHEN idx < 21 THEN 2 WHEN idx < 29 THEN 3 WHEN idx < 37 THEN 4 ELSE 5 END
      WHEN 3 THEN CASE WHEN idx < 6  THEN 0 WHEN idx < 12 THEN 1 WHEN idx < 19 THEN 2 WHEN idx < 26 THEN 3 WHEN idx < 34 THEN 4 ELSE 5 END
      ELSE        CASE WHEN idx < 6  THEN 0 WHEN idx < 12 THEN 1 WHEN idx < 18 THEN 2 WHEN idx < 25 THEN 3 WHEN idx < 33 THEN 4 ELSE 5 END
    END AS mo,
    idx - CASE p
      WHEN 1 THEN CASE WHEN idx < 8  THEN 0 WHEN idx < 16 THEN 7  WHEN idx < 24 THEN 15 WHEN idx < 33 THEN 23 WHEN idx < 42 THEN 32 ELSE 41 END
      WHEN 2 THEN CASE WHEN idx < 7  THEN 0 WHEN idx < 14 THEN 6  WHEN idx < 21 THEN 13 WHEN idx < 29 THEN 20 WHEN idx < 37 THEN 28 ELSE 36 END
      WHEN 3 THEN CASE WHEN idx < 6  THEN 0 WHEN idx < 12 THEN 5  WHEN idx < 19 THEN 11 WHEN idx < 26 THEN 18 WHEN idx < 34 THEN 25 ELSE 33 END
      ELSE        CASE WHEN idx < 6  THEN 0 WHEN idx < 12 THEN 5  WHEN idx < 18 THEN 11 WHEN idx < 25 THEN 17 WHEN idx < 33 THEN 24 ELSE 32 END
    END AS mi
  FROM generate_series(1, 4) AS g(p),
       generate_series(1, 60) AS inv(idx)
  WHERE (p = 1 AND idx <= 45) OR (p = 2 AND idx <= 40) OR (p = 3 AND idx <= 37) OR (p = 4 AND idx <= 36)
),
rows AS (
  SELECT
    g.p, g.idx, g.mo, g.mi,
    (g.idx * 47 + g.p * 13) % 100 AS r,
    (g.idx * 23 + g.p * 5) % 1000 AS s,
    svc.id::uuid AS servico_id, svc.preco, svc.dur,
    (('b000000' || g.p || '-0000-4000-8000-00000000000' || g.p)::uuid) AS pro_id,
    (('a' || lpad(to_hex(g.p * 1000 + g.idx), 7, '0') || '-0000-4000-8000-' || lpad(to_hex(g.p * 1000 + g.idx), 12, '0'))::uuid) AS appt_id,
    (
      ('c' || lpad(to_hex(CASE WHEN g.idx <= 6 THEN (g.p - 1) * 6 + g.idx ELSE 25 + ((g.idx * 31 + g.p * 7) % 26) END), 7, '0')
          || '-0000-4000-8000-' || lpad(to_hex(CASE WHEN g.idx <= 6 THEN (g.p - 1) * 6 + g.idx ELSE 25 + ((g.idx * 31 + g.p * 7) % 26) END), 12, '0'))::uuid
    ) AS cli_id,
    (
      ((date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') - ((5 - g.mo) * interval '1 month'))::date
        + (CASE WHEN g.mo = 5 THEN (g.mi - 1) % 4 ELSE g.mi * 3 END)
        + make_time(9 + ((g.idx + g.mi) % 6), 30 * ((g.mi + g.p) % 2), 0)
      ) AT TIME ZONE 'America/Sao_Paulo'
    ) AS t,
    CASE WHEN (g.idx * 47 + g.p * 13) % 100 < 91 THEN 'concluido'
         WHEN (g.idx * 47 + g.p * 13) % 100 < 96 THEN 'cancelado'
         ELSE 'nao_compareceu' END AS st
  FROM grid g
  JOIN svc ON (g.idx * 23 + g.p * 5) % 1000 BETWEEN svc.lo AND svc.hi
)
INSERT INTO agendamentos (
  id, barbearia_id, cliente_id, servico_id, professional_id,
  data_inicio, data_fim, status, valor_servico, observacoes, payment_method, payment_status
)
SELECT
  appt_id, '00000000-0000-0000-0000-000000000001', cli_id, servico_id, pro_id,
  t, t + (dur * interval '1 minute'), st, preco, 'TESTE',
  CASE WHEN st = 'concluido' THEN (CASE WHEN idx % 4 = 1 THEN 'online' ELSE 'in_person' END)
       WHEN st = 'confirmado' THEN 'online' ELSE 'in_person' END,
  CASE WHEN st = 'concluido' THEN 'paid'
       WHEN st = 'cancelado' THEN 'refunded'
       WHEN st = 'nao_compareceu' THEN 'failed' ELSE 'pending' END
FROM rows
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4b. AGENDAMENTOS — preenchimento de Set 5 a 30 (intervalo que faltava)
--     +51 'concluido' (2-4 por dia útil, 18 dias úteis), cobrindo os 12
--     serviços do catálogo e rotacionando os 4 barbeiros ativos, para a
--     "Evolução Financeira" não ficar achatada após o dia 13.
--     Em Set 7-11 (dias com AGENDAMENTOS FUTUROS às 10-14h) os novos entram
--     às 15h+ para não violar o GiST no_overlap_agendamentos.
--     IDs na faixa 5001-5120 (hex a0001389..a0001400) — sem conflito com os
--     existentes (máx a0001078).
-- ============================================================================
WITH svc AS (
  SELECT * FROM (VALUES
    (0,  '62515ff5-ae30-4fd9-92e1-aaa4950e23e5', 15.00, 10),
    (1,  'e6d346cc-f850-4d59-9815-bebe03caf0d8', 40.00, 40),
    (2,  '160a83b1-ae40-4999-beeb-77a9e7fad248', 25.00, 30),
    (3,  '4253a743-ce63-4de1-bb4d-bdf3cb2519f2', 40.00, 40),
    (4,  '646e20ab-ba35-429c-af6b-22c15be53049', 20.00, 10),
    (5,  '0d2fba36-bb3b-4253-afdf-bbc485a5fcdc', 25.00, 10),
    (6,  '560c4c96-64c0-4452-a6bf-514aa93f599a', 15.00, 10),
    (7,  '6059cef6-c241-43e4-be6f-d36f8e5ea4a4', 60.00, 50),
    (8,  '223b2f7d-a810-40ec-9d32-be55cd73e815', 75.00, 60),
    (9,  '61f18c44-8fbc-43ee-b5b6-4420dc096f59', 90.00, 70),
    (10, '6d6c7c31-3606-4a59-976d-08ecabe9ba6c', 55.00, 50),
    (11, '972e1915-f6ee-416a-b415-7d24922a4d89', 130.00, 90)
  ) AS t(idx, id, preco, dur)
),
days AS (
  SELECT dd AS day_offset
  FROM generate_series(4, 29) AS dd
  WHERE EXTRACT(DOW FROM (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')::date + dd))::int BETWEEN 1 AND 5
),
slots AS (
  SELECT
    d.day_offset,
    s.slot,
    ((d.day_offset + s.slot - 1) % 4) + 1 AS pro_num,
    ((d.day_offset * 13 + s.slot * 7) % 50) + 1 AS cli_num,
    (d.day_offset * 7 + s.slot * 5) % 12 AS svc_idx
  FROM days d
  CROSS JOIN generate_series(1, 4) AS s(slot)
  WHERE s.slot <= CASE (d.day_offset * 7) % 5
    WHEN 0 THEN 3 WHEN 1 THEN 4 WHEN 2 THEN 2 WHEN 3 THEN 3 ELSE 2
  END
),
rows AS (
  SELECT
    s.day_offset,
    s.slot,
    s.pro_num,
    s.cli_num,
    svc.id::uuid AS servico_id,
    svc.preco,
    svc.dur,
    (
      (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')::date + s.day_offset
        + make_time(
            CASE WHEN s.day_offset BETWEEN 6 AND 10 THEN 15 + ((s.slot - 1) / 2)
                 ELSE 9 + ((s.day_offset * 3 + s.slot) % 8) END,
            CASE WHEN s.day_offset BETWEEN 6 AND 10 THEN 30 * ((s.slot - 1) % 2)
                 ELSE 30 * ((s.day_offset + s.slot) % 2) END,
            0)
      ) AT TIME ZONE 'America/Sao_Paulo'
    ) AS t
  FROM slots s
  JOIN svc ON svc.idx = s.svc_idx
)
INSERT INTO agendamentos (
  id, barbearia_id, cliente_id, servico_id, professional_id,
  data_inicio, data_fim, status, valor_servico, observacoes, payment_method, payment_status
)
SELECT
  ('a' || lpad(to_hex(5000 + day_offset * 4 + slot), 7, '0') || '-0000-4000-8000-' || lpad(to_hex(5000 + day_offset * 4 + slot), 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000001',
  ('c' || lpad(to_hex(cli_num), 7, '0') || '-0000-4000-8000-' || lpad(to_hex(cli_num), 12, '0'))::uuid,
  servico_id,
  ('b000000' || pro_num || '-0000-4000-8000-00000000000' || pro_num)::uuid,
  t,
  t + (dur * interval '1 minute'),
  'concluido',
  preco,
  'TESTE',
  CASE WHEN slot % 4 = 1 THEN 'online' ELSE 'in_person' END,
  'paid'
FROM rows
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. AGENDAMENTOS FUTUROS (16) — próximos 15 dias (7 a 11 de setembro local)
-- ============================================================================
INSERT INTO agendamentos (
  id, barbearia_id, cliente_id, servico_id, professional_id,
  data_inicio, data_fim, status, valor_servico, observacoes, payment_method, payment_status
)
SELECT
  ('a' || lpad(to_hex(((jj % 4) + 1) * 1000 + 200 + jj), 7, '0') || '-0000-4000-8000-' || lpad(to_hex(((jj % 4) + 1) * 1000 + 200 + jj), 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000001',
  ('c' || lpad(to_hex(25 + ((jj * 5 + ((jj % 4) + 1) * 2) % 26)), 7, '0') || '-0000-4000-8000-' || lpad(to_hex(25 + ((jj * 5 + ((jj % 4) + 1) * 2) % 26)), 12, '0'))::uuid,
  (CASE jj % 3 WHEN 0 THEN '4253a743-ce63-4de1-bb4d-bdf3cb2519f2' WHEN 1 THEN '223b2f7d-a810-40ec-9d32-be55cd73e815' ELSE 'e6d346cc-f850-4d59-9815-bebe03caf0d8' END)::uuid,
  ('b000000' || ((jj % 4) + 1) || '-0000-4000-8000-00000000000' || ((jj % 4) + 1))::uuid,
  ((date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo'))::date + (7 + ((jj - 1) % 5)) + make_time(10 + ((jj - 1) % 5), 0, 0)) AT TIME ZONE 'America/Sao_Paulo',
  ((date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo'))::date + (7 + ((jj - 1) % 5)) + make_time(10 + ((jj - 1) % 5), 0, 0)) AT TIME ZONE 'America/Sao_Paulo' + CASE jj % 3 WHEN 0 THEN interval '40 minutes' WHEN 1 THEN interval '60 minutes' ELSE interval '40 minutes' END,
  CASE WHEN jj % 4 = 0 THEN 'confirmado' ELSE 'agendado' END,
  CASE jj % 3 WHEN 0 THEN 40.00 WHEN 1 THEN 75.00 ELSE 40.00 END,
  'TESTE',
  CASE WHEN jj % 4 = 0 THEN 'online' ELSE 'in_person' END,
  'pending'
FROM generate_series(1, 16) AS f(jj)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. VENDAS BUMP — ~30% dos concluídos, usando os 4 Order Bumps da migration 03
-- ============================================================================
WITH svc AS (
  SELECT * FROM (VALUES
    (0,    119, '62515ff5-ae30-4fd9-92e1-aaa4950e23e5', 15.00, 10),
    (120,  269, 'e6d346cc-f850-4d59-9815-bebe03caf0d8', 40.00, 40),
    (270,  329, '160a83b1-ae40-4999-beeb-77a9e7fad248', 25.00, 30),
    (330,  569, '4253a743-ce63-4de1-bb4d-bdf3cb2519f2', 40.00, 40),
    (570,  629, '646e20ab-ba35-429c-af6b-22c15be53049', 20.00, 10),
    (630,  679, '0d2fba36-bb3b-4253-afdf-bbc485a5fcdc', 25.00, 10),
    (680,  739, '560c4c96-64c0-4452-a6bf-514aa93f599a', 15.00, 10),
    (740,  789, '6059cef6-c241-43e4-be6f-d36f8e5ea4a4', 60.00, 50),
    (790,  909, '223b2f7d-a810-40ec-9d32-be55cd73e815', 75.00, 60),
    (910,  949, '61f18c44-8fbc-43ee-b5b6-4420dc096f59', 90.00, 70),
    (950,  979, '6d6c7c31-3606-4a59-976d-08ecabe9ba6c', 55.00, 50),
    (980,  999, '972e1915-f6ee-416a-b415-7d24922a4d89', 130.00, 90)
  ) AS t(lo, hi, id, preco, dur)
),
grid AS (
  SELECT
    p, idx,
    CASE p
      WHEN 1 THEN CASE WHEN idx < 8  THEN 0 WHEN idx < 16 THEN 1 WHEN idx < 24 THEN 2 WHEN idx < 33 THEN 3 WHEN idx < 42 THEN 4 ELSE 5 END
      WHEN 2 THEN CASE WHEN idx < 7  THEN 0 WHEN idx < 14 THEN 1 WHEN idx < 21 THEN 2 WHEN idx < 29 THEN 3 WHEN idx < 37 THEN 4 ELSE 5 END
      WHEN 3 THEN CASE WHEN idx < 6  THEN 0 WHEN idx < 12 THEN 1 WHEN idx < 19 THEN 2 WHEN idx < 26 THEN 3 WHEN idx < 34 THEN 4 ELSE 5 END
      ELSE        CASE WHEN idx < 6  THEN 0 WHEN idx < 12 THEN 1 WHEN idx < 18 THEN 2 WHEN idx < 25 THEN 3 WHEN idx < 33 THEN 4 ELSE 5 END
    END AS mo,
    idx - CASE p
      WHEN 1 THEN CASE WHEN idx < 8  THEN 0 WHEN idx < 16 THEN 7  WHEN idx < 24 THEN 15 WHEN idx < 33 THEN 23 WHEN idx < 42 THEN 32 ELSE 41 END
      WHEN 2 THEN CASE WHEN idx < 7  THEN 0 WHEN idx < 14 THEN 6  WHEN idx < 21 THEN 13 WHEN idx < 29 THEN 20 WHEN idx < 37 THEN 28 ELSE 36 END
      WHEN 3 THEN CASE WHEN idx < 6  THEN 0 WHEN idx < 12 THEN 5  WHEN idx < 19 THEN 11 WHEN idx < 26 THEN 18 WHEN idx < 34 THEN 25 ELSE 33 END
      ELSE        CASE WHEN idx < 6  THEN 0 WHEN idx < 12 THEN 5  WHEN idx < 18 THEN 11 WHEN idx < 25 THEN 17 WHEN idx < 33 THEN 24 ELSE 32 END
    END AS mi
  FROM generate_series(1, 4) AS g(p),
       generate_series(1, 60) AS inv(idx)
  WHERE (p = 1 AND idx <= 45) OR (p = 2 AND idx <= 40) OR (p = 3 AND idx <= 37) OR (p = 4 AND idx <= 36)
),
rows AS (
  SELECT
    g.p, g.idx, svc.id AS servico_id,
    (('a' || lpad(to_hex(g.p * 1000 + g.idx), 7, '0') || '-0000-4000-8000-' || lpad(to_hex(g.p * 1000 + g.idx), 12, '0'))::uuid) AS appt_id,
    CASE WHEN (g.idx * 47 + g.p * 13) % 100 < 91 THEN 'concluido'
         WHEN (g.idx * 47 + g.p * 13) % 100 < 96 THEN 'cancelado'
         ELSE 'nao_compareceu' END AS st
  FROM grid g
  JOIN svc ON (g.idx * 23 + g.p * 5) % 1000 BETWEEN svc.lo AND svc.hi
)
INSERT INTO vendas_bump (id, barbearia_id, agendamento_id, produto_id, valor_pago)
SELECT
  ('e' || lpad(to_hex(p * 1000 + idx), 7, '0') || '-0000-4000-8000-' || lpad(to_hex(p * 1000 + idx), 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000001',
  appt_id,
  (ARRAY[
    'b965f22c-ff40-4e40-b0c6-7cf0a4b2d0cd',  -- Balm (bump 30)
    '0c513adf-9b78-4cf0-873b-34e27f5e2511',  -- Óleo Para Barba (bump 60)
    '298a6dd5-cb43-4014-898c-60b5a03b6a31',  -- Leave-in (bump 70)
    '7686d323-a1a4-4506-a933-09061346137a'   -- Óleo Spray (bump 35)
  ])[(idx + p) % 4 + 1]::uuid,
  (ARRAY[30.00, 60.00, 70.00, 35.00])[(idx + p) % 4 + 1]
FROM rows
WHERE st = 'concluido' AND (idx * 3 + p) % 10 < 3
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6b. VENDAS BUMP — para os agendamentos da seção 4b (~30% dos concluídos)
--     IDs na faixa 9025-9120 (hex e0002341..e00023a0) — sem conflito com os
--     existentes (máx e0000fc4).
-- ============================================================================
WITH grid AS (
  SELECT
    d.day_offset,
    s.slot,
    (d.day_offset * 3 + s.slot) % 10 < 3 AS has_bump
  FROM generate_series(4, 29) AS d(day_offset)
  CROSS JOIN generate_series(1, 4) AS s(slot)
  WHERE EXTRACT(DOW FROM (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')::date + d.day_offset))::int BETWEEN 1 AND 5
    AND s.slot <= CASE (d.day_offset * 7) % 5
      WHEN 0 THEN 3 WHEN 1 THEN 4 WHEN 2 THEN 2 WHEN 3 THEN 3 ELSE 2
    END
)
INSERT INTO vendas_bump (id, barbearia_id, agendamento_id, produto_id, valor_pago)
SELECT
  ('e' || lpad(to_hex(9000 + day_offset * 4 + slot), 7, '0') || '-0000-4000-8000-' || lpad(to_hex(9000 + day_offset * 4 + slot), 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000001',
  ('a' || lpad(to_hex(5000 + day_offset * 4 + slot), 7, '0') || '-0000-4000-8000-' || lpad(to_hex(5000 + day_offset * 4 + slot), 12, '0'))::uuid,
  (ARRAY[
    'b965f22c-ff40-4e40-b0c6-7cf0a4b2d0cd',  -- Balm (bump 30)
    '0c513adf-9b78-4cf0-873b-34e27f5e2511',  -- Óleo Para Barba (bump 60)
    '298a6dd5-cb43-4014-898c-60b5a03b6a31',  -- Leave-in (bump 70)
    '7686d323-a1a4-4506-a933-09061346137a'   -- Óleo Spray (bump 35)
  ])[(day_offset + slot) % 4 + 1]::uuid,
  (ARRAY[30.00, 60.00, 70.00, 35.00])[(day_offset + slot) % 4 + 1]
FROM grid
WHERE has_bump
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. TRANSAÇÕES FINANCEIRAS (30) — 6 meses x 5 lançamentos/mês
--    Despesas: aluguel(1.500), energia, material  •  Receitas avulsas: 2/mês
-- ============================================================================
INSERT INTO transacoes_financeiras (
  id, barbearia_id, tipo, valor, descricao, categoria, agendamento_id, created_at
)
SELECT
  ('f' || lpad(to_hex(n), 7, '0') || '-0000-4000-8000-' || lpad(to_hex(n), 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000001',
  CASE tipo WHEN 3 THEN 'receita' WHEN 4 THEN 'receita' ELSE 'despesa' END,
  CASE tipo
    WHEN 0 THEN 1500.00
    WHEN 1 THEN (ARRAY[145.00, 168.00, 155.00, 182.00, 196.00, 208.00])[mo + 1]
    WHEN 2 THEN (ARRAY[180.00, 95.00, 210.00, 160.00, 235.00, 120.00])[mo + 1]
    WHEN 3 THEN (ARRAY[120.00, 90.00, 150.00, 110.00, 170.00, 95.00])[mo + 1]
    ELSE        (ARRAY[45.00, 50.00, 40.00, 75.00, 55.00, 60.00])[mo + 1] END,
  CASE tipo
    WHEN 0 THEN 'Aluguel (TESTE)'
    WHEN 1 THEN 'Energia (TESTE)'
    WHEN 2 THEN 'Material de estoque (TESTE)'
    WHEN 3 THEN 'Venda avulsa produto (TESTE)'
    ELSE        'Venda avulsa serviço (TESTE)' END,
  CASE tipo WHEN 3 THEN 'produto' WHEN 4 THEN 'servico' ELSE 'despesa_geral' END,
  NULL,
  (
    ((date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') - ((5 - mo) * interval '1 month'))::date
      + CASE
          WHEN tipo = 0 THEN 0
          WHEN tipo = 1 THEN (CASE WHEN mo = 5 THEN 1 ELSE 17 END)
          WHEN tipo = 2 THEN (CASE WHEN mo = 5 THEN 2 ELSE 8 END)
          WHEN tipo = 3 THEN (CASE WHEN mo = 5 THEN 0 ELSE 6 END)
          ELSE               (CASE WHEN mo = 5 THEN 1 ELSE 20 END)
        END
      + make_time(CASE WHEN tipo < 3 THEN 8 ELSE 19 END, 0, 0)
    ) AT TIME ZONE 'America/Sao_Paulo'
  )
FROM (
  SELECT n,
         (n - 1) % 6 AS mo,
         ((n - 1) / 6)::int AS tipo
  FROM generate_series(1, 30) AS s(n)
) t
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7b. TRANSAÇÕES FINANCEIRAS — Set 13 a 30 (3 despesas + 2 receitas avulsas)
--     IDs na faixa f0000065..f0000069 — sem conflito com os existentes (1..30).
-- ============================================================================
INSERT INTO transacoes_financeiras (
  id, barbearia_id, tipo, valor, descricao, categoria, agendamento_id, created_at
)
SELECT
  ('f' || lpad(to_hex(100 + n), 7, '0') || '-0000-4000-8000-' || lpad(to_hex(100 + n), 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000001',
  tipo, valor, descricao, categoria, NULL,
  ((date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')::date + day_offset + make_time(hora, 0, 0)) AT TIME ZONE 'America/Sao_Paulo')
FROM (VALUES
  (1, 'despesa', 185.00, 'Energia (TESTE)', 'despesa_geral', 14, 8),
  (2, 'despesa', 175.00, 'Material de estoque (TESTE)', 'despesa_geral', 16, 8),
  (3, 'receita',  80.00, 'Venda avulsa produto (TESTE)', 'produto', 20, 19),
  (4, 'despesa', 120.00, 'Manutenção equipamentos (TESTE)', 'despesa_geral', 23, 8),
  (5, 'receita',  65.00, 'Venda avulsa serviço (TESTE)', 'servico', 28, 19)
) AS t(n, tipo, valor, descricao, categoria, day_offset, hora)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. ACESSOS DE TESTE — LOCAL SOMENTE (reutilizando logins existentes)
--    master@alcatei.test / master123  |  barbeiro@alcatei.test / barbeiro123
-- ============================================================================
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
VALUES
  (
    'a5000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'master@alcatei.test',
    crypt('master123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Master Teste"}'::jsonb
  ),
  (
    'a5000002-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'barbeiro@alcatei.test',
    crypt('barbeiro123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Barbeiro Teste 1"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- GoTrue (v2.196+) falha ao ler campos de token com NULL
-- ("converting NULL to string is unsupported"). Normaliza p/ string vazia.
UPDATE auth.users
   SET confirmation_token         = coalesce(confirmation_token, ''),
       recovery_token             = coalesce(recovery_token, ''),
       email_change_token_new     = coalesce(email_change_token_new, ''),
       email_change_token_current = coalesce(email_change_token_current, ''),
       phone_change_token         = coalesce(phone_change_token, ''),
       phone_change               = coalesce(phone_change, ''),
       reauthentication_token     = coalesce(reauthentication_token, ''),
       email_change               = coalesce(email_change, '')
 WHERE email IN ('master@alcatei.test', 'barbeiro@alcatei.test');

INSERT INTO usuarios (id, barbearia_id, auth_user_id, profissional_id, nome, email, papel, ativo)
VALUES
  (
    'a5000001-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'a5000000-0000-4000-8000-000000000001',
    NULL, 'Master Teste', 'master@alcatei.test', 'master', true
  ),
  (
    'a5000003-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'a5000002-0000-4000-8000-000000000002',
    'b0000001-0000-4000-8000-000000000001',
    'Barbeiro Teste 1', 'barbeiro@alcatei.test', 'barbeiro', true
  )
ON CONFLICT (barbearia_id, email) DO NOTHING;

-- ============================================================================
-- 9. PRODUTOS — ESTOQUE INICIAL DOS 26 DO CATÁLOGO (dados de teste LOCAL)
--    Distribuição DETERMINÍSTICA de estoque_atual/estoque_minimo:
--      ~65% normal (atual > mínimo) · ~19% estoque baixo (0 < atual <= mín)
--      ~12% esgotados (atual = 0) · ~12% vencendo (validade em até 30 dias)
--      ~8% vencidos (validade já passada) — data relativa a CURRENT_DATE.
--    custo_compra entra só se ainda NULL (COALESCE) e SEMPRE abaixo do preço
--    de venda (margem positiva). data_validade só quando informada.
--    preco/is_order_bump/ativo/demais campos comerciais NÃO são alterados.
-- ============================================================================
UPDATE produtos p
   SET estoque_atual  = v.estoque,
       estoque_minimo = v.minimo,
       custo_compra   = COALESCE(p.custo_compra, v.custo),
       data_validade  = CASE
                          WHEN v.validade IS NULL THEN p.data_validade
                          ELSE (CURRENT_DATE + v.validade)
                        END
  FROM (VALUES
    ('b965f22c-ff40-4e40-b0c6-7cf0a4b2d0cd', 24,  6, 19.90, NULL), -- Balm
    ('8865ee32-0873-4006-90e5-d2661b41b5d7',  4,  6, 26.50, NULL), -- Balm Baboon (baixo)
    ('ce7182a1-3675-4f08-86f7-b693b306a29e', 30,  8, 13.90, NULL), -- Cera Matte Wax
    ('0531f905-3963-4152-837b-5a17a123713e', 22,  6, 13.90, 10),   -- Cera Shine Wax (vencendo)
    ('298a6dd5-cb43-4014-898c-60b5a03b6a31', 15,  4, 42.00, 18),   -- Leave-in (vencendo)
    ('dc00de9d-a0d7-443b-957b-a766fd0fb4ea', 12,  3, 64.90, -8),   -- minoxidil (vencido)
    ('fd45ac13-40c7-43fc-b85e-bc91f99fdc56',  3,  5, 16.90, NULL), -- Óleo de jojoba (baixo)
    ('0c513adf-9b78-4cf0-873b-34e27f5e2511', 20,  5, 36.90, NULL), -- Óleo Para Barba
    ('7686d323-a1a4-4506-a933-09061346137a', 25,  7, 19.90, 7),    -- Óleo Spray (vencendo)
    ('8d3cf159-823c-4d7b-ad67-dabefed327a4', 10,  3, 52.00, NULL), -- Pasta Matte
    ('28c12e67-afbb-4f1b-97e7-de5a5f1eb7f9', 16,  4, 12.90, NULL), -- Perfume Capilar Black Vip
    ('7604e980-cdf3-4678-ad94-578df9d06008',  4,  6, 12.90, NULL), -- Perfume Capilar Invicible (baixo)
    ('ab1861c6-35bb-4f57-9e7b-f9de9f0c745a',  2,  6, 12.90, NULL), -- Perfume Capilar Milion (baixo)
    ('8c7aef0d-c608-431d-829b-e4b771a44f43', 19,  5, 14.90, NULL), -- Pomada Black
    ('0a91ddea-312e-4138-ae38-78ba2bd25368',  8,  2, 47.90, NULL), -- Pomada Cement Efect
    ('80e989eb-9646-4022-b569-e0340d56d5dc', 14,  4, 18.90, NULL), -- Pomada Efeito Teia
    ('f8f0d4ef-8767-4acf-a7fe-a83cb5d1b262', 11,  3, 20.90, NULL), -- Pomada em pó
    ('224d7cf1-3ad9-440c-84c0-8538ddeb5f3f',  9,  2, 49.90, NULL), -- Pomada Fiber Cream
    ('3d8ebc1f-406a-4425-a722-8ae862d6fb82',  0,  5, 14.90, NULL), -- Pomada fixadora 4 (esgotado)
    ('5696e6c0-c9de-488a-920f-487e7ff2b626', 21,  6, 14.90, NULL), -- Pomada level 2
    ('0b51b24e-6eba-4956-ab4e-e323c433aafb',  3,  8, 45.90, NULL), -- Pomada Matte Clay (baixo)
    ('d36aad27-48d2-4e8f-93bb-527c6d6c77ed', 13,  4, 17.90, NULL), -- Pomada Matte Creme
    ('ef0773f3-543d-4291-a82d-910028a8f8a7',  0,  4, 25.90, -5),   -- Pós Barba Enfervecente (esgotado + vencido)
    ('42582e6c-57b2-48e2-8d1d-e556c367a968', 17,  5, 29.90, NULL), -- Sabão Cra Cra
    ('d13feb88-272a-4db0-bd37-41084d90d77f', 12,  3, 28.90, NULL), -- Sabonete Íntimo Mascuino
    ('df1dad1c-0d97-4e96-9f5f-4b1cd8d2badb',  0,  6, 26.90, NULL)  -- Shampoo (esgotado)
  ) AS v(id, estoque, minimo, custo, validade)
 WHERE p.id = v.id::uuid
   AND p.barbearia_id = '00000000-0000-0000-0000-000000000001';

COMMIT;