-- ============================================================================
-- BLOCO 2B EXTENSÃO — Endurecimento RLS (segurança)
-- ----------------------------------------------------------------------------
-- TASK #14 (RLS definitivo) — elimina políticas anônimas permissivas sem
-- justificativa funcional, reduzindo o risco de vazamento/fraude.
--
-- O que muda:
--  * Remove as políticas `anon_update_*` de clientes, agendamentos, vendas_bump
--    e pagamentos. O app público (Cliente) APENAS INSERE novos registros ao
--    agendar/pagar — ele NUNCA faz UPDATE direto nessas tabelas. Essas políticas
--    permitiam que qualquer anônimo ALTERASSE registros de terceiros (mudar
--    status de pagamento, cancelar agendamento alheio, sobrescrever dados de
--    outro cliente), o que é inaceitável em produção.
--
--  * Mantém SELECT/INSERT anon, necessários ao fluxo público de agendamento
--    (buscar/inserir cliente por telefone, criar agendamento, registrar bump e
--    pagamento).
--
-- NÃO altera: políticas de master/barbeiro, tabelas, colunas, fluxos.
--
-- A migration é idempotente (DROP POLICY IF EXISTS).
-- ============================================================================

-- clientes: remove UPDATE anon (Cliente nunca atualiza cadastro de forma direta).
DROP POLICY IF EXISTS "anon_update_clientes" ON clientes;

-- agendamentos: remove UPDATE anon (alteração de status/horário deve ser feita
-- pelo Admin ou via Edge Function/API server-side, nunca pelo cliente).
DROP POLICY IF EXISTS "anon_update_agendamentos" ON agendamentos;

-- vendas_bump: remove UPDATE anon (venda é sempre INSERT no checkout).
DROP POLICY IF EXISTS "anon_update_vendas_bump" ON vendas_bump;

-- pagamentos: remove UPDATE anon. Qualquer mudança de status/valor de pagamento
-- deve ocorrer server-side (Edge Function de webhook com service_role), nunca
-- direto pelo navegador do cliente.
DROP POLICY IF EXISTS "anon_update_pagamentos" ON pagamentos;

-- ============================================================================
-- FIM — Endurecimento RLS
-- ============================================================================
