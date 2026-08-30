CREATE TABLE IF NOT EXISTS profissionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialty text,
  avatar_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_profissionais" ON profissionais;
CREATE POLICY "anon_select_profissionais" ON profissionais FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_profissionais" ON profissionais;
CREATE POLICY "anon_insert_profissionais" ON profissionais FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_profissionais" ON profissionais;
CREATE POLICY "anon_update_profissionais" ON profissionais FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_profissionais" ON profissionais;
CREATE POLICY "anon_delete_profissionais" ON profissionais FOR DELETE
  TO anon, authenticated USING (true);

ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS professional_id uuid REFERENCES profissionais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agendamentos_professional_id ON agendamentos(professional_id);

INSERT INTO profissionais (id, name, specialty, avatar_url, active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Rafael', 'Especialista em degradê', null, true),
  ('22222222-2222-2222-2222-222222222222', 'Carlos', 'Especialista em barba', null, true),
  ('33333333-3333-3333-3333-333333333333', 'João', 'Cortes modernos', null, true),
  ('44444444-4444-4444-4444-444444444444', 'Lucas', 'Corte + barba', null, true)
ON CONFLICT (id) DO NOTHING;
