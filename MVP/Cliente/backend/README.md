# Cliente — Backend

O app Cliente não possui código de servidor próprio: ele consome o backend
Supabase compartilhado (Postgres + Auth + Storage + RLS) diretamente a partir de
`Cliente/frontend/src/services`.

Reservado para futuras Edge Functions ou integrações específicas do cliente.

O banco compartilhado (migrations, seed e config) vive em `MVP/supabase/`.
