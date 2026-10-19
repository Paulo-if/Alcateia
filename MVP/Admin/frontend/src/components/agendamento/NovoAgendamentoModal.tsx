import { useEffect, useState } from 'react';
import { Calendar, ChevronDown, AlertTriangle, UserCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDateBR, formatDateInput, cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CalendarModal } from '@/components/ui/CalendarModal';
import { ServiceSearchSelect } from '@/components/ui/ServiceSearchSelect';
import { TimeSlotPicker } from '@/components/ui/TimeSlotPicker';
import { maskPhone, normalizePhone } from '@/lib/phone';
import type { Servico, Profissional, ProfessionalSchedule } from '@/types';

const timeToMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const minToTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const slotMin = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};

interface NovoAgendamentoModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  initialDate?: string;
  initialTime?: string;
  initialProfissionalId?: string;
}

export function NovoAgendamentoModal({
  open,
  onClose,
  onCreated,
  initialDate,
  initialTime,
  initialProfissionalId,
}: NovoAgendamentoModalProps) {
  const { isMaster, isBarbeiro, usuario } = useAuth();

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);

  const [newServicoId, setNewServicoId] = useState('');
  const [newDate, setNewDate] = useState(formatDateInput(new Date()));
  const [newTime, setNewTime] = useState('09:00');
  const [newProfissionalId, setNewProfissionalId] = useState('');
  const [newNome, setNewNome] = useState('');
  const [newTelefone, setNewTelefone] = useState('');
  const [newObs, setNewObs] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  // Horários disponíveis do profissional + data (whitelist do TimeSlotPicker).
  // null = ainda carregando / sem barbeiro definido.
  const [availableSlots, setAvailableSlots] = useState<string[] | null>(null);

  // TASK 13 — barbeiro sem agenda configurada não pode RECEBER agendamentos (validado no submit).
  // NÃO filtra mais o seletor: todo profissional ATIVO aparece (lista ≠ disponibilidade).
  const [schedulesAtivos, setSchedulesAtivos] = useState<ProfessionalSchedule[] | null>(null);
  const isSchedulable = (id: string) => {
    if (schedulesAtivos === null) return true; // ainda carregando -> agir normalmente
    return schedulesAtivos.some((s) => s.professional_id === id);
  };

  // Preenche/limpa o formulário sempre que o modal abre.
  useEffect(() => {
    if (!open) return;
    setNewDate(initialDate ?? formatDateInput(new Date()));
    setNewTime(initialTime ?? '09:00');
    setNewProfissionalId(
      isBarbeiro ? (usuario?.profissional_id ?? '') : (initialProfissionalId ?? ''),
    );
    setNewServicoId('');
    setNewNome('');
    setNewTelefone('');
    setNewObs('');
    setCreateError(null);
  }, [open, isBarbeiro, usuario?.profissional_id, initialDate, initialTime, initialProfissionalId]);

  // Dados de apoio: serviços, profissionais e expedientes ativos.
  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: servData }, { data: profData }, { data: schedData }] = await Promise.all([
        supabase.from('servicos').select('*').eq('ativo', true).order('ordem'),
        supabase.from('profissionais').select('*').order('name'),
        supabase
          .from('professional_schedules')
          .select('professional_id, day_of_week, start_time, end_time')
          .eq('active', true),
      ]);
      setServicos((servData as Servico[]) ?? []);
      setProfissionais((profData as Profissional[]) ?? []);
      setSchedulesAtivos((schedData as ProfessionalSchedule[] | null) ?? []);
    })();
  }, [open]);

  // Guarda: se o modal abriu com um barbeiro que NÃO está ativo (ex.: abertura
  // rápida a partir do filtro histórico do Dashboard/agenda antiga), limpa a
  // seleção — somente profissionais ativos podem receber novos agendamentos.
  useEffect(() => {
    if (!open || !isMaster || !newProfissionalId || profissionais.length === 0) return;
    if (!profissionais.some((p) => p.active && p.id === newProfissionalId)) {
      setNewProfissionalId('');
    }
  }, [open, isMaster, newProfissionalId, profissionais]);

  // Disponibilidade do profissional na data escolhida:
  // expediente ativo (professional_schedules) + folgas (professional_time_off)
  // + conflitos de agendamento (double-booking). Gera a whitelist para o time picker.
  useEffect(() => {
    if (!open || !newDate) {
      setAvailableSlots(null);
      return;
    }
    const profId = isBarbeiro ? (usuario?.profissional_id ?? '') : newProfissionalId;
    if (!profId) {
      setAvailableSlots(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setAvailableSlots(null);
      try {
        const dow = (new Date(`${newDate}T00:00:00`).getDay() + 6) % 7 + 1;
        const [offRes, busyRes] = await Promise.all([
          supabase
            .from('professional_time_off')
            .select('start_date, end_date')
            .eq('professional_id', profId),
          supabase
            .from('agendamentos')
            .select('data_inicio, data_fim')
            .neq('status', 'cancelado')
            .gte('data_inicio', `${newDate}T00:00:00`)
            .lte('data_inicio', `${newDate}T23:59:59.999`),
        ]);

        if (cancelled) return;

        const emFolga = (offRes.data ?? []).some(
          (o: { start_date: string; end_date: string }) =>
            newDate >= o.start_date && newDate <= o.end_date,
        );
        const sched = schedulesAtivos?.find(
          (s) => s.professional_id === profId && s.day_of_week === dow,
        );

        // Folga cobre a data ou sem expediente ativo no dia -> nenhum horário disponível.
        if (emFolga || !sched) {
          setAvailableSlots([]);
          return;
        }

        const startMin = timeToMin(sched.start_time);
        const endMin = timeToMin(sched.end_time);
        const servico = servicos.find((s) => s.id === newServicoId);
        const duracao = servico?.duracao_minutos ?? 30;

        const busy = (busyRes.data ?? []) as Array<{ data_inicio: string; data_fim: string }>;
        const ocupado = (iniMin: number, fimMin: number) =>
          busy.some((a) => {
            const aIni = slotMin(a.data_inicio);
            const aFim = slotMin(a.data_fim);
            return aIni < fimMin && aFim > iniMin;
          });

        const slots: string[] = [];
        for (let m = startMin; m + duracao <= endMin; m += 30) {
          if (ocupado(m, m + duracao)) continue;
          slots.push(minToTime(m));
        }

        if (!cancelled) setAvailableSlots(slots);
      } catch {
        if (!cancelled) setAvailableSlots(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    newDate,
    newProfissionalId,
    newServicoId,
    isBarbeiro,
    usuario?.profissional_id,
    schedulesAtivos,
    servicos,
  ]);

  const handleCreate = async () => {
    setCreateError(null);

    if (!newServicoId) {
      setCreateError('Por favor, selecione um serviço.');
      return;
    }
    if (!newDate || !newTime) {
      setCreateError('Selecione data e horário para o agendamento.');
      return;
    }
    if (!newProfissionalId) {
      setCreateError('Selecione o barbeiro responsável pelo agendamento.');
      return;
    }
    if (availableSlots && !availableSlots.includes(newTime)) {
      setCreateError('Horário indisponível para o barbeiro selecionado nesta data.');
      return;
    }

    // TASK 13 — barbeiro sem agenda configurada não pode receber agendamentos.
    const profParaValidar = isBarbeiro
      ? (usuario?.profissional_id ?? '')
      : newProfissionalId;
    if (!profParaValidar || !isSchedulable(profParaValidar)) {
      setCreateError(
        isBarbeiro
          ? 'Sua agenda ainda não está configurada. Configure o expediente em "Minha Agenda" para receber agendamentos.'
          : 'Este barbeiro ainda não configurou a agenda. Escolha um barbeiro com expediente definido.',
      );
      return;
    }
    if (!newNome.trim()) {
      setCreateError('Informe o nome do cliente.');
      return;
    }
    if (!newTelefone.trim()) {
      setCreateError('Informe o telefone do cliente.');
      return;
    }

    setCreating(true);
    try {
      const servico = servicos.find((s) => s.id === newServicoId);
      if (!servico) {
        setCreateError('Serviço inválido.');
        setCreating(false);
        return;
      }

      const dataInicio = new Date(`${newDate}T${newTime}:00`);
      const duracaoMs = (servico.duracao_minutos || 30) * 60 * 1000;
      const dataFim = new Date(dataInicio.getTime() + duracaoMs);

      // Prevenção estrita de Double-Booking: candidateStart < existingEnd AND candidateEnd > existingStart
      let conflitoQuery = supabase
        .from('agendamentos')
        .select('id, data_inicio, data_fim')
        .neq('status', 'cancelado')
        .lt('data_inicio', dataFim.toISOString())
        .gt('data_fim', dataInicio.toISOString());

      // Escopar a checagem ao profissional que será atribuído (barbeiro ou master).
      const profParaChecagem = isBarbeiro
        ? (usuario?.profissional_id ?? null)
        : (newProfissionalId || null);
      if (profParaChecagem) {
        conflitoQuery = conflitoQuery.eq('professional_id', profParaChecagem);
      }

      const { data: conflitos, error: checkError } = await conflitoQuery;

      if (checkError) {
        setCreateError('Erro ao validar disponibilidade de horário.');
        setCreating(false);
        return;
      }

      if (conflitos && conflitos.length > 0) {
        setCreateError('⚠️ Horário indisponível! Já existe um agendamento reservado neste intervalo.');
        setCreating(false);
        return;
      }

      // Encontrar ou criar cliente
      const telefoneNormalizado = normalizePhone(newTelefone);
      let clienteId: string | null = null;
      const { data: existingCli } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefone', telefoneNormalizado)
        .maybeSingle();

      if (existingCli) {
        clienteId = existingCli.id;
      } else {
        const { data: newCli } = await supabase
          .from('clientes')
          .insert({ nome: newNome.trim(), telefone: telefoneNormalizado })
          .select('id')
          .single();
        if (newCli) clienteId = newCli.id;
      }

      // Inserir agendamento (STATUS: 'agendado' — não gera receita antes de concluir!)
      // Atribui o profissional: barbeiro => ele mesmo; master => escolha explícita.
      const profissionalParaAtribuir = isBarbeiro
        ? (usuario?.profissional_id ?? null)
        : (newProfissionalId || null);

      const { data: novoAgendamento, error: insertError } = await supabase
        .from('agendamentos')
        .insert({
          cliente_id: clienteId,
          servico_id: newServicoId,
          professional_id: profissionalParaAtribuir,
          data_inicio: dataInicio.toISOString(),
          data_fim: dataFim.toISOString(),
          status: 'agendado',
          valor_servico: servico.preco,
          observacoes: newObs.trim() || null,
        })
        .select('*')
        .single();

      if (insertError || !novoAgendamento) {
        setCreateError('Erro ao salvar agendamento.');
        setCreating(false);
        return;
      }

      onCreated?.();
      onClose();
    } catch {
      setCreateError('Ocorreu um erro ao processar o agendamento.');
    }
    setCreating(false);
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Novo Agendamento" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">
              Serviço *
            </label>
            <ServiceSearchSelect
              servicos={servicos}
              value={newServicoId}
              onChange={setNewServicoId}
              error={!!createError && !newServicoId}
            />
          </div>

          {isMaster && (
            <div>
              <label className="block text-xs font-medium text-cream/60 mb-1.5">
                Barbeiro *
              </label>
              <div className="relative">
                <UserCircle2
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/40 pointer-events-none"
                />
                <select
                  value={newProfissionalId}
                  onChange={(e) => setNewProfissionalId(e.target.value)}
                  className={cn(
                    'w-full appearance-none bg-[#121212] border rounded-xl pl-9 pr-8 py-2.5 text-xs text-[#F5F1EA] outline-none transition-colors cursor-pointer',
                    createError && !newProfissionalId
                      ? 'border-danger/50'
                      : 'border-white/10 focus:border-highlight/50',
                  )}
                  aria-label="Selecionar barbeiro"
                >
                  <option value="" className="bg-[#121212]">
                    Selecione o barbeiro...
                  </option>
                  {profissionais
                    .filter((p) => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#121212]">
                        {p.name}
                      </option>
                    ))}
                  {profissionais.length === 0 && (
                    <option value="" disabled className="bg-[#121212]">
                      Nenhum barbeiro ativo cadastrado
                    </option>
                  )}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40 pointer-events-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">
              Data do Agendamento *
            </label>
            <button
              type="button"
              onClick={() => setCalOpen(true)}
              className="w-full flex items-center justify-between gap-2 bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] hover:border-highlight/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Calendar size={15} className="text-highlight shrink-0" />
                {newDate ? formatDateBR(newDate) : 'Selecionar data'}
              </span>
              <ChevronDown size={14} className="text-cream/40 shrink-0" />
            </button>
          </div>

          <div>
            <TimeSlotPicker
              value={newTime}
              onChange={setNewTime}
              disabledTimes={[]}
              availableTimes={availableSlots}
              hint={
                isMaster && !newProfissionalId
                  ? 'Selecione um barbeiro para ver os horários disponíveis.'
                  : availableSlots === null
                    ? 'Carregando horários disponíveis...'
                    : availableSlots.length === 0
                      ? 'Nenhum horário disponível para este barbeiro nesta data.'
                      : undefined
              }
            />
          </div>

          <div className="pt-3 border-t border-white/10 space-y-3">
            <p className="text-xs font-semibold text-[#F5F1EA]">Dados do Cliente</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-cream/50 mb-1">Nome *</label>
                <input
                  type="text"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F1EA] placeholder:text-cream/30 focus:outline-none focus:border-highlight/50"
                />
              </div>
              <div>
                <label className="block text-[11px] text-cream/50 mb-1">Telefone *</label>
                <input
                  type="tel"
                  value={newTelefone}
                  onChange={(e) => setNewTelefone(maskPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F1EA] placeholder:text-cream/30 focus:outline-none focus:border-highlight/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-cream/50 mb-1">Observações</label>
              <textarea
                value={newObs}
                onChange={(e) => setNewObs(e.target.value)}
                placeholder="Ex: Cliente prefere corte na tesoura..."
                rows={2}
                className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F1EA] placeholder:text-cream/30 focus:outline-none focus:border-highlight/50 resize-none"
              />
            </div>
          </div>

          {createError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={creating}
              className="bg-gradient-to-r from-highlight to-[#2bd4ef] text-black font-semibold"
            >
              {creating ? 'Salvando...' : 'Confirmar Agendamento'}
            </Button>
          </div>
        </div>
      </Modal>

      <CalendarModal
        open={calOpen}
        mode="single"
        title="Escolher data"
        value={newDate || null}
        onSelect={setNewDate}
        onClose={() => setCalOpen(false)}
      />
    </>
  );
}