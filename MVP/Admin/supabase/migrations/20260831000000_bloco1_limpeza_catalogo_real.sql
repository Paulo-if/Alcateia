-- ============================================================================
-- AlcateiaBarber — BLOCO 1 (FECHAMENTO): LIMPEZA DE DADOS DE TESTE + CATÁLOGO REAL
-- ============================================================================
-- Objetivo: eliminar os dados de teste/fallback comercial contaminantes e
-- substituir o catálogo por dados reais da barbearia.
--
-- O QUE FAZ:
--   1. Remove agendamentos/serviço/profissionais de TESTE (fake) do dataset.
--   2. Adiciona a coluna `is_order_bump` em `produtos` para distinguir CATÁLOGO
--      de OFERTA DE ORDER BUMP (fundação da configuração futura no Admin).
--   3. Insere os 12 serviços reais (nomes/preços/durações exatos).
--   4. Insere os 26 produtos reais do catálogo, TODOS com is_order_bump = false
--      (nem um vira Order Bump automaticamente).
--
-- REGRAS RESPEITADAS:
--   * NÃO toca em RLS/Auth/usuario-profissional/agenda individual.
--   * NÃO cria schema novo além da coluna is_order_bump (necessária para a
--     distinção catálogo vs order bump pedida no Bloco 1).
--   * Preserva a prteção GiST de double booking e o schema existente.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. LIMPEZA DE DADOS DE TESTE
-- ----------------------------------------------------------------------------

-- 1.1 Agendamentos de teste que referenciam o serviço de teste "Corte Degrade".
DELETE FROM agendamentos
WHERE servico_id = 'c05ff35b-4bb5-4f1d-aea4-4578c3e99e6d';

-- 1.2 Serviço de teste "Corte Degrade" (não faz parte do catálogo real).
DELETE FROM servicos
WHERE id = 'c05ff35b-4bb5-4f1d-aea4-4578c3e99e6d'
   OR nome IN ('Corte Degrade', 'Corte Degradê');

-- 1.3 Profissionais de demonstração/teste (Rafael, Carlos, João, Lucas).
--     usuários.profissional_id é ON DELETE SET NULL, então o vínculo de teste
--     do barbeiro é desfeito de forma segura.
DELETE FROM profissionais
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
)
   OR name IN ('Rafael', 'Carlos', 'João', 'Joao', 'Lucas');

-- ----------------------------------------------------------------------------
-- 2. COLUNA is_order_bump EM produtos (distinção catálogo vs order bump)
-- ----------------------------------------------------------------------------
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS is_order_bump boolean NOT NULL DEFAULT false;

-- ----------------------------------------------------------------------------
-- 3. SERVIÇOS REAIS (12) — nomes/preços/durações EXATOS
-- ----------------------------------------------------------------------------
INSERT INTO servicos (id, barbearia_id, nome, descricao, preco, duracao_minutos, icone, ativo, ordem)
VALUES
  ('62515ff5-ae30-4fd9-92e1-aaa4950e23e5', '00000000-0000-0000-0000-000000000001', 'Acabamento (pezinho)', NULL, 15.00, 10, 'scissors', true, 1),
  ('e6d346cc-f850-4d59-9815-bebe03caf0d8', '00000000-0000-0000-0000-000000000001', 'Barba (barboterapia)', NULL, 40.00, 40, 'scissors', true, 2),
  ('160a83b1-ae40-4999-beeb-77a9e7fad248', '00000000-0000-0000-0000-000000000001', 'Barba Express', NULL, 25.00, 30, 'scissors', true, 3),
  ('4253a743-ce63-4de1-bb4d-bdf3cb2519f2', '00000000-0000-0000-0000-000000000001', 'Corte', NULL, 40.00, 40, 'scissors', true, 4),
  ('646e20ab-ba35-429c-af6b-22c15be53049', '00000000-0000-0000-0000-000000000001', 'Depilação Nasal (Feito com Cera)', NULL, 20.00, 10, 'scissors', true, 5),
  ('0d2fba36-bb3b-4253-afdf-bbc485a5fcdc', '00000000-0000-0000-0000-000000000001', 'Hidratação', NULL, 25.00, 10, 'scissors', true, 6),
  ('560c4c96-64c0-4452-a6bf-514aa93f599a', '00000000-0000-0000-0000-000000000001', 'Sobrancelha', NULL, 15.00, 10, 'scissors', true, 7),
  ('6059cef6-c241-43e4-be6f-d36f8e5ea4a4', '00000000-0000-0000-0000-000000000001', 'CORTE + HIDRATAÇÃO', NULL, 60.00, 50, 'scissors', true, 8),
  ('223b2f7d-a810-40ec-9d32-be55cd73e815', '00000000-0000-0000-0000-000000000001', 'CORTE + BARBA', NULL, 75.00, 60, 'scissors', true, 9),
  ('61f18c44-8fbc-43ee-b5b6-4420dc096f59', '00000000-0000-0000-0000-000000000001', 'CORTE + BARBA + SOBRANCELHA', NULL, 90.00, 70, 'scissors', true, 10),
  ('972e1915-f6ee-416a-b415-7d24922a4d89', '00000000-0000-0000-0000-000000000001', 'CORTE + BARBA + SOBRANCELHA + HIDRATAÇÃO + DEPILAÇÃO NASAL', NULL, 130.00, 90, 'scissors', true, 11),
  ('6d6c7c31-3606-4a59-976d-08ecabe9ba6c', '00000000-0000-0000-0000-000000000001', 'CORTE + SOBRANCELHA', NULL, 55.00, 50, 'scissors', true, 12)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. PRODUTOS REAIS (26) — CATÁLOGO (is_order_bump = false)
--    preco_original = preço de venda no catálogo.
--    preco_bump = 0 (não é oferta de Order Bump neste momento).
-- ----------------------------------------------------------------------------
INSERT INTO produtos (id, barbearia_id, nome, descricao, preco_original, preco_bump, imagem_url, ativo, is_order_bump)
VALUES
  ('b965f22c-ff40-4e40-b0c6-7cf0a4b2d0cd', '00000000-0000-0000-0000-000000000001', 'Balm', NULL, 40.00, 0.00, NULL, true, false),
  ('8865ee32-0873-4006-90e5-d2661b41b5d7', '00000000-0000-0000-0000-000000000001', 'Balm Baboon', NULL, 55.00, 0.00, NULL, true, false),
  ('ce7182a1-3675-4f08-86f7-b693b306a29e', '00000000-0000-0000-0000-000000000001', 'Cera Matte Wax', NULL, 30.00, 0.00, NULL, true, false),
  ('0531f905-3963-4152-837b-5a17a123713e', '00000000-0000-0000-0000-000000000001', 'Cera Shine Wax', NULL, 30.00, 0.00, NULL, true, false),
  ('298a6dd5-cb43-4014-898c-60b5a03b6a31', '00000000-0000-0000-0000-000000000001', 'Leave-in', NULL, 85.00, 0.00, NULL, true, false),
  ('dc00de9d-a0d7-443b-957b-a766fd0fb4ea', '00000000-0000-0000-0000-000000000001', 'minoxidil', NULL, 110.00, 0.00, NULL, true, false),
  ('fd45ac13-40c7-43fc-b85e-bc91f99fdc56', '00000000-0000-0000-0000-000000000001', 'Óleo de jojoba', NULL, 35.00, 0.00, NULL, true, false),
  ('0c513adf-9b78-4cf0-873b-34e27f5e2511', '00000000-0000-0000-0000-000000000001', 'Óleo Para Barba', NULL, 75.00, 0.00, NULL, true, false),
  ('7686d323-a1a4-4506-a933-09061346137a', '00000000-0000-0000-0000-000000000001', 'Óleo Spray', NULL, 45.00, 0.00, NULL, true, false),
  ('8d3cf159-823c-4d7b-ad67-dabefed327a4', '00000000-0000-0000-0000-000000000001', 'Pasta Matte', NULL, 100.00, 0.00, NULL, true, false),
  ('28c12e67-afbb-4f1b-97e7-de5a5f1eb7f9', '00000000-0000-0000-0000-000000000001', 'Perfume Capilar Black Vip', NULL, 30.00, 0.00, NULL, true, false),
  ('7604e980-cdf3-4678-ad94-578df9d06008', '00000000-0000-0000-0000-000000000001', 'Perfume Capilar Invicible', NULL, 30.00, 0.00, NULL, true, false),
  ('ab1861c6-35bb-4f57-9e7b-f9de9f0c745a', '00000000-0000-0000-0000-000000000001', 'Perfume Capilar Milion', NULL, 30.00, 0.00, NULL, true, false),
  ('8c7aef0d-c608-431d-829b-e4b771a44f43', '00000000-0000-0000-0000-000000000001', 'Pomada Black', NULL, 35.00, 0.00, NULL, true, false),
  ('0a91ddea-312e-4138-ae38-78ba2bd25368', '00000000-0000-0000-0000-000000000001', 'Pomada Cement Efect', NULL, 95.00, 0.00, NULL, true, false),
  ('80e989eb-9646-4022-b569-e0340d56d5dc', '00000000-0000-0000-0000-000000000001', 'Pomada Efeito Teia', NULL, 40.00, 0.00, NULL, true, false),
  ('f8f0d4ef-8767-4acf-a7fe-a83cb5d1b262', '00000000-0000-0000-0000-000000000001', 'Pomada em pó', NULL, 45.00, 0.00, NULL, true, false),
  ('224d7cf1-3ad9-440c-84c0-8538ddeb5f3f', '00000000-0000-0000-0000-000000000001', 'Pomada Fiber Cream', NULL, 100.00, 0.00, NULL, true, false),
  ('3d8ebc1f-406a-4425-a722-8ae862d6fb82', '00000000-0000-0000-0000-000000000001', 'Pomada fixadora 4', NULL, 35.00, 0.00, NULL, true, false),
  ('5696e6c0-c9de-488a-920f-487e7ff2b626', '00000000-0000-0000-0000-000000000001', 'Pomada level 2', NULL, 35.00, 0.00, NULL, true, false),
  ('0b51b24e-6eba-4956-ab4e-e323c433aafb', '00000000-0000-0000-0000-000000000001', 'Pomada Matte Clay', NULL, 95.00, 0.00, NULL, true, false),
  ('d36aad27-48d2-4e8f-93bb-527c6d6c77ed', '00000000-0000-0000-0000-000000000001', 'Pomada Matte Creme', NULL, 40.00, 0.00, NULL, true, false),
  ('ef0773f3-543d-4291-a82d-910028a8f8a7', '00000000-0000-0000-0000-000000000001', 'Pós Barba Enfervecente', NULL, 60.00, 0.00, NULL, true, false),
  ('42582e6c-57b2-48e2-8d1d-e556c367a968', '00000000-0000-0000-0000-000000000001', 'Sabão Cra Cra', NULL, 60.00, 0.00, NULL, true, false),
  ('d13feb88-272a-4db0-bd37-41084d90d77f', '00000000-0000-0000-0000-000000000001', 'Sabonete Íntimo Mascuino', NULL, 60.00, 0.00, NULL, true, false),
  ('df1dad1c-0d97-4e96-9f5f-4b1cd8d2badb', '00000000-0000-0000-0000-000000000001', 'Shampoo', NULL, 55.00, 0.00, NULL, true, false)
ON CONFLICT (id) DO NOTHING;

COMMIT;
