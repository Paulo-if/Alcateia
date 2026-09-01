export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDayMonth(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(d);
}

export function formatWeekday(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
  }).format(d);
}

/** Formata "YYYY-MM-DD" para "DD/MM/AAAA" sem deslocamento de timezone. */
export function formatDateBR(dateString: string): string {
  const [y, m, d] = dateString.split('-');
  return `${d}/${m}/${y}`;
}

/** Formata data no formato local YYYY-MM-DD para inputs sem erro de timezone UTC */
export function formatDateInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStartOfDay(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfDay(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getStartOfWeek(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const day = d.getDay(); // 0 = Domingo, 1 = Segunda
  const diff = d.getDate() - (day === 0 ? 6 : day - 1); // ajusta para segunda-feira
  const monday = new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0);
  return monday;
}

export function getEndOfWeek(date: Date | string = new Date()): Date {
  const start = getStartOfWeek(date);
  const sunday = new Date(start);
  sunday.setDate(start.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

export function getStartOfMonth(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function getEndOfMonth(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function generateTimeSlots(
  date: Date,
  startHour: number,
  endHour: number,
  intervalMinutes: number,
): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      const slot = new Date(date);
      slot.setHours(h, m, 0, 0);
      slots.push(slot.toISOString());
    }
  }
  return slots;
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
