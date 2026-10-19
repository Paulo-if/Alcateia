# Admin — Backend

Código de servidor específico do app Admin.

## functions/

Edge Functions do Supabase (Deno) usadas apenas pelo painel administrativo:

- `vincular-admin` — bootstrap do primeiro usuário master.
- `criar-usuario` — criação de usuários (master).
- `remover-usuario` — remoção de usuários (master).

O banco compartilhado (migrations, seed e config) vive em `MVP/supabase/`.
