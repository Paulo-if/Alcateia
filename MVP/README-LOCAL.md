# Alcateia Barber — Ambiente Local (Supabase + Docker)

Setup 100% local criado para popular dados de teste e validar migrations **sem
nenhum risco ao banco remoto** (`gddwsdssmbasxazjakyw`).

## Pré-requisitos

- Docker Desktop (Engine ativo)
- Node.js v24 / npm 11
- Supabase CLI instalado como devDependency do projeto (raiz `MVP`):
  `npm install supabase --save-dev --prefix MVP` → `npx supabase --version` = 2.116.0

## Estrutura

```
MVP/
├─ supabase/
│  ├─ config.toml             # project_id = "MVP" (analytics desabilitado p/ Windows)
│  └─ migrations/             # migrations do banco compartilhado
├─ Admin/
│  ├─ frontend/               # app Vite do admin
│  │  ├─ .env                 # credenciais REMOTAS (produção)
│  │  └─ .env.local           # credenciais LOCAIS  (setup local)
│  └─ backend/functions/      # Edge Functions (vincular-admin, criar-usuario, remover-usuario)
└─ Cliente/
   └─ frontend/
      ├─ .env                 # credenciais REMOTAS (produção)
      └─ .env.local           # credenciais LOCAIS  (setup local)
```

## Subir o banco local

```bash
# a partir de C:\Projetos\alcateiBarbearia\MVP
npx supabase start          # sobe o stack e aplica as migrations
npx supabase status         # mostra URLs/chaves/status
npx supabase stop           # para o stack (sem apagar o volume)
```

Serviços locais:

| Serviço  | URL |
|---|---|
| API (REST) | http://127.0.0.1:54321 |
| Studio (UI do Postgres) | http://127.0.0.1:54323 |
| Mailpit (emails) | http://127.0.0.1:54324 |
| DB (Postgres) | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

## Credenciais locais

- Anon key: JWT local (já embutida nos `.env.local`; `npx supabase status -o env`)
- Service role / Secret: **nunca** usar no frontend (apenas administração via Studio)

> As chaves locais são defaults de desenvolvimento e só valem contra o stack local.

## Migrations (validadas localmente ✅)

Todas as 14 aplicaram com sucesso no Postgres local, incluindo as 3 ainda não
aplicadas no remoto:

- `20260905000000_db_usage_guard.sql`
- `20260905000001_retention_2years.sql`
- `20260905000002_config_urls.sql`

## Seed (dados de teste)

- Arquivo: `supabase/seed.sql` (config `[db.seed] enabled = true`).
- Roda automaticamente no `npx supabase db reset` (não no `start` de um stack já
  criado).
- Resetar tudo (migrations + seed) do zero:

```bash
npx supabase db reset
```

> ⚠️ `db reset` **só** afeta o banco local (Docker). O remoto não é tocado.

## Alternar entre LOCAL e REMOTO

O **Vite prioriza `.env.local` sobre `.env` em todos os modos** (dev e build).
Portanto a presença do `.env.local` é o que define qual banco está ativo.

- **Rodar contra o banco LOCAL:** manter `Admin/frontend/.env.local` e
  `Cliente/frontend/.env.local` presentes. `npm run dev` (raiz) ou os devs
  individuais apontam para http://127.0.0.1:54321.
- **Rodar contra o banco REMOTO (produção):** remover/renomear os `.env.local`
  (ex.: `Admin/frontend/.env.local.off`) e rodar o dev/build normal — o `.env`
  volta a valer.

```bash
# trocar para remoto
ren Admin\frontend\.env.local    Admin\frontend\.env.local.off
ren Cliente\frontend\.env.local  Cliente\frontend\.env.local.off
# trocar de volta para local
ren Admin\frontend\.env.local.off    Admin\frontend\.env.local
ren Cliente\frontend\.env.local.off  Cliente\frontend\.env.local
```

> ⚠️ **NUNCA** rode `npm run build` (Admin/Cliente) para produção com `.env.local`
> presente — o bundle sairia apontando para o banco local. Para deploy, mantenha
> o `.env.local` desativado (opção "remoto" acima) e confira
> `public/admin|cliente/assets/*.js` para verificar que não contém
> `127.0.0.1:54321`.

## Segurança

- `.env` e `.env.local` estão no `.gitignore` (Admin via `*.local`, Cliente e raiz
  via `.env.*`). **Nunca commitar** credenciais.
  `git check-ignore MVP/Admin/frontend/.env.local` deve retornar o arquivo.

## Notas do setup

- `[analytics] enabled = false` no `config.toml`: no Windows o container Logflare
  exige o daemon Docker exposto em `tcp://localhost:2375`; desabilitado para não
  travar o `supabase start` (não afeta Postgres/Studio/migrations).
- Nenhum dado do remoto foi alterado durante este setup: sem `db push`, sem
  `link`, sem writes via API remota.