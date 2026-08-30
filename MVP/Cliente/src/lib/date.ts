// Utilitários de data/hora — sempre operando em horário LOCAL do cliente.
// Evita armadilhas de UTC (ex.: toISOString().split('T')[0] deslocando a data).

/** Data local no formato YYYY-MM-DD (seguro para inputs e chaves de dia). */
export function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Hoje (local) como Date zerada em ms. */
export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Adiciona dias a partir de hoje (local), preservando o dia. */
export function getFutureLocalDate(daysFromToday: number): Date {
  const d = today();
  d.setDate(d.getDate() + daysFromToday);
  return d;
}

/** Gera as próximas N datas (local), começando em offsetDays (padrão hoje). */
export function getNextDates(count: number, offsetDays = 0): string[] {
  const dates: string[] = [];
  for (let i = offsetDays; i < offsetDays + count; i++) {
    dates.push(formatDateInput(getFutureLocalDate(i)));
  }
  return dates;
}

/** Converte "YYYY-MM-DD" + "HH:mm" em um Date local. */
export function combineDateAndTime(dateString: string, time: string, seconds = 0): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

/** Formata YYYY-MM-DD para DD/MM/AAAA. */
export function formatDateBR(dateString: string): string {
  const [y, m, d] = dateString.split('-');
  return `${d}/${m}/${y}`;
}

/** Dia da semana abreviado (SEG, TER, ...) a partir de YYYY-MM-DD. */
export function formatWeekdayShort(dateString: string): string {
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '').toUpperCase();
}

/** Data resumida "DD/MM" a partir de YYYY-MM-DD (para chips de dia). */
export function formatDayMonth(dateString: string): string {
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
}

/** Data longa "Sábado, 29 de agosto" a partir de YYYY-MM-DD (para o destaque HOJE). */
export function formatTodayLong(dateString: string): string {
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);
  const day = new Intl.DateTimeFormat('pt-BR', { day: 'numeric' }).format(date);
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
  return `${weekday[0].toUpperCase()}${weekday.slice(1)}, ${day} de ${month}`;
}

/** Soma `minutes` a "HH:mm" retornando "HH:mm" (ex.: 09:00 + 40 = 09:40; 09:30 + 70 = 10:40). */
export function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Converte "HH:mm" em minutos absolutos do dia. */
export function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

/** Gera os horários de funcionamento em "HH:mm" com intervalo dado. */
export function generateBusinessSlots(startHour: number, endHour: number, intervalMinutes: number): string[] {
  const slots: string[] = [];
  for (let m = startHour * 60; m + intervalMinutes <= endHour * 60; m += intervalMinutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
  }
  return slots;
}

/** Verifica sobreposição de dois intervalos [startA,endA] x [startB,endB] (em minutos do dia). */
export function overlaps(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && endA > startB;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/** Muda o mês preservando o dia (evita overflow como 31 -> 1 do mês seguinte). */
export function moveMonth(date: Date, delta: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + delta, 1);
  return d;
}

/** Título de mês/ano em pt-BR, ex.: "Setembro de 2026". */
export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

/**
 * Gera a matriz de um mês como semanas, cada posição sendo um Date local ou null.
 * Segunda-feira como primeiro dia da semana.
 */
export function getMonthMatrix(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  // 1 = segunda ... 7 = domingo (getDay(): 0=domingo)
  const firstWeekday = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Retorna o rótulo de um dia da semana (SEG, TER, ...) em pt-BR. */
export function shortWeekdayLabel(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '').toUpperCase();
}

/** Normaliza duas datas de dia para comparação (mesmo dia local). */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
