-- ============================================================================
-- 20260905000002: Configurações — links explícitos de redes sociais
-- ----------------------------------------------------------------------------
-- Script NÃO aplicado ainda (depende do Supabase remoto). Adiciona colunas
-- explícitas para o link completo do Instagram e do WhatsApp da barbearia,
-- usadas no rodapé do site do cliente (PublicFooter).
--
-- A coluna `instagram` já servia de URL direta e `whatsapp` guarda o número cru
-- (para agendamento). Introduzimos `instagram_url` e `whatsapp_url` como campos
-- explícitos e migramos os valores atuais como fallback inicial.
-- ============================================================================

alter table public.barbearia_config
  add column if not exists instagram_url text,
  add column if not exists whatsapp_url text;

-- Fallback inicial: reaproveita valores já preenchidos, sem sobrescrever.
update public.barbearia_config
  set instagram_url = instagram,
      whatsapp_url = case
        when whatsapp is not null and whatsapp <> '' and whatsapp not similar to 'https://.+'
          then 'https://wa.me/' || btrim(regexp_replace(whatsapp, '\D', '', 'g'))
        else whatsapp
      end
  where (instagram_url is null or instagram_url = '')
     or (whatsapp_url is null or whatsapp_url = '');