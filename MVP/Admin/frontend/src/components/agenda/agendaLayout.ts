// -----------------------------------------------------------------------------
// Layout de sobreposição de eventos para a grade de horários (WeekView).
// -----------------------------------------------------------------------------
// Algoritmo determinístico e preditível, sem dependências externas:
//  1. os eventos são particionados em CLUSTERS de sobreposição encadeada
//     (dois eventos sobrepõem quando `inicioA < fimB && fimA > inicioB`);
//  2. dentro de cada cluster, cada evento recebe uma COLUNA (coloração greedy
//     por hora de início) de modo que eventos concorrentes nunca dividam a
//     mesma coluna ao mesmo tempo;
//  3. largura = 100% / (nº máximo de colunas do cluster) e
//     left     = coluna * largura.
//
// Funciona para 1, 2, 3, 4 ou N eventos simultâneos, sem esconder cards e sem
// offsets hardcoded. Clusteragens independentes (sem sobreposição) ocupam 100%
// da coluna do dia normalmente.
// -----------------------------------------------------------------------------

export interface LayoutEventInput {
  id: string;
  startMinutes: number;
  endMinutes: number;
}

export interface LayoutPosition {
  leftPct: number;
  widthPct: number;
}

export function computeOverlapLayout(
  events: LayoutEventInput[],
): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();
  if (events.length === 0) return positions;

  const sorted = [...events].sort(
    (a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes,
  );

  // 1) Particionar em clusters de sobreposição encadeada.
  const clusters: LayoutEventInput[][] = [];
  let current: LayoutEventInput[] = [];
  let clusterEnd = Number.NEGATIVE_INFINITY;

  for (const ev of sorted) {
    if (current.length === 0 || ev.startMinutes < clusterEnd) {
      current.push(ev);
      clusterEnd = Math.max(clusterEnd, ev.endMinutes);
    } else {
      clusters.push(current);
      current = [ev];
      clusterEnd = ev.endMinutes;
    }
  }
  if (current.length > 0) clusters.push(current);

  // 2) Atribuir colunas dentro de cada cluster (greedy por início).
  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    const assignment = new Map<string, number>();

    for (const ev of cluster) {
      let col = -1;
      for (let c = 0; c < columnEnds.length; c++) {
        if (columnEnds[c] <= ev.startMinutes) {
          col = c;
          break;
        }
      }
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(ev.endMinutes);
      } else {
        columnEnds[col] = ev.endMinutes;
      }
      assignment.set(ev.id, col);
    }

    const maxColumns = Math.max(1, columnEnds.length);
    const widthPct = 100 / maxColumns;
    for (const ev of cluster) {
      positions.set(ev.id, {
        leftPct: (assignment.get(ev.id) ?? 0) * widthPct,
        widthPct,
      });
    }
  }

  return positions;
}