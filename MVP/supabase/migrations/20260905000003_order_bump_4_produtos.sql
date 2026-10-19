-- ============================================================================
-- 20260905000003: Catálogo — define 4 produtos como Order Bump
-- ----------------------------------------------------------------------------
-- Decisão do proprietário (seed local / teste): dentre os 26 produtos reais
-- do catálogo (todos criados com is_order_bump = false), 4 passam a ser
-- ofertas de Order Bump exibidas no checkout. preco_bump = preço promocional
-- oferecido na venda agregada.
-- ============================================================================

update produtos
   set is_order_bump = true,
       preco_bump = 30.00
 where id = 'b965f22c-ff40-4e40-b0c6-7cf0a4b2d0cd'   -- Balm (catálogo R$ 40)
   and is_order_bump = false;

update produtos
   set is_order_bump = true,
       preco_bump = 60.00
 where id = '0c513adf-9b78-4cf0-873b-34e27f5e2511'   -- Óleo Para Barba (catálogo R$ 75)
   and is_order_bump = false;

update produtos
   set is_order_bump = true,
       preco_bump = 70.00
 where id = '298a6dd5-cb43-4014-898c-60b5a03b6a31'   -- Leave-in (catálogo R$ 85)
   and is_order_bump = false;

update produtos
   set is_order_bump = true,
       preco_bump = 35.00
 where id = '7686d323-a1a4-4506-a933-09061346137a'   -- Óleo Spray (catálogo R$ 45)
   and is_order_bump = false;