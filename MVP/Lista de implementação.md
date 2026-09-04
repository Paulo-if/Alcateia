# Planejamento e Roadmap do MVP

*Com base em tudo que já desenvolvemos e nos problemas que você foi encontrando, eu organizaria o que ainda falta assim:*

# **🔴 P0 — Essencial para o MVP funcionar de verdade**

~~## **1\. Finalizar a exclusão real de usuários**~~
~~A Edge Function `remover-usuario` já foi criada e corrigida, mas ainda precisamos validar/corrigir o comportamento para que um usuário de teste sem histórico seja realmente eliminado de:~~

~~* Auth~~
~~* `usuarios`~~
~~* `profissionais`~~
~~* agenda vinculada~~
~~* demais dados exclusivamente relacionados~~

~~E desapareça completamente do Admin.~~

~~Usuário com histórico deve continuar preservando histórico.~~

~~## **2\. Corrigir exclusão de clientes**~~
~~Hoje você confirmou:~~

~~> clicar em excluir → confirmar → nada acontece.~~

~~Precisa funcionar de verdade, com atualização da lista e proteção do histórico quando necessário.~~

## **3\. Agenda individual dos barbeiros**

A estrutura de agenda já foi criada, mas precisamos validar:

Barbeiro A  
→ agenda A

Barbeiro B  
→ agenda B

Incluindo:

* horário de trabalho;  
* dias sem expediente;  
* folga específica;  
* conflitos com agendamentos;  
* disponibilidade correta no Cliente.

## **4\. ~~Corrigir o Financeiro~~** ✅ concluído

Hoje:

Dashboard → mostra faturamento  
Financeiro → não contabiliza corretamente

**Resolução definitiva (unificação da fonte de verdade):**
- **Novo `Admin/src/lib/financeService.ts`** — única fonte de verdade da receita:
  - `receita = Σ valor_servico (agendamentos CONCLUÍDOS no período) + Σ vendas_bump.valor_pago (desses concluídos) + Σ transações tipo 'receita' SEM vínculo de agendamento (manuais)`.
  - `despesas = Σ transações tipo 'despesa'`; `saldo = receita − despesas`; `ticketMedio = receita / concluídos`.
  - `fetchFinanceiroPorDia()` → balanço diário (`{ dia, receita, despesa, saldo }`, cap 31 dias) para os gráficos.
- **Consumo unificado:** Dashboard (KPI Faturamento, ticket médio, gráfico), Financeiro master (KPIs + gráfico), e Comissão do Barbeiro (totais via `professionalId`). A lista "Transações do Período" do Financeiro continua lendo `transacoes_financeiras` para o CRUD de lançamentos manuais.
- **Regra #41 aplicada:** Order Bump agora é contabilizado na receita (antes só `valor_servico`).
- **Efeito colateral:** `updateStatus('concluido')` **não insere mais transação automática** de agendamento (evita dupla contagem); transações históricas com `agendamento_id` são ignoradas. AGENDADO/CANCELADO continuam sem gerar receita.
- Validação: typecheck ✅, build ✅, lint sem novos problemas (mesmos 15 pré-existentes).

## **5\. ~~Eliminar Order Bump fantasma~~** ✅ concluído

Mesmo sem oferta real, ele ainda apareceu em testes.

A regra final deve ser:

0 Order Bumps reais  
→ não existe etapa de Order Bump

E nenhum mock comercial pode aparecer quando o Supabase está configurado.

**Resolução definitiva:** o passo fantasma era o `upsell` (não o `bump`). O passo `upsell` inteiro foi removido do fluxo do Cliente (`useBookingFlow.ts` / `BookingFlow.tsx` / `BookingProgress.tsx`). Agora:
- 0 bumps → `DADOS → PAGAMENTO → CONFIRMAÇÃO`
- com bumps → `DADOS → ORDER BUMP → PAGAMENTO → CONFIRMAÇÃO`

`fetchBumpProducts()` busca só ativos com `is_order_bump = true` (limit 3) e retorna mocks apenas sem Supabase configurado.

## **6\. Limpeza de dados fake**

Continuar limpando/revisando:

* profissionais fake;  
* serviços fake;  
* produtos fake;  
* ofertas fake;  
* IDs `dev-*`;  
* dados hardcoded que deveriam vir do banco.

Os fallbacks de desenvolvimento podem continuar, mas nunca contaminar produção.

---

# **🟠 P1 — Fluxo do Cliente**

### **7\. Corrigir a seleção de serviço**

Hoje clicar no serviço já avança.

Queremos:

Selecionar serviço  
↓  
Continuar  
↓  
Próxima etapa

### **8\. Finalizar a tela de profissionais**

Garantir:

* apenas profissionais reais;  
* `active = true`;  
* nenhum profissional fantasma;  
* profissional criado no Admin aparece automaticamente;  
* agenda correta daquele profissional.

### **9\. ~~Melhorar a seleção de datas~~**  ✅ concluído

Implementado definitivamente:

4 × 2

com 8 datas.

E:

* “Hoje” destacado (vira “PRÓXIMA DATA” quando o expediente de hoje já encerrou);  
* “Mais datas” abaixo;  
* calendário completo em popup, com datas bloqueadas clicáveis e popup explicativo de indisponibilidade;
* aviso de folga/férias com antecedência de 3 dias;
* uso da camada de disponibilidade existente como fonte de verdade (`dateHasAvailability` / `fetchUnavailableRanges` / `useDateAvailability`).

### **10\. Corrigir o resumo**

O resumo precisa ser único e objetivo.

Não queremos:

Resumo  
→ pagamento  
→ outro resumo  
→ confirmação

O resumo deve:

* não mostrar cliente;  
* mostrar preço ao lado do serviço;  
* mostrar profissional;  
* data;  
* horário;  
* duração;  
* total;  
* refletir Bump quando existir.

### **11\. Finalizar UX do Order Bump**

Quando houver oferta:

\[Aproveitar\]  
\[Continuar sem oferta\]

No máximo uma oferta principal visível por vez.

Futuramente, carrossel de até 3 ofertas.

### **12\. Melhorar a confirmação final**

A ideia aprovada é:

> Seu agendamento com **\[barbeiro\]** foi confirmado com sucesso. Te esperamos ansiosamente.

Depois:

> **Quer receber um lembrete 30 minutos antes do seu horário?**

\[ Sim, quero ser lembrado \]  
\[ Não, obrigado \]

Essa parte pode ficar preparada agora e a automação de WhatsApp entrar depois.

---

# **🔴 P0 de segurança**

### **13\. Auth do Admin**

Precisamos fechar:

/login  
↓  
Supabase Auth  
↓  
/admin

Sem autenticação:

→ /login

### **14\. RLS definitivo**

Esse é um dos pontos mais importantes do projeto.

Precisamos garantir que:

* cliente não veja dados administrativos;  
* clientes não fiquem expostos;  
* financeiro não fique público;  
* uma barbearia não veja outra;  
* apenas o necessário seja público;  
* nenhuma policy permissiva permaneça sem justificativa.

---

# **🟠 P1 — Admin**

### **15\. Nome e função no topo**

Trocar:

> Painel do barbeiro

por:

Paulo | Admin

ou:

Paulo | Barbeiro

dinamicamente.

### **16\. Modal próprio para todas as exclusões**

Nenhum:

window.confirm()

Usar sempre modal visual próprio.

### **17\. Serviços e Produtos separados corretamente**

A área deve ser:

Serviços  
Produtos

e não somente “Produtos Order Bump”.

O produto é catálogo.

Depois ele pode ser marcado como:

* produto normal;  
* Order Bump.

### **18\. Configuração de Order Bump pelo Admin**

Futuro próximo:

Produto  
↓  
Marcar como Order Bump  
↓  
Definir oferta  
↓  
Cliente recebe

Com limite de até 3 ofertas no conjunto.

**✅ Implementado (Bloco 11):** o Master configura Order Bumps na aba própria "Order Bumps" em "Serviços & Produtos" (`AdminServicos.tsx`). Apenas o Master enxerga essa página (menu `roles: ['master']`). Por produto ativo: Switch "Ativar como Order Bump" (alterna `is_order_bump`) e "Editar oferta" (modal de produto com `nome`, `descricao`, `preco_original` e `preco_bump`). Reutiliza o schema existente — nenhuma migration nova (sem inventar `destaque`/`ordem`). O Cliente respeita o limite de 3 bumps ativos por vez.

**Melhoria (`/admin/servicos` — atualização sem reload + pesquisa):**
- **Toggle Order Bump / ativo sem reload:** atualização otimista (UI muda na hora, sem `fetchData()`/spinner, sem reordenação, sem mover o card, sem scroll). Persistência em background com rollback + aviso amigável em caso de erro. Lock assíncrono por item (`toggleLockRef`) evita duplo clique/mutações simultâneas.
- **Pesquisa nas 3 abas** (Serviços, Produtos, Order Bumps) via `SearchInput` existente (lupa + gap lateral + limpar com X), filtro instantâneo por nome, estado vazio amigável, pesquisa limpa ao trocar de aba.
- **Causa do flicker corrigida:** `toggleOrderBump`/`toggleAtivo` chamavam `fetchData()` (que ativava `loading = true` → spinner + remount da grade + reordenação por `created_at DESC`). Removido o refetch dos toggles.

### **19\. Fotos dos profissionais**

Cada barbeiro precisa poder ter:

* foto;  
* nome;  
* especialidade;  
* status.

Upload via Storage.

---

# **🟠 P1 — Dados e infraestrutura**

### **20\. Configurações da barbearia**

Tirar hardcodes e permitir configurar:

* nome;  
* logo;  
* WhatsApp;  
* Instagram;  
* telefone;  
* endereço;  
* horário de funcionamento.

### **21\. Supabase Storage**

Para imagens:

Upload  
→ validação  
→ Storage  
→ URL  
→ banco

Nunca Base64 na interface.

### **22\. Busca e paginação**

Garantir que a busca não fique limitada apenas aos dados da página atual.

### **23\. Timezone**

Centralizar helpers de data local e não voltar para:

new Date().toISOString().split('T')\[0\]  
---

# **🟡 P2 — Melhorias de produto**

### **24\. Month View**

A agenda ainda precisa de uma visão mensal completa.

### **25\. Refinamento da WeekView**

Melhorar:

* sobreposição;  
* navegação;  
* detalhes;  
* experiência visual.

### **26\. Tratamento de erros/toasts**

Padronizar:

* sucesso;  
* erro;  
* loading;  
* conflito;  
* ausência de dados.

### **27\. Google Calendar**

Primeiro algo simples.

Depois:

* OAuth;  
* sincronização;  
* webhooks.

### **28\. WhatsApp**

Inicialmente:

wa.me

Depois:

* API oficial;  
* notificações;  
* lembretes automáticos.

---

# **🔵 Features futuras**

### **29\. Área do Cliente**

Depois do booking estabilizado:

Agendamento  
↓  
criação de conta  
↓  
Área do Cliente

Com:

* meus agendamentos;  
* novo agendamento;  
* cancelar;  
* histórico;  
* contato.

### **30\. Upsell avançado**

Melhorar a etapa pós-compra.

### **31\. Assinaturas**

Planos, recorrência, benefícios etc.

### **32\. Histórico avançado de cliente**

### **33\. Estoque**

### **34\. Landing Page da barbearia**

A LP persuasiva que você mencionou fica separada da LinkPage.

---

---

# **✅ Concluído — Responsividade do Admin (mobile-first) e unificação de calendários**

Série de blocos de responsividade/mobile-first para o painel Admin, validados por bloco (checkpoint do usuário). Alterações apenas **visuais/UI** — nenhuma regra de negócio, Supabase, RLS, migration, rota, auth, timezone ou fluxo funcional foi alterado.

### **Bloco 1 (P0) — Responsividade da agenda**
- WeekView mobile usando DayView.
- `AdminAgendaContent` com linhas de dia `flex-col sm:flex-row`.
- Header `AdminAgendamentos` responsivo.
- Typecheck ✅, build ✅.

### **Bloco 2 (P1) — Financeiro / Comissão / PeriodFilter / Serviços**
- Grids de KPI: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
- Valores: `text-2xl sm:text-3xl`.
- Resumo do Período: `grid-cols-1 sm:grid-cols-3`.
- Botão de exclusão: `sm:opacity-0 sm:group-hover:opacity-100`.
- PeriodFilter dropdown: `left-0 sm:left-auto sm:right-0 max-w-[calc(100vw-1rem)]`.
- Grids de modal: `grid-cols-1 sm:grid-cols-2`; footer de modal `flex flex-col-reverse sm:flex-row`.
- Typecheck ✅, build ✅.

### **Bloco 3 (P2) — Card / Modal / títulos**
- Card base: `p-4 sm:p-6`.
- Modal: `p-4 sm:p-6`, título `text-xl sm:text-2xl`, header `mb-4 sm:mb-6`, botão fechar `p-2`.
- Títulos de página: `text-3xl sm:text-4xl` em 8 arquivos (Painel, Agendamentos, Clientes, Serviços, Financeiro, Usuários, Minha Agenda, Comissões).
- Typecheck ✅, build ✅.

### **Unificação dos calendários/date-pickers do Admin**
Até a auditoria, o Admin **não** tinha calendário mensal — usava inputs nativos `<input type="date">` (7 ocorrências), além de WeekView/DayView. A tarefa substituiu os nativos por calendário mensal customizado no mesmo padrão visual do “Mais datas” do Cliente.

- **Novo `Admin/src/components/ui/CalendarModal.tsx`** (reutilizável, isolado): modos `single` e `range`; grid Mon-first com `WEEKDAYS ['SEG','TER','QUA','QUI','SEX','SÁB','DOM']`; painel `max-w-[360px] rounded-[22px] bg-[#141414] border-white/15 p-5 shadow-[0_30px_70px_rgba(0,0,0,0.55)]`; nav de mês 36px; células `aspect-square rounded-[10px]`; selecionado `bg-highlight text-black`, hoje `ring-highlight/50`, disabled `opacity-40`; range com Cancelar/Aplicar; `z-[60]` (acima do Modal do app `z-50` e dropdown PeriodFilter `z-50`). Helpers locais: `toDate`/`formatYMD`/`moveMonth`/`getMonthMatrix`.
- **`AdminAgendamentos.tsx`:** estado `calOpen`; semana/dia/nav e campo “Data do Agendamento” abrem CalendarModal (single); usa `formatDateBR`.
- **`AdminAgendaContent.tsx`:** folgas “Início”/“Fim” abrem CalendarModal single via `calFocus`; usa `formatDateBR`.
- **`PeriodFilter.tsx`:** substituídos inputs De/Até por botão “Escolher intervalo” (exibe “DD/MM — DD/MM”); CalendarModal mode `range` (start/end values + `onApply`); o botão “Aplicar intervalo” segue como confirmação única.
- **Validação:** nenhum `<input type="date">` restante no Admin (grep); typecheck ✅; build ✅ (apenas aviso pré-existente de chunk > 500 kB); lint com 15 problemas **pré-existentes**, nenhum introduzido. Observação: `cn` (`lib/utils.ts`) é **apenas joiner sem tailwind-merge** — não confiar em override de classes conflitantes.

---

---

# **✅ Concluído — Financeiro (unificação da fonte de verdade de receita)**

Fechou o problema #42 ("Dashboard mostra faturamento, mas Financeiro não contabiliza corretamente") atacando a duplicação de lógica. Antes havia **dois modelos divergentes**: Dashboard + Financeiro liam `transacoes_financeiras` (tipo `receita`), enquanto a Comissão do Barbeiro lia `agendamentos` concluídos + `vendas_bump`. Além disso, a receita dependia de clicar em *Concluir* (que inseria transação automática, com regra duplicada em `AdminDashboard` e `AdminAgendamentos`), e o Order Bump **não** entrava na receita (contrariando a regra #41: `receita = serviço + bump`).

- **`Admin/src/lib/financeService.ts` (novo, fonte de verdade única):**
  - `fetchFinanceiroPeriodo(range, { professionalId? })` → `receita = Σ valor_servico (concluídos) + Σ vendas_bump.valor_pago + Σ receitas manuais sem vínculo`; `despesas`; `saldo`; `concluidos`; `ticketMedio`.
  - `fetchFinanceiroPorDia(range, { professionalId? })` → balanço diário para os gráficos (cap 31 dias).
- **Consumo unificado:** `AdminDashboard` (Faturamento/ticket/gráfico), `AdminFinanceiro` master (KPIs + gráfico; lista de transações via `transacoes_financeiras` para CRUD manual), `ComissaoBarbeiro` (totais via `professionalId`).
- **`updateStatus('concluido')` não insere mais transação automática** (Dashboard + Agendamentos) — evita dupla contagem; transações históricas com `agendamento_id` são ignoradas no cálculo.
- **Regra preservada:** AGENDADO não gera receita; CONCLUÍDO gera (serviço + bump); CANCELADO não gera. Filtros de período/profissional mantidos. Sem migration/RLS/Supabase alterados.
- **Validação:** typecheck ✅, build ✅ (aviso pré-existente de chunk grande), lint com os mesmos 15 problemas pré-existentes.
- **Correção do KPI "Atendimentos" do Painel:** relatado 0 apesar de agendamentos concluídos. O número vinha de `agList.length` (sem filtro de status) com o Painel default em **HOJE** → agendamentos de dias passados ficavam fora. Status (`concluido`) estava correto em todas as telas; era **período**, não status. Corrigido: o card passou a exibir `concluidosPeriodo` (`financeService.concluidos`) como número principal com subtítulo "Atendimentos no período", e foi removido o campo morto `agendamentosPeriodo`. Typecheck ✅, build ✅, lint sem novos problemas.

---

# **📌 Ordem Prioritária de Execução**

Para não ficarmos pulando de problema em problema:

1\. 🔴 Exclusão real de usuário  
2\. 🔴 Exclusão de cliente  
3\. 🔴 Agenda individual 100% validada  
4\. 🔴 ~~Financeiro~~  (✅ concluído — unificação da fonte de verdade)  
5\. 🔴 Order Bump fantasma  
6\. 🔴 RLS  
7\. 🔴 Auth Admin

8\. 🟠 Fluxo Serviço → Continuar  
9\. 🟠 ~~8 datas \+ Hoje \+ Mais datas~~  (concluído no Cliente — ver a seção 9)
10\. 🟠 Resumo único  
11\. 🟠 Order Bump UX  
12\. 🟠 Confirmação

13\. 🟠 Configurações da barbearia  
14\. 🟠 Storage  
15\. 🟠 Fotos profissionais

16\. 🔴 Pagamento online  
17\. 🔴 Webhook  
18\. 🟠 Month View / WeekView  
19\. 🟠 Busca / paginação / timezone / toasts

20\. 🔵 Área do Cliente  
21\. 🔵 Upsell avançado  
22\. 🔵 Assinaturas  
23\. 🔵 Google Calendar  
24\. 🔵 WhatsApp API  
25\. 🔵 Estoque  
26\. 🔵 Landing Page

**O ponto mais importante agora:** não considero o MVP pronto para operação enquanto **exclusão, agenda, financeiro, Order Bump, Auth e RLS** não estiverem fechados.

E eu manteria exatamente a estratégia que estamos usando: **um bloco por vez, teste real, checkpoint e só depois o próximo**.

