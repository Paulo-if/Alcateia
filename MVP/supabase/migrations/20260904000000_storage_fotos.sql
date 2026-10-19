-- ============================================================================
-- Storage: bucket público para fotos (avatares de profissionais e imagens)
-- ----------------------------------------------------------------------------
-- TASK #21 (Supabase Storage) + TASK #19 (Fotos dos profissionais).
--
-- O que faz:
--   * Cria o bucket `fotos` como PÚBLICO para leitura (o Cliente anônimo precisa
--     carregar os avatares sem autenticação).
--   * Permite UPLOAD/UPDATE/DELETE apenas para usuários autenticados (Admin
--     logado via Supabase Auth), nunca para anônimos.
--   * Delete de objetos é permitido a qualquer usuário autenticado (um caminho
--     simples e adequado ao MVP single-tenant; não há troca de arquivos entre
--     barbeiros que exija isolamento por dono).
--
-- Idempotente (IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================================

-- Bucket público para leitura (avatares de profissionais).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fotos',
  'fotos',
  true,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública (anônimo + autenticado) — necessário para o Cliente exibir avatares.
DROP POLICY IF EXISTS "fotos_public_select" ON storage.objects;
CREATE POLICY "fotos_public_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos');

-- Upload/insert de objetos: apenas autenticados.
DROP POLICY IF EXISTS "fotos_auth_insert" ON storage.objects;
CREATE POLICY "fotos_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'fotos' AND auth.role() = 'authenticated');

-- Update de objetos: apenas autenticados.
DROP POLICY IF EXISTS "fotos_auth_update" ON storage.objects;
CREATE POLICY "fotos_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'fotos' AND auth.role() = 'authenticated');

-- Delete de objetos: apenas autenticados.
DROP POLICY IF EXISTS "fotos_auth_delete" ON storage.objects;
CREATE POLICY "fotos_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'fotos' AND auth.role() = 'authenticated');

-- ============================================================================
-- FIM — Storage fotos
-- ============================================================================
