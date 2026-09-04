# AlcateiaBarber — Contexto Completo da Conversa

> Documento de continuidade do projeto. Reúne as decisões, problemas, correções, arquitetura, UX/UI, infraestrutura, roadmap e modo de trabalho definidos ao longo da conversa.
>
> **Fonte:** histórico desta conversa e decisões explicitamente aprovadas pelo usuário.

---

# 1. Identidade do projeto

**Nome:** AlcateiaBarber / Alcateia Barbearia

O produto é um sistema próprio para barbearia que combina:

- gestão administrativa;
- agenda;
- profissionais;
- clientes;
- serviços;
- produtos;
- agendamento público;
- Order Bump;
- pagamento online ou no local;
- Upsell;
- financeiro;
- futura área do cliente;
- futura Landing Page de conversão.

A visão central não é criar apenas uma agenda, mas um **sistema de gestão + motor de agendamento + motor de monetização**.

O fluxo econômico desejado, em visão macro, é:

```text
INSTAGRAM
↓
LINK NA BIO / LINKPAGE
↓
AGENDAMENTOS
↓
SERVIÇO
↓
PROFISSIONAL
↓
DATA / HORÁRIO
↓
DADOS DO CLIENTE
↓
RESUMO
↓
ORDER BUMP
↓
PAGAMENTO
↓
UPSELL
↓
CONFIRMAÇÃO
↓
ADMIN
↓
ATENDIMENTO
↓
FINANCEIRO
```

---

# 2. Regra de continuidade

O projeto já passou por várias decisões e refinamentos. Qualquer novo agente deve tratar o histórico como contexto permanente.

Regras:

1. Ler todo o contexto antes de sugerir alterações.
2. Verificar o código real antes de assumir que algo está faltando.
3. Preservar decisões já aprovadas.
4. Não voltar para versões ou decisões antigas que foram abandonadas.
5. Modificar somente o necessário.
6. Não trocar a stack sem solicitação explícita.
7. Não criar novas páginas sem necessidade.
8. Não usar mock como solução final em produção.
9. Implementar em blocos pequenos.
10. Ao terminar cada bloco, parar e aguardar a validação do usuário.

O padrão de execução acordado é:

```text
AUDITORIA
↓
PROMPT ESPECÍFICO
↓
IMPLEMENTAÇÃO
↓
TYPECHECK / BUILD / TESTES
↓
CHECKPOINT
↓
VALIDAÇÃO DO USUÁRIO
↓
PRÓXIMO BLOCO
```

---

# 3. Repositório e estrutura

Repositório principal:

`https://github.com/Paulo-if/Alcateia.git`

Raiz real do Git:

`C:\Projetos\alcateiBarbearia`

Projeto:

`C:\Projetos\alcateiBarbearia\MVP`

Estrutura principal:

```text
Alcateia/
├── MVP/
│   ├── Admin/
│   ├── Cliente/
│   ├── public/
│   ├── build-deploy.mjs
│   ├── dev.mjs
│   ├── package.json
│   └── vercel.json
└── Referencias/
```

A Vercel deve utilizar:

```text
Root Directory = MVP
Build Command = npm run build
Output Directory = public
```

O build do monorepo compila Admin e Cliente e monta:

```text
public/admin
public/cliente
public/index.html
```

O projeto Vercel atual é:

`alcatei-barber-mvp`

---

# 4. Stack

Stack confirmada e que não deve ser alterada sem motivo técnico extremamente forte:

- React
- Vite
- TypeScript
- Tailwind CSS no Admin
- CSS/estrutura própria no Cliente
- React Router
- Supabase
- PostgreSQL
- Recharts
- Lucide React
- date-fns

Dependências centrais:

- `@supabase/supabase-js`
- `date-fns`
- `lucide-react`
- `react`
- `react-dom`
- `react-router-dom`
- `recharts`

Não migrar para Next.js ou outra stack apenas por preferência estética.

---

# 5. As duas aplicações

## 5.1 Admin

Painel de gestão da barbearia.

Módulos:

- Painel / Dashboard
- Agendamentos
- Clientes
- Serviços & Produtos
- Financeiro
- Usuários
- agenda individual de profissionais

Identidade visual:

- dark premium;
- preto;
- cream;
- ciano/azul como accent;
- verde para sucesso;
- vermelho para erro/perigo.

A antiga identidade com dourado continua associada a versões/concepções anteriores; para o público, a decisão final é não usar dourado como destaque.

## 5.2 Cliente / LinkPage

É a experiência pública para o usuário que vem do Instagram.

Características:

- mobile-first;
- centralizada;
- premium;
- minimalista;
- rápida;
- baixa fricção;
- orientada a conversão.

O público principal é tratado como usuário mobile, especialmente vindo do Instagram.

---

# 6. LinkPage pública

A área pública deve funcionar como LinkPage da barbearia.

O projeto Lovable em:

`C:\Projetos\alcateiBarbearia\Referencias\CloneLovable\alcateia-booking`

foi definido como referência visual.

A referência usada inclui:

- hero “A arte do corte classico” / estética equivalente da referência;
- cards centrais;
- localização.

Decisões finais:

### Hero / carrossel

Usar as imagens em `Cliente/src/assets` com a sequência:

- `LogoAlcateia`
- `Img01`
- `Img02`
- `Img03`

O carrossel deve:

- trocar automaticamente a cada aproximadamente 3,5 segundos;
- não ter setas;
- não ter bolinhas/dots;
- ficar maior verticalmente do que a primeira versão;
- manter visual premium.

O título/hero inspirado na referência é mantido, mas o CTA “Agendar agora” da arte de referência não é usado como botão principal no hero.

### Cards principais

Manter apenas os cards:

- Agendamentos
- Conheça nossa barbearia
- Localização

Os cards devem ser maiores, aproximadamente 2× a dimensão visual inicial, sem deixar a interface pesada.

Não usar a seção “Serviços e especialidades” da referência.

Não usar o card “Pronto para a cadeira?...” abaixo do Google Maps.

Tudo deve ser centralizado:

- cards;
- textos;
- footer;
- elementos principais.

---

# 7. Localização pública

A seção de localização deve usar o Google Maps.

Decisão final:

- não criar indicação/botão visual desnecessário;
- o próprio card/mapa deve ser clicável;
- ao clicar, abrir o Google Maps/aplicativo de mapas do usuário quando possível.

---

# 8. Footer público

Footer centralizado.

Deve conter ícones redondos:

- WhatsApp
- Instagram

Instagram deve apontar para:

`https://www.instagram.com/barbearia_alcateia_/`

Os ícones são links clicáveis.

---

# 9. Popup / Bottom Sheet do agendamento

O popup de agendamento foi considerado visualmente excelente e deve ser preservado.

Características aprovadas:

- abre de baixo para cima;
- overlay escuro;
- conteúdo ao fundo escurecido/desfocado;
- painel central arredondado;
- cabeçalho com botão X;
- indicador de progresso;
- visual dark premium;
- mobile-first.

Não substituir esse padrão sem necessidade.

---

# 10. Fluxo público de agendamento

A ordem desejada evoluiu e foi consolidada como:

```text
Serviço
↓
Profissional
↓
Data
↓
Horário
↓
Nome + WhatsApp
↓
Resumo
↓
Order Bump, se houver
↓
Pagamento
↓
Upsell
↓
Confirmação
```

Não exigir conta/login do cliente no início do booking.

A criação de conta entra apenas como feature posterior planejada para o final do fluxo.

---

# 11. Seleção do serviço

Problema identificado:

Ao clicar no serviço, a aplicação avançava automaticamente para o próximo passo, tornando o botão “Continuar” praticamente inútil.

Decisão:

```text
Selecionar serviço
↓
clicar Continuar
↓
próxima etapa
```

Não avançar automaticamente ao selecionar.

---

# 12. Seleção de profissional

Tela:

“Quem vai cuidar do seu corte?”

Não usar mais profissionais falsos.

Profissionais fake removidos anteriormente:

- Rafael
- Carlos
- João
- Lucas

Não reintroduzir esses registros/IDs como dados reais.

A fonte deve ser a tabela `profissionais` do Supabase.

Filtro básico atual do Cliente:

```text
active = true
```

O novo fluxo do Admin é:

```text
Master
↓
Novo usuário
↓
Papel = Barbeiro
↓
Edge Function
↓
cria profissional
↓
usuarios.profissional_id
↓
profissional active=true
↓
aparece no Cliente
```

Existe também a ideia de:

“Qualquer profissional”

para aumentar disponibilidade.

---

# 13. Usuário x Profissional

As duas entidades continuam separadas.

### Usuário

Responsável por:

- autenticação;
- login;
- papel;
- acesso ao painel.

### Profissional

Responsável por:

- pessoa que atende;
- agenda;
- disponibilidade;
- referência nos agendamentos.

O relacionamento é automatizado.

`usuarios.profissional_id` aponta para `profissionais.id`.

Não transformar as tabelas em uma única entidade.

---

# 14. Papéis

Papéis atualmente relevantes:

- `master`
- `barbeiro`

O papel “Gerente” apareceu durante uma tentativa do agente, mas foi explicitamente colocado FORA do escopo atual.

Não implementar gerente sem nova decisão do usuário.

### Master

Tem controle administrativo completo da barbearia.

### Barbeiro

É o profissional operacional, com agenda própria e acesso conforme a arquitetura definida.

---

# 15. Controle Master sobre usuários

O Master deve conseguir administrar os usuários da barbearia.

Operações:

- criar;
- ativar;
- desativar;
- alterar papel quando suportado;
- remover/aposentar usuários de teste.

Não permitir autoexclusão do Master atual.

Não permitir remoção do último Master ativo.

---

# 16. Edge Function `criar-usuario`

Implementada e publicada.

Comportamento:

Ao criar usuário com papel `barbeiro`:

1. cria subconta Auth;
2. cria profissional automaticamente;
3. vincula o profissional ao perfil `usuarios.profissional_id`;
4. usa UUID real;
5. profissional fica `active=true`;
6. mantém mesma barbearia/contexto.

Tratamento de falha:

- se a criação do profissional falhar, remover a subconta Auth;
- se criação do perfil falhar, remover profissional e subconta Auth;
- evitar estado órfão.

O campo manual “Profissional vinculado” foi removido do fluxo novo de criação.

---

# 17. Edge Function `remover-usuario`

Criada para executar remoção real com `service_role` no backend seguro.

A operação atual segue esta lógica:

### Sem histórico

- remover conta Auth;
- remover perfil de usuário quando seguro;
- remover profissional quando não há histórico;
- dependências de agenda devem ser removidas por cascata/limpeza segura;
- usuário desaparece da lista.

### Com histórico

- remover/desvincular acesso Auth quando possível;
- preservar histórico;
- manter profissional, mas `active=false`;
- manter agendamentos, vendas, transações e pagamentos.

Proteções:

- não permitir autoexclusão;
- não permitir excluir último Master;
- não expor `service_role` no frontend.

### Bug anterior

Houve um bug onde o perfil era inativado antes de `deleteUser()`, produzindo:

```text
usuarios.ativo = false
usuarios.auth_user_id = null
profissional.active = false
auth.users ainda existe
```

A correção mudou a ordem para:

```text
delete Auth primeiro
↓
se sucesso, continua
↓
mutar perfil/profissional
```

Se o Auth falhar, não alterar perfil/profissional.

A Edge Function foi implantada em produção.

---

# 18. Problema de usuários de teste

Foi identificado um registro legado:

`Barbeiro Teste`

que tinha:

- papel `master`;
- `profissional_id = NULL`;
- nenhum registro correspondente em `profissionais`.

Conclusão:

Era um usuário legado criado antes do fluxo automático. Não deveria ser usado como prova de funcionamento do fluxo atual.

Também foram criados vários usuários de teste (`teste`, `teste01`, `teste02`, `teste03`) durante validações.

O requisito final do usuário é muito claro:

> usuários de teste sem histórico devem ser eliminados de fato e não continuar aparecendo no Admin como INATIVOS.

Esse ponto ainda precisa ser validado/corrigido definitivamente se a exclusão real continuar deixando registros na lista.

---

# 19. Agenda individual por barbeiro

Cada profissional precisa possuir uma agenda própria.

Exemplo:

```text
João
→ agenda João

Carlos
→ agenda Carlos
```

A agenda não pode ser baseada em nome; deve usar `professional_id`.

A estrutura implementada prevê:

- horários semanais;
- dias trabalhados;
- folgas/bloqueios específicos;
- disponibilidade por profissional.

Exemplo:

```text
Segunda 09:00–18:00
Terça 09:00–18:00
Quarta — NÃO TRABALHA
Quinta 09:00–18:00
Sexta 09:00–18:00
```

E uma folga específica, por exemplo:

`06/09/2026`

---

# 20. Diferença entre profissional inativo e folga

`professional.active = false`

significa:

> não atende novos clientes.

Folga específica significa:

> profissional continua ativo, mas não atende naquela data.

Não misturar essas regras.

---

# 21. Disponibilidade e double booking

A disponibilidade deve considerar:

- profissional ativo;
- agenda semanal;
- folga;
- horários de expediente;
- agendamentos;
- duração do serviço.

Regra de overlap:

```text
candidateStart < existingEnd
AND
candidateEnd > existingStart
```

Cancelados e estados que não bloqueiam não devem ocupar horário.

A proteção definitiva está no banco por constraint GiST.

Não remover a proteção do banco para esconder conflito.

---

# 22. Erro `23P01`

Foi identificado que o double booking do PostgreSQL gerava `23P01`.

O frontend anteriormente reconhecia somente texto da mensagem.

Foi corrigido para reconhecer códigos como:

- `23P01`
- outros conflitos relevantes definidos no projeto

Mensagem ao usuário deve ser amigável, como:

> “Este horário acabou de ser reservado. Escolha outro horário.”

O fluxo não pode avançar como se a reserva tivesse sido concluída.

---

# 23. TimeSlotPicker

O visual foi considerado adequado e aprovado.

Não alterar desnecessariamente.

Preservar:

- dark mode;
- texto claro;
- bordas;
- cantos arredondados;
- seleção clara.

---

# 24. Calendário do Cliente

A tela de “Escolha a data” deve mostrar 8 datas em uma matriz 4×2.

Formato conceitual:

```text
[ data ][ data ][ data ][ data ]
[ data ][ data ][ data ][ data ]

        [ Mais datas ]
```

O “Hoje” precisa ter destaque próprio, centralizado/diferente das demais datas.

O botão “Mais datas” deve abrir um popup de calendário para selecionar datas mais distantes.

---

# 25. Dados do cliente

Durante o booking, a aplicação usa:

- nome;
- WhatsApp.

Telefone é o identificador operacional principal para reutilização do cliente.

Máscara aprovada:

`(11) 99999-9999`

No banco, normalizar para os dígitos.

Se o telefone já existir:

```text
reutilizar cliente
↓
não duplicar
```

Não exigir login no começo do booking.

---

# 26. Resumo

O resumo deve ser simples.

Não mostrar o nome do cliente no resumo.

Mostrar:

- serviço;
- valor ao lado do nome do serviço;
- profissional;
- data;
- horário;
- duração;
- total.

Exemplo:

```text
Serviço: Corte Degradê — R$ 45,00
Profissional: Rafael
Data: 30/08/2026
Horário: 16:00
Duração: 40 min
Total: R$ 45,00
```

Se houver Bump, refletir o valor atualizado no resumo posterior.

---

# 27. Problema do resumo duplicado

Foi identificado este fluxo indesejado:

```text
Dados
↓
Resumo
↓
Como deseja pagar
↓
outro resumo
↓
confirmação
```

Decisão:

Não repetir o resumo desnecessariamente.

Deve existir um único resumo relevante antes da confirmação/pagamento, com as informações corretas.

---

# 28. Order Bump

Order Bump ocorre antes do pagamento.

Regra atual:

- oferta principal pequena;
- no máximo uma oferta visível por vez no fluxo atual;
- no futuro pode haver carrossel com até 3 ofertas;
- não poluir a experiência.

Botões desejados:

```text
[Aproveitar] [Continuar sem oferta]
```

ou redação equivalente clara e curta.

---

# 29. Order Bump sem ofertas

Regra crítica:

```text
0 ofertas reais
↓
não renderiza etapa de Order Bump
↓
continua fluxo
```

Nenhum:

- card vazio;
- produto fake;
- fallback comercial;
- oferta de teste.

O Cliente deve usar dados reais quando Supabase estiver configurado.

---

# 30. Order Bump e duração

O problema identificado anteriormente:

um micro-serviço poderia aumentar `data_fim` após o horário já ter sido validado.

Isso poderia fazer a constraint GiST bloquear uma reserva válida na grade.

Decisão arquitetural atual:

**Enquanto o Bump acontece depois do horário, filtrar micro-serviços e aceitar somente produtos físicos (`additionalMinutes = 0`).**

Assim:

```text
duração da grade
=
duração da reserva
```

sem discrepância.

No futuro, uma refatoração poderia mover Bump antes da escolha de horário, mas isso não faz parte do MVP atual.

---

# 31. Catálogo de serviços

Serviços reais definidos:

1. Acabamento (pezinho) — R$ 15,00 — 10 min
2. Barba (barboterapia) — R$ 40,00 — 40 min
3. Barba Express — R$ 25,00 — 30 min
4. Corte — R$ 40,00 — 40 min
5. Depilação Nasal (Feito com Cera) — a partir de R$ 20,00 — 10 min
6. Hidratação — R$ 25,00 — 10 min
7. Sobrancelha — R$ 15,00 — 10 min
8. CORTE + HIDRATAÇÃO — R$ 60,00 — 50 min
9. CORTE + BARBA — R$ 75,00 — 60 min
10. CORTE + BARBA + SOBRANCELHA — R$ 90,00 — 70 min
11. CORTE + BARBA + SOBRANCELHA + HIDRATAÇÃO + DEPILAÇÃO NASAL — R$ 130,00 — 90 min
12. CORTE + SOBRANCELHA — R$ 55,00 — 50 min

Não criar duplicatas.

---

# 32. Catálogo de produtos

Produtos reais definidos:

1. Balm — R$ 40,00
2. Balm Baboon — R$ 55,00
3. Cera Matte Wax — R$ 30,00
4. Cera Shine Wax — R$ 30,00
5. Leave-in — R$ 85,00
6. minoxidil — R$ 110,00
7. Óleo de jojoba — R$ 35,00
8. Óleo Para Barba — R$ 75,00
9. Óleo Spray — R$ 45,00
10. Pasta Matte — R$ 100,00
11. Perfume Capilar Black Vip — R$ 30,00
12. Perfume Capilar Invicible — R$ 30,00
13. Perfume Capilar Milion — R$ 30,00
14. Pomada Black — R$ 35,00
15. Pomada Cement Efect — R$ 95,00
16. Pomada Efeito Teia — R$ 40,00
17. Pomada em pó — R$ 45,00
18. Pomada Fiber Cream — R$ 100,00
19. Pomada fixadora 4 — R$ 35,00
20. Pomada level 2 — R$ 35,00
21. Pomada Matte Clay — R$ 95,00
22. Pomada Matte Creme — R$ 40,00
23. Pós Barba Enfervecente — R$ 60,00
24. Sabão Cra Cra — R$ 60,00
25. Sabonete Íntimo Mascuino — R$ 60,00
26. Shampoo — R$ 55,00

Inicialmente, todos os produtos reais foram criados com:

`is_order_bump = false`

---

# 33. Produtos como catálogo único

A área administrativa “Serviços & Produtos” deve evoluir para:

```text
Serviços
Produtos
```

Não criar uma aba de catálogo separada chamada “Produtos Order Bump”.

O produto é catálogo.

Posteriormente um produto pode ser configurado como Order Bump.

No futuro, o mesmo catálogo pode alimentar:

- catálogo normal;
- venda adicional;
- Order Bump;
- Upsell.

---

# 34. Imagens de serviços/produtos/profissionais

Cada entidade deve usar:

- imagem;
- OU ícone.

Não mostrar os dois simultaneamente.

Upload desejado:

```text
Upload
↓
validação
↓
Supabase Storage
↓
URL
↓
banco
```

Regras:

- JPG/PNG;
- máximo 2 MB;
- recomendado 400×400;
- 1:1;
- preview;
- nome do arquivo;
- alterar;
- remover.

Nunca mostrar Base64, como:

`data:image/...base64`

---

# 35. Pagamento

Decisão final:

```text
Pagar Agora
Pagar no Local
```

Não usar “Pagar depois”.

Separar:

- `payment_method`
- `payment_status`
- `payment_id`
- `paid_at`

Exemplos:

```text
online + pending
in_person + pending
online + paid
failed
refunded
```

Pagamento online somente pode ser considerado confirmado após webhook.

Retorno do navegador do checkout NÃO significa pagamento confirmado.

---

# 36. Pagar no local

Fluxo:

```text
Pagar no Local
↓
Reserva
↓
payment_method = in_person
payment_status = pending
```

Não fingir que o pagamento foi realizado.

---

# 37. Pagamento online

Fluxo final desejado:

```text
Pagar Agora
↓
Checkout
↓
Webhook
↓
payment_status = paid
↓
Upsell / confirmação
```

A integração de gateway ainda é um item pendente do MVP.

---

# 38. Upsell

Order Bump e Upsell são diferentes.

### Order Bump

Antes do pagamento.

### Upsell

Depois da etapa de pagamento conforme a estratégia final.

Nunca tratar os dois como a mesma oferta.

Opção de recusa:

`Não, obrigado. Quero manter minha reserva.`

Tipos futuros:

- kit;
- pacote premium;
- upgrade;
- assinatura.

---

# 39. Confirmação final do agendamento

Ideia aprovada para melhoria:

Título:

“Agendamento confirmado”

Subtítulo:

> “Seu agendamento com [nome do barbeiro] foi confirmado com sucesso. Te esperamos ansiosamente.”

Depois do resumo:

> “Quer receber um lembrete 30 minutos antes do seu horário?”

Botões:

```text
[ Sim, quero ser lembrado ]
[ Não, obrigado ]
```

Mensagem de apoio opcional:

> “O lembrete será enviado pelo WhatsApp cadastrado.”

A automação real de WhatsApp fica para etapa posterior.

---

# 40. Dashboard

O Dashboard existe.

Filtro de período:

- Hoje
- Semana
- Mês
- Personalizado

Padrão desejado:

**Hoje**

Todos os indicadores devem respeitar o mesmo período selecionado:

- faturamento;
- despesas;
- lucro;
- atendimentos;
- ticket médio;
- gráfico.

---

# 41. Financeiro

Regra de receita:

```text
AGENDADO
→ não é receita realizada

CONCLUÍDO
→ gera receita

CANCELADO
→ não gera receita
```

Se houver Bump:

```text
receita = serviço + bump
```

Não duplicar.

Ticket médio:

```text
receita realizada
÷
atendimentos concluídos
```

dentro do período filtrado.

---

# 42. Financeiro — problema ainda identificado

Foi relatado:

> Dashboard mostra faturamento, mas aba Financeiro não contabiliza corretamente.

Esse é um problema prioritário e precisa ser auditado.

A solução deve centralizar a regra de receita e evitar lógica duplicada em diferentes páginas.

---

# 43. Gráfico financeiro

Direção visual aprovada:

- `LineChart`;
- curvas suaves / monotone;
- área sutil;
- tooltip;
- pontos somente no hover;
- legenda/toggles clicáveis;
- tema dark.

Séries:

- Receitas;
- Despesas;
- Saldo Líquido.

Ao desativar uma série:

- linha desaparece;
- área desaparece;
- controle fica visualmente inativo.

---

# 44. Agenda administrativa

A agenda deve lembrar funcionalmente o Google Calendar, sem copiar identidade visual.

Visões:

- Dia;
- Semana;
- Mês.

A Semana é uma das experiências principais.

Recursos:

- navegação anterior/próximo;
- Hoje;
- grade temporal;
- eventos por duração;
- eventos sobrepostos lado a lado;
- clique em espaço vazio para criar agendamento;
- pesquisa.

Em cards compactos, mostrar apenas:

`Nome do Cliente • Serviço`

Não mostrar excesso de informação em eventos pequenos.

Usar:

- `overflow: hidden`
- `white-space: nowrap`
- `text-overflow: ellipsis`

---

# 45. Busca

Padrão visual aprovado para todas as pesquisas:

```text
lupa  [gap]  texto
```

Base visual equivalente a:

```text
[ 🔎  Search...                         12 results ]
```

Regras técnicas desejadas:

- container relative;
- lupa absolute;
- espaço lateral claro;
- `padding-left` no input;
- cursor nunca sobre a lupa.

Reutilizar em:

- Clientes;
- Agendamentos;
- outras pesquisas.

---

# 46. Google Maps e responsividade

A área pública deve ser pensada primeiro para celular.

A justificativa explicitamente definida pelo usuário é que o principal público da barbearia chega pelo Instagram e praticamente todo o fluxo de agendamento ocorrerá no celular.

Por isso:

- tudo centralizado;
- cards maiores;
- botões tocáveis;
- textos claros;
- pouca densidade;
- pouca fricção.

---

# 47. Autenticação do Admin

Ainda precisa ser fechado como parte do MVP.

Arquitetura desejada:

```text
/login
↓
Supabase Auth
↓
/admin
```

Usuário não autenticado:

```text
/admin
↓
/login
```

Cliente final não precisa login no início do booking.

---

# 48. RLS

É uma prioridade crítica.

O projeto teve problema histórico com policies permissivas.

Objetivo final:

- leitura pública apenas do necessário;
- escrita pública somente de operações específicas necessárias;
- Admin autenticado conforme papel;
- isolamento por `barbearia_id`;
- impedir acesso cruzado entre barbearias;
- não expor PII de clientes.

Nunca usar `service_role` no frontend.

---

# 49. Multi-tenancy

O schema já foi preparado com `barbearia_id`.

A barbearia padrão do MVP usa:

`00000000-0000-0000-0000-000000000001`

Esse UUID default serve para compatibilidade.

Não é mecanismo de segurança.

O isolamento real deverá vir do RLS.

---

# 50. Supabase

Projeto Supabase atual identificado:

`gddwsdssmbasxazjakyw`

URL correspondente no ambiente:

`https://gddwsdssmbasxazjakyw.supabase.co`

Admin e Cliente foram confirmados usando o mesmo projeto Supabase.

Variáveis de produção da Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Como são `VITE_*`, a Vercel exige que sejam configuradas como `Config`, e não Secret.

`service_role` nunca deve ir para o bundle.

---

# 51. Vercel

A configuração final confirmada:

```text
Project = alcatei-barber-mvp
Root Directory = MVP
Build Command = npm run build
Output Directory = public
```

Production acompanha `main`.

O deployment foi validado como correspondente ao HEAD atual do GitHub em uma etapa anterior.

---

# 52. Problema local do build Windows

Foi identificado que o `npm run build` da raiz do monorepo pode falhar no Windows com Node 24 por causa do uso de `spawnSync` com `npm.cmd` em `build-deploy.mjs`.

Os sub-builds do Admin e Cliente funcionaram individualmente.

A Vercel roda em Linux, onde o processo correspondente funciona.

Não alterar `build-deploy.mjs` apenas para contornar a limitação local, salvo nova decisão.

---

# 53. Git / commits

A raiz do Git é:

`C:\Projetos\alcateiBarbearia`

Branch atual:

`main`

Remote:

`https://github.com/Paulo-if/Alcateia.git`

Quando o usuário quiser apenas disparar um deployment sem modificar arquivos, usar commit vazio:

```bash
git commit --allow-empty -m "chore: trigger vercel deployment"
git push origin main
```

Somente quando o working tree estiver limpo.

---

# 54. Migration unificada

Foi criada uma única fonte de verdade:

`MVP/Admin/supabase/migrations/20260830000000_alcateia_unified_schema.sql`

As migrations conflitantes anteriores foram removidas.

Entidades principais:

- `barbearias`
- `barbearia_config`
- `servicos`
- `produtos`
- `profissionais`
- `clientes`
- `agendamentos`
- `vendas_bump`
- `pagamentos`
- `transacoes_financeiras`

---

# 55. Integridade do banco

`agendamentos.professional_id` deve permanecer com proteção de histórico apropriada.

Foi defendido `ON DELETE RESTRICT` para profissionais com histórico, evitando que uma deleção física coloque agendamentos em `NULL` e fragilize a proteção GiST.

A estratégia preferida é soft-delete de profissional:

`active = false`

---

# 56. GiST / double booking

Constraint conceitual:

```text
(barbearia_id, professional_id, intervalo)
```

com exclusão por overlap de `tsrange`, ignorando estados que não bloqueiam.

Uso de:

- `pgcrypto`
- `btree_gist`

O intervalo usa `[)`:

- início incluído;
- fim excluído.

---

# 57. Base de dados real pós-limpeza

Após o Bloco 1, foram confirmados:

```text
servicos = 12
produtos = 26
profissionais = 0 inicialmente, antes da criação de novos barbeiros reais
agendamentos = 0
vendas_bump = 0
```

Depois foram criados barbeiros reais de teste pelo novo fluxo.

---

# 58. Mocks de desenvolvimento

Existem fallbacks como:

- `DEV_PROFESSIONALS`
- `DEV_SERVICES`
- `DEV_BUMP_OFFERS`
- `DEV_UPSELL`
- `DEV_BOOKED_BLOCKS`

Eles podem existir somente em modo de desenvolvimento, quando:

`!isSupabaseConfigured()`

Não podem aparecer como dados comerciais falsos quando o Supabase está configurado.

`DEV_BUMP` singular foi identificado como código morto em uma etapa anterior e pode ser limpo posteriormente.

---

# 59. Hardcodes que precisam migrar para configuração

Futuramente, substituir hardcodes de:

- nome da barbearia;
- logo;
- WhatsApp;
- Instagram;
- telefone;
- endereço;
- horário de funcionamento.

A tabela `barbearia_config` existe e deve ser usada.

---

# 60. Configurações da barbearia

Feature ainda pendente:

- nome;
- logo;
- WhatsApp;
- Instagram;
- telefone;
- endereço;
- horários de funcionamento.

A disponibilidade pública deve respeitar o horário configurado.

---

# 61. Google Calendar

Não assumir integração completa.

MVP:

- agenda própria;
- possibilidade simples de adicionar evento.

Fase futura:

- OAuth;
- sincronização;
- webhooks.

---

# 62. WhatsApp

MVP pode usar:

`wa.me`

com mensagem pré-preenchida.

API oficial não é prioridade atual.

Automação de lembretes é posterior.

---

# 63. Área do cliente — futura

Depois de estabilizar o booking, a ideia é:

```text
LinkPage
↓
Agendamento
↓
confirmação
↓
criação de conta
↓
Área do Cliente
```

No final do fluxo pedir:

- nome;
- email;
- senha;
- WhatsApp.

Área futura:

- meus agendamentos;
- novo agendamento;
- cancelar;
- histórico;
- conversar/contatar a barbearia.

Não implementar antes da fundação do booking estar estável.

---

# 64. LP futura

Foi decidido criar no futuro uma Landing Page específica para a barbearia, separada da LinkPage.

Objetivo:

- apresentar a barbearia;
- copy persuasiva;
- prova social;
- conversão;
- mídia/tráfego.

Não faz parte do MVP atual.

---

# 65. Problemas já encontrados ao longo do projeto

## Problema: profissionais fake

Resolvido no banco.

## Problema: Order Bump vazio/fake

Regra corrigida, mas houve regressão/validação pendente em produção.

## Problema: Bump aumentando duração

Contornado filtrando micro-serviços.

## Problema: double booking

Causa identificada no GiST + duração divergente. Tratamento `23P01` melhorado.

## Problema: telefone sem máscara

Corrigido.

## Problema: serviço avança sem botão

Pendente de UX final.

## Problema: 6 datas em vez de 8

Resolvido no fluxo do Cliente: agora são 8 datas (matriz 4×2), com "Hoje" destacado e botão "Mais datas" abrindo calendário completo. Ver seção "UX de seleção de datas (Cliente)".

## Problema: resumo duplicado

Pendente.

## Problema: resumo mostrando cliente

Decisão de remover do resumo; precisa ser validada no fluxo atual.

## Problema: Admin mostrando “Profissional vinculado”

O código novo removeu o campo; a versão publicada foi posteriormente confirmada como o bundle atual. O usuário antigo “Barbeiro Teste” continua legado e não é prova do fluxo novo.

## Problema: usuário removido fica INATIVO

Ainda existe comportamento a fechar definitivamente para hard delete de usuários de teste sem histórico.

## Problema: exclusão de clientes não funciona

Pendente.

## Problema: Financeiro não contabiliza corretamente

Pendente.

## Problema: Admin e Cliente sem env

Resolvido na Vercel/produção.

---

# 66. Lista consolidada do que ainda precisa ser feito

## 🔴 P0 — MVP

1. Finalizar exclusão real de usuários de teste sem histórico.
2. Corrigir exclusão de clientes.
3. Validar agenda individual por barbeiro ponta a ponta.
4. ~~Corrigir financeiro.~~ (concluído — unificação da fonte de verdade de receita via `financeService.ts`, ver seção 72)
5. Corrigir definitivamente Order Bump fantasma.
6. Garantir que profissionais novos aparecem corretamente no Cliente.
7. Fechar RLS.
8. Fechar Auth do Admin.
9. Implementar pagamento online real + webhook.

## 🟠 P1 — Fluxo/qualidade

10. Corrigir seleção de serviço para exigir “Continuar”.
11. ~~Mostrar 8 datas em 4×2.~~ (concluído)
12. ~~Destacar “Hoje”.~~ (concluído — hero agora alterna para “PRÓXIMA DATA” quando o expediente de hoje já encerrou)
13. ~~Implementar “Mais datas”.~~ (concluído — calendário em popup com datas bloqueadas clicáveis e popup explicativo)
14. Remover duplicação do resumo.
15. Mostrar preço ao lado do nome do serviço no resumo.
16. Finalizar UX do Order Bump.
17. Finalizar confirmação com opção de lembrete.
18. Modal visual próprio para exclusões.
19. Corrigir título do perfil no topo para `[Nome] | [Função]`.
20. Configurações da barbearia.
21. Storage/imagens.
22. Fotos dos profissionais.
23. Busca/paginação.
24. Timezone.
25. Toasts/tratamento de erros.
26. Month View.
27. Refinamento WeekView.

## 🔵 Futuro

28. Área do Cliente.
29. Criação de conta no final do booking.
30. Histórico avançado.
31. Upsell avançado.
32. Assinaturas.
33. Google Calendar OAuth.
34. Google Webhooks.
35. WhatsApp API.
36. Estoque.
37. Landing Page de conversão.

---

# 67. Ordem recomendada atual

A ordem mais segura, considerando tudo que ocorreu na conversa, é:

```text
1. Exclusão real de usuários de teste
2. Exclusão de clientes
3. Agenda individual 100% validada
4. ~~Financeiro~~ (concluído — unificação da fonte de verdade de receita, seção 72)
5. Order Bump fantasma
6. RLS
7. Auth Admin
8. Serviço → botão Continuar
9. ~~8 datas + Hoje + Mais datas~~ (concluído no Cliente)
10. Resumo único
11. Preço no resumo
12. Order Bump UX
13. Confirmação + lembrete
14. Configurações da barbearia
15. Storage + imagens
16. Pagamento online
17. Webhook
18. Month View / WeekView
19. Busca / paginação / timezone / toasts
20. Área do Cliente
21. Upsell avançado
22. Assinaturas
23. Google Calendar
24. WhatsApp API
25. Estoque
26. Landing Page
```

---

# 68. Decisões de UX que não devem ser revertidas

- Mobile-first.
- Tudo importante da LinkPage centralizado.
- Público sem dourado dominante.
- Hero/carrossel automático de 3,5 s.
- Sem setas/dots no carrossel.
- Cards principais grandes.
- Mapa clicável.
- Footer centralizado com WhatsApp/Instagram.
- Popup de booking saindo de baixo para cima.
- TimeSlotPicker preservado.
- Serviço exige clique em Continuar.
- Profissionais reais, sem fake.
- 8 datas em 4×2.
- Hoje destacado.
- Mais datas abre calendário.
- Datas sem disponibilidade não selecionáveis no calendário; ao clicar em data bloqueada, popup explicativo sem avançar o fluxo.
- Hero do seletor de datas alterna de “HOJE” para “PRÓXIMA DATA” quando o expediente de hoje já encerrou.
- Aviso de folga/férias com antecedência de 3 dias usando a camada de disponibilidade existente como fonte de verdade.
- Resumo sem nome do cliente.
- Preço ao lado do serviço.
- Uma oferta de Bump por vez no fluxo atual.
- Dois botões no Bump: aproveitar / continuar sem oferta.
- Nenhum Bump se não houver ofertas reais.
- Não confundir Bump com Upsell.
- Pagar Agora x Pagar no Local.
- Não considerar retorno do checkout como pagamento confirmado.

---

# 69. Decisões técnicas que não devem ser revertidas

- React + Vite + TypeScript.
- Supabase/PostgreSQL.
- Schema unificado.
- `barbearia_id` como base de isolamento.
- `professional_id` como referência operacional.
- Agenda vinculada ao profissional.
- GiST para proteção de double booking.
- Overlap por intervalo real.
- `23P01` tratado como conflito amigável.
- Cliente identificado operacionalmente pelo telefone.
- `payment_method` separado de `payment_status`.
- Service role somente em backend/Edge Function.
- Mocks apenas em desenvolvimento.
- Storage para imagens.
- RLS real antes de produção segura.
- Auth do Admin antes de expor gestão.
- Soft-delete quando histórico precisa ser preservado.

---

# 70. Estado conceitual final do produto

O AlcateiaBarber deve chegar a:

```text
LINKPAGE
↓
Agendamento simples
↓
Profissional real
↓
Agenda real
↓
Disponibilidade real
↓
Reserva segura
↓
Order Bump controlado
↓
Pagamento
↓
Upsell
↓
Confirmação
↓
Admin
↓
Agenda do barbeiro
↓
Atendimento
↓
Financeiro
```

O objetivo é uma experiência muito simples para o cliente, enquanto o painel administrativo concentra o poder operacional.

---

# 71. Regra final para qualquer novo agente

Antes de alterar qualquer coisa, responder internamente:

```text
Isso já foi decidido?
Isso já existe?
Estou criando regressão?
Estou reintroduzindo mock?
Estou quebrando o Supabase?
Estou quebrando o fluxo mobile-first?
Estou misturando Order Bump e Upsell?
Estou alterando histórico que deveria ser preservado?
Estou mudando a stack sem necessidade?
```

Depois:

```text
AUDITAR
→ ALTERAR O MÍNIMO POSSÍVEL
→ VALIDAR
→ PARAR
```

---

# 72. Último estado conhecido da conversa

No último ponto da conversa, a implementação tinha:

- Bloco 1 de schema/limpeza concluído;
- Bloco 2A de usuário → profissional implementado;
- Bloco 2B de agenda individual/controlar usuários implementado e migrations aplicadas ao banco real;
- Edge Function `remover-usuario` criada e corrigida;
- deploy da função realizado;
- Vercel configurada com Root Directory `MVP`;
- variáveis Supabase configuradas em Production;
- Admin e Cliente confirmados no mesmo Supabase;
- bug de bloqueio resolvido em `availabilityService.ts` (`resolveWorkingWindow`): condição corrigida de `.gte('start_date').lte('end_date')` para `.lte('start_date').gte('end_date')`;
- **UX de seleção de datas do Cliente concluída**: 8 datas (4×2), hero destacando “HOJE” → “PRÓXIMA DATA” quando o expediente de hoje encerrou, botão “Mais datas” abrindo calendário em popup, datas bloqueadas desabilitadas com popup explicativo, aviso de folga/férias com janela de 3 dias, camada `useDateAvailability` + `dateHasAvailability` + `fetchUnavailableRanges` como fonte de verdade; loop “Maximum update depth exceeded” corrigido no `CalendarModal` (`minDate` memoizado).
- **Bloco 10 — Resumo Único concluído**: removido o passo `summary` separado; o `BookingSummary` virou um card único e completo dentro da etapa `payment` (acima da escolha de pagamento), refletindo o Bump quando existente. Ajustados `useBookingFlow.ts` (removido `'summary'`), `BookingFlow.tsx` (STEP_TITLES/NEXT_STEP/BACK_TO/goNext/goBack/showFooter/render) e `BookingProgress.tsx` (`dados` = `['customer']`).
- **Bloco 11 — Order Bump definitivo (Cliente + Admin) concluído**:
  - *Causa raiz do fantasma:* o passo fantasma era o `upsell` (não o `bump`) — `UpsellCard` sempre renderizava o estado vazio (“Aproveite enquanto está aqui / Só para você / Nenhuma oferta extra”). O passo `upsell` inteiro foi removido de `useBookingFlow.ts` (union `BookingStep`), `BookingFlow.tsx` (STEP_TITLES/NEXT_STEP/BACK_TO/imports/estado `upsellOffers`/`handleUpsellAdd`/bloco render) e `BookingProgress.tsx` (`finalizacao` = `['bump','payment','confirmation']`). `UpsellCard.tsx`, `addUpsellSale` e `DEV_UPSELL` ficaram órfãos (sem uso no fluxo).
  - *Fluxo final:* 0 bumps → `DADOS → PAGAMENTO → CONFIRMAÇÃO`; com bumps → `DADOS → ORDER BUMP → PAGAMENTO → CONFIRMAÇÃO`.
  - *`fetchBumpProducts()`* busca só ativos com `is_order_bump = true` (limit 3); mocks (`DEV_BUMP_OFFERS`) só sem Supabase configurado.
  - *Admin:* aba própria "Order Bumps" em `AdminServicos.tsx` (3ª aba de "Serviços & Produtos"), visível só para Master (menu `roles: ['master']`). Por produto ativo: Switch "Ativar como Order Bump" (alterna `is_order_bump`) e botão "Editar oferta" (modal de produto com `nome`, `descricao`, `preco_original`, `preco_bump`). Reutiliza o schema existente — **nenhuma migration nova** (não inventa `destaque`/`ordem`). Typecheck e build do Admin OK.
  - **Melhoria (`/admin/servicos`) — toggle sem reload + pesquisa:** causa do flicker era os toggles chamarem `fetchData()` (que ativava `loading=true` → spinner + remount da grade + reordenação por `created_at DESC`). Removido o refetch dos toggles; agora `toggleOrderBump`/`toggleAtivo` são otimistas (UI muda imediatamente, sem reload/reordenação/mover card/scroll), persistência em background com rollback + aviso amigável (`notice`) em erro, e lock assíncrono por item (`toggleLockRef`) contra duplo clique. Pesquisa nas 3 abas (Serviços, Produtos, Order Bumps) via `SearchInput` existente (lupa + gap + limpar com X), filtro instantâneo por nome (`filteredServicos`/`filteredProdutos`), estado vazio amigável, pesquisa limpa ao trocar de aba.
- **Responsividade do Admin (múltiplos blocos) — concluído:** série de blocos de responsividade/mobile-first para o painel, validados separadamente por bloco (checkpoint do usuário):
  - **Bloco 1 (P0 — agenda):** WeekView mobile usando DayView; `AdminAgendaContent` com linhas de dia `flex-col sm:flex-row`; header `AdminAgendamentos` responsivo. Typecheck ✅, build ✅.
  - **Bloco 2 (P1 — Financeiro/Comissao/PeriodFilter/Serviços):** grids de KPI `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, valores `text-2xl sm:text-3xl`, Resumo do Período `grid-cols-1 sm:grid-cols-3`, botão de exclusão `sm:opacity-0 sm:group-hover:opacity-100`, PeriodFilter dropdown `left-0 sm:left-auto sm:right-0 max-w-[calc(100vw-1rem)]`, grids de modal `grid-cols-1 sm:grid-cols-2`, footer de modal `flex flex-col-reverse sm:flex-row`. Typecheck ✅, build ✅.
  - **Bloco 3 (P2 — Card/Modal/títulos):** Card base `p-4 sm:p-6`; Modal `p-4 sm:p-6`, título `text-xl sm:text-2xl`, header `mb-4 sm:mb-6`, botão fechar `p-2`; títulos de página `text-3xl sm:text-4xl` em 8 arquivos (Painel, Agendamentos, Clientes, Serviços, Financeiro, Usuários, Minha Agenda, Comissões). Typecheck ✅, build ✅.
- **Unificação dos calendários/date-pickers do Admin — concluído:** até a primeira auditoria, o Admin NÃO tinha calendário mensal — usava inputs nativos `<input type="date">` (7 ocorrências) além de WeekView/DayView. O usuário reformulou a tarefa para substituir os nativos por um calendário mensal customizado no mesmo padrão visual do “Mais datas” do Cliente. Apenas visual/UI — nenhuma regra de negócio, Supabase, RLS, migration, rota, auth, timezone ou fluxo funcional foi alterado.
  - **Novo `Admin/src/components/ui/CalendarModal.tsx` (reutilizável):** modos `single` e `range`; helpers locais `toDate`/`formatYMD`/`moveMonth`/`getMonthMatrix`; grid Mon-first com `WEEKDAYS ['SEG','TER','QUA','QUI','SEX','SÁB','DOM']`; painel `max-w-[360px] rounded-[22px] bg-[#141414] border-white/15 p-5 shadow-[0_30px_70px_rgba(0,0,0,0.55)]`; nav de mês 36px; células `aspect-square rounded-[10px]`; selecionado `bg-highlight text-black`, hoje `ring-highlight/50`, disabled `opacity-40`; range com Cancelar/Aplicar; `z-[60]` (acima do Modal do app `z-50` e dropdown PeriodFilter `z-50`).
  - `AdminAgendamentos.tsx`: estado `calOpen: 'week'|'day'|'create'|null`; semana/dia/nav e campo “Data do Agendamento” do modal agora abrem o CalendarModal (single) via botões; render de 3 CalendarModal no fim; usa `formatDateBR` (utils).
  - `AdminAgendaContent.tsx`: estado `calFocus: 'start'|'end'|null`; campos folga “Início”/“Fim” abrem CalendarModal single; usa `formatDateBR`.
  - `PeriodFilter.tsx`: estado `calendarOpen`; substituídos inputs De/Até por botão “Escolher intervalo” (exibe “DD/MM — DD/MM”); CalendarModal mode `range` com `startValue=customStart`, `endValue=customEnd`, `onApply` seta `customStart/customEnd`; o botão “Aplicar intervalo” segue como confirmação única.
  - **Validação:** nenhum `<input type="date">` restante no Admin (grep); typecheck ✅; build ✅ (apenas aviso pré-existente de chunk > 500 kB); lint executado com 15 problemas **pré-existentes** (WeekView `formatCurrency`, useAuth fast-refresh, AdminClientes `cn`, AdminDashboard unused, AdminFinanceiro `any`/`isSal`, AdminServicos `any`, AdminAgendamentos `Agendamento`/`Cliente` unused-type-import) — nenhum introduzido pela tarefa. `cn` é apenas joiner sem tailwind-merge (não confiar em override de classes).
- **Bloco Financeiro — Unificação da fonte de verdade de receita (P0, item 4)**: corrigido o problema #42 (Dashboard mostra faturamento, mas Financeiro não contabiliza corretamente) e eliminada a lógica de receita duplicada.
  - **Auditoria:** havia dois modelos de contagem divergentes: Dashboard + Financeiro (master) liam `transacoes_financeiras` (tipo `receita`), enquanto Comissão do Barbeiro lia `agendamentos` (status `concluido`) + `vendas_bump`. Além disso, a receita só "aparecia" quando alguém clicava em *Concluir* (que inseria transação automática) — regra duplicada em `AdminDashboard.updateStatus` e `AdminAgendamentos.updateStatus`. E o Order Bump **não** entrava na receita (só `valor_servico`, contrariando a regra #41 `receita = serviço + bump`).
  - **Novo `Admin/src/lib/financeService.ts` (fonte de verdade única):**
    - `fetchFinanceiroPeriodo(range, { professionalId? })` → `{ receitaServicos, receitaBumps, receitasManuais, despesas, receita, saldo, concluidos, ticketMedio }`. `receita = Σ valor_servico (concluído no período) + Σ vendas_bump.valor_pago (desses concluídos) + Σ transações tipo 'receita' SEM vínculo de agendamento`. `despesas = Σ transações tipo 'despesa'`.
    - `fetchFinanceiroPorDia(range, { professionalId? })` → balanço diário (`{ dia, receita, despesa, saldo }`) para os gráficos, cap 31 dias.
  - **Consumo unificado:**
    - `AdminDashboard.tsx`: KPI "Faturamento" = `financ.receita`, despesas/lucro = `financ.despesas/saldo`, ticket médio = `financ.ticketMedio`, gráfico "Evolução do Faturamento" = `fetchFinanceiroPorDia` (series de receita). Removeu a contagem via `transacoes`. Removeu a inserção de transação automática no `updateStatus` e a deleção no `handleDeleteAgendamento`.
    - `AdminFinanceiro.tsx` (master): KPIs/gráfico agora vêm do `fetchFinanceiroPeriodo`/`fetchFinanceiroPorDia` (inclui serviço + bump + manuais). A lista "Transações do Período" continua lendo `transacoes_financeiras` (manuais + despesas) para o CRUD de lançamentos.
    - `ComissaoBarbeiro.tsx`: totais (Serviços, Bumps, Total, Concluídos) agora via `fetchFinanceiroPeriodo(dateRange, { professionalId })`; listas detalhadas continuam da query de `agendamentos`+`produtos`.
  - **Efeito colateral acordado:** `updateStatus('concluido')` em Dashboard e Agendamentos **não insere mais transação** `receita` vinculada a agendamento (evita dupla contagem). Transações históricas com `agendamento_id` são **ignoradas** no cálculo (não duplicam). O `ctx` `cancelado → remove transação` também saiu. Bump agora é contabilizado na receita (alinhado à regra #41).
  - **Regra preservada:** AGENDADO não gera receita; CONCLUÍDO gera (serviço + bump); CANCELADO não gera. Filtros por período e por profissional (master) mantidos. Nenhuma migration/RLS/Supabase alterado.
  - **Validação:** typecheck ✅; build ✅ (apenas aviso pré-existente de chunk > 500 kB); lint com exatamente os **15 problemas pré-existentes** — nenhum novo introduzido (Dashboard manteve os 6 unused pré-existentes; AdminFinanceiro manteve `any`/`isSal` pré-existentes).
- **Correção do KPI "Atendimentos" do Painel (pós-auditoria):** usuário relatou que o card mostrava 0 apesar de existirem agendamentos concluídos. Diagnóstico: o número principal vinha de `agendamentosPeriodo = agList.length` (`periodoQ`, sem filtro de status) e o Painel abre no preset **HOJE**, então `data_inicio` de agendamentos de dias passados ficava fora → 0. O status (`concluido`) estava correto em todas as telas; não era problema de status, e sim de **período default (HOJE) + contagem de todos os status**. Correção aplicada (opção 1): o card agora exibe `concluidosPeriodo` (fonte unificada `financeService.concluidos`) como número principal, com subtítulo "Atendimentos no período" — alinhado ao período e à fonte de Financeiro/Comissão. Removido o campo `agendamentosPeriodo` (código morto) do `DashboardData`/`setData`. Typecheck ✅, build ✅, lint com os mesmos 15 problemas pré-existentes.

Regra de continuidade de documentos (aprovada pelo usuário): **sempre que o usuário confirmar que uma task terminou, atualizar `MVP/Contexto.md` e `MVP/Lista de implementação.md`** com o progresso daquela task — sem commit, push ou deploy.

---

# Fim do documento
