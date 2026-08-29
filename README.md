# 💈 Alcateia Barber

> Sistema completo de gestão para barbearias com agendamento online, gestão de profissionais, serviços e uma experiência pública otimizada para conversão.

## 📋 Sobre o projeto

O **Alcateia Barber** foi desenvolvido para ir além de uma agenda tradicional.

A proposta do sistema é conectar a operação da barbearia com uma experiência de agendamento online simples e rápida para o cliente:

```text
Instagram
   ↓
Link na bio
   ↓
Escolha do profissional
   ↓
Escolha do serviço
   ↓
Escolha da data e horário
   ↓
Dados do cliente
   ↓
Resumo da reserva
   ↓
Oferta adicional (Order Bump)
   ↓
Pagamento online ou no local
   ↓
Confirmação
```

Enquanto o cliente possui uma experiência simples e mobile-first, a plataforma é preparada para evoluir como um sistema completo de gestão da barbearia.

---

## ✨ Principais funcionalidades

### 👤 Área pública

- Página pública otimizada para acesso via Instagram;
- Escolha de profissional diretamente pela Home;
- Opção de agendar com qualquer profissional disponível;
- Seleção de serviços;
- Seleção de data e horário;
- Validação de disponibilidade;
- Cadastro rápido sem necessidade de criar conta;
- Resumo do agendamento;
- Order Bump antes do pagamento;
- Pagamento online;
- Opção de pagamento no local;
- Upsell após o fluxo de pagamento/reserva;
- Confirmação do agendamento;
- Integração preparada para WhatsApp;
- Integração preparada para calendário.

### 💈 Gestão da barbearia

A arquitetura do projeto também contempla a evolução para funcionalidades como:

- Gestão de profissionais;
- Gestão de serviços;
- Gestão de produtos;
- Agenda diária, semanal e mensal;
- Controle de agendamentos;
- Controle financeiro;
- Gestão de clientes;
- Controle de disponibilidade;
- Configurações da barbearia.

---

## 🛠️ Stack

O projeto utiliza uma stack moderna e focada em performance:

- **React**
- **Vite**
- **TypeScript**
- **Tailwind CSS**
- **React Router**
- **Supabase**
- **PostgreSQL**
- **Recharts**
- **Lucide React**
- **date-fns**

---

## 🧠 Regras importantes do produto

### Profissional pré-selecionado

Quando o cliente escolhe um profissional diretamente na página inicial, essa escolha deve ser preservada durante todo o fluxo.

```text
Profissional
↓
Serviço
↓
Data
↓
Horário
```

O sistema não deve perguntar novamente qual profissional o cliente deseja.

### Disponibilidade

A disponibilidade é baseada na sobreposição real de intervalos:

```text
candidateStart < existingEnd
AND
candidateEnd > existingStart
```

Agendamentos cancelados não devem bloquear horários.

### Receita

Um agendamento não representa automaticamente receita realizada.

- **Agendado:** não gera receita realizada;
- **Concluído:** gera receita;
- **Cancelado:** não gera receita.

### Pagamento

O método e o status do pagamento são tratados separadamente.

**Método:**

- `online`
- `in_person`

**Status:**

- `pending`
- `paid`
- `failed`
- `refunded`

O retorno do navegador após um checkout não deve ser considerado confirmação definitiva de pagamento. A confirmação deve ser preparada para ocorrer por meio de webhook.

### Order Bump e Upsell

O sistema diferencia claramente os dois conceitos:

- **Order Bump:** acontece antes do pagamento;
- **Upsell:** acontece após o pagamento ou criação da reserva.

A experiência pública deve trabalhar com apenas uma oferta principal de Order Bump por vez, evitando excesso de decisões para o cliente.

---

## 🎨 Design

A identidade visual segue uma direção premium, minimalista e tecnológica.

### Cores principais

```text
Background: #0A0A0A
Texto:      #F5F1EA
Accent:     Azul / Ciano
Sucesso:    #81FF4D
Perigo:     #F51D1D
```

A área pública é desenvolvida com foco em:

- Mobile-first;
- Performance;
- Hierarquia visual;
- Pouca fricção;
- Facilidade de uso;
- Conversão.

---

## 🚀 Executando o projeto

### Instalar dependências

```bash
npm install
```

### Executar em desenvolvimento

```bash
npm run dev
```

### Gerar build de produção

```bash
npm run build
```

---

## 🎯 Visão

O objetivo do Alcateia Barber é construir uma plataforma que una:

> **Sistema de gestão de barbearia + Agenda inteligente + Agendamento online + Monetização.**

O cliente deve conseguir marcar um horário de forma rápida e intuitiva.

O barbeiro deve possuir uma base sólida para gerenciar a operação e acompanhar o crescimento do negócio.

---

## 📌 Status do projeto

🚧 **Em desenvolvimento ativo**

A prioridade atual é evoluir continuamente a experiência de agendamento público e consolidar as funcionalidades necessárias para o MVP operacional.

---

Desenvolvido para o projeto **Alcateia Barber**. 💈
