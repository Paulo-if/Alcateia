import { supabase } from '@/lib/supabase';
import { formatDayMonth } from '@/lib/utils';
import type { DateRange } from '@/components/ui/PeriodFilter';

export interface FinanceiroPeriodo {
  receitaServicos: number;
  receitaBumps: number;
  receitasManuais: number;
  despesas: number;
  receita: number;
  saldo: number;
  concluidos: number;
  ticketMedio: number;
}

interface AgendamentoComBumps {
  id: string;
  valor_servico: number;
  bumps: { valor_pago: number; agendamento_id: string }[] | null;
}

/**
 * Fonte de verdade única para o financeiro de um período.
 *
 * Regra (Contexto #41):
 *  - AGENDADO   -> não é receita;
 *  - CONCLUÍDO  -> gera receita (serviço + order bump);
 *  - CANCELADO  -> não gera receita.
 *
 * Receita do período = soma de `valor_servico` dos agendamentos CONCLUÍDOS
 *   + soma de `vendas_bump.valor_pago` vinculadas a esses agendamentos
 *   + receitas lançadas MANUALMENTE em `transacoes_financeiras`
 *     (tipo 'receita' SEM vínculo com agendamento, para não duplicar).
 *
 * Despesa do período = soma de `transacoes_financeiras` tipo 'despesa'.
 */
export async function fetchFinanceiroPeriodo(
  range: DateRange,
  opts?: { professionalId?: string },
): Promise<FinanceiroPeriodo> {
  const startISO = range.startDate.toISOString();
  const endISO = range.endDate.toISOString();

  let conclusosQ = supabase
    .from('agendamentos')
    .select('id, valor_servico, bumps:vendas_bump(valor_pago, agendamento_id)')
    .eq('status', 'concluido')
    .gte('data_inicio', startISO)
    .lte('data_inicio', endISO);

  if (opts?.professionalId) {
    conclusosQ = conclusosQ.eq('professional_id', opts.professionalId);
  }

  const [{ data: agData }, { data: transData }] = await Promise.all([
    conclusosQ,
    supabase
      .from('transacoes_financeiras')
      .select('*')
      .gte('created_at', startISO)
      .lte('created_at', endISO),
  ]);

  const agList = (agData as AgendamentoComBumps[] | null) ?? [];
  const transList = (transData as Array<{
    tipo: string;
    valor: number;
    agendamento_id: string | null;
  }> | null) ?? [];

  let receitaServicos = 0;
  let receitaBumps = 0;
  for (const ag of agList) {
    receitaServicos += ag.valor_servico;
    for (const bump of ag.bumps ?? []) {
      receitaBumps += bump.valor_pago;
    }
  }

  const receitasManuais = transList
    .filter((t) => t.tipo === 'receita' && !t.agendamento_id)
    .reduce((s, t) => s + t.valor, 0);

  const despesas = transList
    .filter((t) => t.tipo === 'despesa')
    .reduce((s, t) => s + t.valor, 0);

  const receita = receitaServicos + receitaBumps + receitasManuais;
  const saldo = receita - despesas;
  const concluidos = agList.length;
  const ticketMedio = concluidos > 0 ? receita / concluidos : 0;

  return {
    receitaServicos,
    receitaBumps,
    receitasManuais,
    despesas,
    receita,
    saldo,
    concluidos,
    ticketMedio,
  };
}

interface DiaFinanceiro {
  dia: string;
  receita: number;
  despesa: number;
  saldo: number;
}

/**
 * Balanço diário do período (fonte de verdade) para os gráficos.
 * Receita = agendamentos CONCLUÍDOS (serviço + bump) + receitas manuais sem vínculo.
 * Despesa = transações tipo 'despesa'.
 * Saldo = receita - despesa.
 */
export async function fetchFinanceiroPorDia(
  range: DateRange,
  opts?: { professionalId?: string },
): Promise<DiaFinanceiro[]> {
  const startISO = range.startDate.toISOString();
  const endISO = range.endDate.toISOString();

  let conclusosQ = supabase
    .from('agendamentos')
    .select('data_inicio, valor_servico, bumps:vendas_bump(valor_pago)')
    .eq('status', 'concluido')
    .gte('data_inicio', startISO)
    .lte('data_inicio', endISO);

  if (opts?.professionalId) {
    conclusosQ = conclusosQ.eq('professional_id', opts.professionalId);
  }

  const [{ data: agData }, { data: transData }] = await Promise.all([
    conclusosQ,
    supabase
      .from('transacoes_financeiras')
      .select('created_at, tipo, valor, agendamento_id')
      .gte('created_at', startISO)
      .lte('created_at', endISO),
  ]);

  const agList = (agData as Array<{
    data_inicio: string;
    valor_servico: number;
    bumps: { valor_pago: number }[] | null;
  }> | null) ?? [];

  const transList = (transData as { tipo: string; valor: number; agendamento_id: string | null; created_at: string }[] | null) ?? [];
  const manuais = transList.filter((t) => t.tipo === 'receita' && !t.agendamento_id);
  const despesas = transList.filter((t) => t.tipo === 'despesa');

  const totalDias = Math.max(1, Math.min(Math.ceil((range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24)), 31));
  const list: DiaFinanceiro[] = [];
  const step = new Date(range.startDate);

  const mesmoDia = (ref: string, date: Date) => {
    const d = new Date(ref);
    return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
  };

  for (let i = 0; i < totalDias; i++) {
    const cur = new Date(step);
    cur.setDate(step.getDate() + i);

    let dayReceita = 0;
    for (const ag of agList) {
      if (!mesmoDia(ag.data_inicio, cur)) continue;
      dayReceita += ag.valor_servico;
      for (const bump of ag.bumps ?? []) dayReceita += bump.valor_pago;
    }
    for (const m of manuais) {
      if (mesmoDia(m.created_at, cur)) dayReceita += m.valor;
    }

    let dayDespesa = 0;
    for (const d of despesas) {
      if (mesmoDia(d.created_at, cur)) dayDespesa += d.valor;
    }

    list.push({ dia: formatDayMonth(cur), receita: dayReceita, despesa: dayDespesa, saldo: dayReceita - dayDespesa });
  }

  return list;
}
