# Edge Functions — Bloco 4 (Gestão de Usuários)

Duas Edge Functions (Deno) no Supabase, usadas pelo painel Admin para gerenciar
usuários (sub-contas do Supabase Auth) com segurança **server-side**:

| Função            | Método | Descrição                                                                 |
| ----------------- | ------ | ------------------------------------------------------------------------- |
| `criar-usuario`   | POST   | Cria sub-conta no `auth.users` + perfil em `usuarios`. Só `master` ativo. |
| `vincular-admin`  | POST   | Bootstrap: vincula o usuário logado como **primeiro master** (só quando a tabela `usuarios` está vazia). |

## Por que Edge Functions?

Criar usuários reais no Supabase Auth exige a chave **`service_role`**.
Essa chave **nunca** deve ir para o frontend — logo a criação de usuários só
pode acontecer no servidor. Estas funções rodam com `service_role` (bypassam a
RLS) e, por isso, são a **única** via para criar/permitir acesso ao painel.

## Segurança

- **`criar-usuario`** exige que o chamador tenha um perfil em `usuarios` com
  `papel = 'master'` e `ativo = true`.
- **`vincular-admin`** só permite definir o master se **não existir** nenhum
  perfil com `papel = 'master'` (retorna `409` caso contrário) — impede "roubo"
  de papel.
- Ambas validam o token `Authorization: Bearer <JWT>` do usuário logado.

## Deploy

O CLI do Supabase (Docker) **não** está instalado nesta máquina. O deploy é
feito pelo CLI do Supabase via npm (`supabase`), que roda remote sem Docker:

```bash
# Na raiz (onde está supabase/) — ex.: em MVP/Admin/
npx supabase functions deploy criar-usuario  --project-ref gddw...
npx supabase functions deploy vincular-admin --project-ref gddw...
```

Substitua `gddw...` pelo project ref real
(`gddwsdssmbasxazjakyw.supabase.co` -> ref `gddwsdssmbasxazjakyw`).

Cada deploy deve confirmar a URL:
`https://gddw....supabase.co/functions/v1/criar-usuario`

## Teste local (opcional)

Pode executar localmente com Docker, se disponível:

```bash
npx supabase start
npx supabase functions serve criar-usuario
```

## Variáveis de ambiente

Automáticas quando hospedadas no Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Dependência com a Migration

As funções dependem da tabela `usuarios`, da função `current_usuario()` e das
políticas RLS por papel criadas na migration
`20260830000002_usuarios_rls_por_papel.sql`. **Aplique a migration ANTES de
fazer o deploy.**
