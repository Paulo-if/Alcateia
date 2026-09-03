import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Phone,
  Mail,
  Plus,
  Trash2,
  CalendarDays,
  Wallet,
  Clock,
  Pencil,
  User,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Cliente, Agendamento, Servico } from '@/types';
import { formatCurrency, formatDateTime, formatDate, cn } from '@/lib/utils';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';
import { maskPhone, normalizePhone } from '@/lib/phone';

type ClienteWithStats = Cliente & {
  totalAgendamentos: number;
  totalGasto: number;
  ultimoAgendamento: string | null;
};

type AgendamentoFull = Agendamento & {
  servico: Pick<Servico, 'id' | 'nome' | 'duracao_minutos'> | null;
};

const statusConfig: Record<string, { label: string; variant: 'gold' | 'success' | 'danger' | 'default' }> = {
  agendado: { label: 'Agendado', variant: 'gold' },
  concluido: { label: 'Concluído', variant: 'success' },
  cancelado: { label: 'Cancelado', variant: 'danger' },
};

export function AdminClientes() {
  const [clientes, setClientes] = useState<ClienteWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 24;
  const [selectedCliente, setSelectedCliente] = useState<ClienteWithStats | null>(null);
  const [clienteAgendamentos, setClienteAgendamentos] = useState<AgendamentoFull[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Form state
  const [formNome, setFormNome] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    const { data: cliData } = await supabase
      .from('clientes')
      .select('*')
      .order('nome');

    const cliList = (cliData as Cliente[]) ?? [];

    const enriched: ClienteWithStats[] = await Promise.all(
      cliList.map(async (c) => {
        const { data: ags } = await supabase
          .from('agendamentos')
          .select('*, servico:servicos(id, nome, duracao_minutos)')
          .eq('cliente_id', c.id)
          .order('data_inicio', { ascending: false });

        const agList = (ags as AgendamentoFull[]) ?? [];
        return {
          ...c,
          totalAgendamentos: agList.length,
          totalGasto: agList.filter((a) => a.status !== 'cancelado').reduce((s, a) => s + a.valor_servico, 0),
          ultimoAgendamento: agList.length > 0 ? agList[0].data_inicio : null,
        };
      }),
    );

    setClientes(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const openDetail = async (cliente: ClienteWithStats) => {
    setSelectedCliente(cliente);
    const { data: ags } = await supabase
      .from('agendamentos')
      .select('*, servico:servicos(id, nome, duracao_minutos)')
      .eq('cliente_id', cliente.id)
      .order('data_inicio', { ascending: false });
    setClienteAgendamentos((ags as AgendamentoFull[]) ?? []);
    setDetailOpen(true);
  };

  const openCreate = () => {
    setFormNome('');
    setFormTelefone('');
    setFormEmail('');
    setCreateOpen(true);
  };

  const openEdit = (cliente: ClienteWithStats) => {
    setFormNome(cliente.nome);
    setFormTelefone(maskPhone(cliente.telefone));
    setFormEmail(cliente.email ?? '');
    setSelectedCliente(cliente);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!formNome.trim() || !formTelefone.trim()) return;
    setSaving(true);
    const telefoneNormalizado = normalizePhone(formTelefone);
    if (editOpen && selectedCliente) {
      await supabase
        .from('clientes')
        .update({ nome: formNome.trim(), telefone: telefoneNormalizado, email: formEmail.trim() || null })
        .eq('id', selectedCliente.id);
      setEditOpen(false);
    } else {
      await supabase
        .from('clientes')
        .insert({ nome: formNome.trim(), telefone: telefoneNormalizado, email: formEmail.trim() || null });
      setCreateOpen(false);
    }
    setSaving(false);
    fetchClientes();
  };

  const handleDelete = () => {
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCliente) return;
    setConfirmDeleteOpen(false);
    await supabase.from('clientes').delete().eq('id', selectedCliente.id);
    setDetailOpen(false);
    fetchClientes();
  };

  const filtered = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.telefone.includes(search) ||
      (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-[#F5F1EA] tracking-wide mb-1">
            Clientes
          </h1>
          <p className="text-cream/50 text-sm">
            {clientes.length} clientes cadastrados na sua base.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-gradient-to-r from-highlight to-[#2bd4ef] text-black font-semibold shadow-lg shadow-highlight/20"
        >
          <Plus size={18} />
          Novo Cliente
        </Button>
      </div>

      {/* Componente Reutilizável de Busca */}
      <div className="mb-6">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar por nome, telefone ou e-mail..."
        />
      </div>

      {loading ? (
        <div className="p-16 text-center text-cream/40 text-sm animate-pulse">Carregando clientes...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-white/10 bg-[#121212]">
          <div className="py-12 text-center text-cream/30">
            <Users size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm text-[#F5F1EA] font-medium mb-1">Nenhum cliente encontrado</p>
            <p className="text-xs text-cream/40">Tente buscar por outro termo ou cadastre um novo cliente.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Grid de 5 colunas no Desktop grande */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {paginated.map((cliente) => (
            <div
              key={cliente.id}
              onClick={() => openDetail(cliente)}
              className="bg-[#141414] border border-white/10 hover:border-highlight/40 rounded-2xl p-3.5 transition-all duration-200 hover:scale-[1.01] hover:shadow-xl hover:shadow-black/50 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-xl bg-highlight/10 flex items-center justify-center text-highlight shrink-0 group-hover:bg-highlight group-hover:text-black transition-colors">
                    <User size={15} />
                  </div>
                  <div className="truncate min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm text-[#F5F1EA] truncate group-hover:text-highlight transition-colors">
                      {cliente.nome}
                    </h3>
                  </div>
                </div>

                <div className="space-y-1 mb-3">
                  <p className="text-[11px] text-cream/60 flex items-center gap-1.5 truncate">
                    <Phone size={11} className="text-highlight/70 shrink-0" />
                    <span className="truncate">{cliente.telefone}</span>
                  </p>
                  {cliente.email && (
                    <p className="text-[10px] text-cream/40 flex items-center gap-1.5 truncate">
                      <Mail size={10} className="text-cream/30 shrink-0" />
                      <span className="truncate">{cliente.email}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-[11px]">
                <div>
                  <span className="text-[10px] text-cream/40 block">Visitas</span>
                  <span className="font-semibold text-[#F5F1EA]">{cliente.totalAgendamentos}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-cream/40 block">Gasto Total</span>
                  <span className="font-semibold text-highlight">{formatCurrency(cliente.totalGasto)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Pagination
          page={safePage}
          pageCount={pageCount}
          total={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
        </>
      )}

      {/* ===================== MODAL DE DETALHES ===================== */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Histórico do Cliente"
        maxWidth="max-w-xl"
      >
        {selectedCliente && (
          <div className="space-y-5">
            <div className="flex items-start justify-between bg-white/[0.02] p-4 rounded-xl border border-white/5">
              <div>
                <h3 className="font-display text-2xl text-[#F5F1EA] tracking-wide mb-1">
                  {selectedCliente.nome}
                </h3>
                <p className="text-xs text-cream/60 flex items-center gap-2">
                  <Phone size={13} className="text-highlight" />
                  {selectedCliente.telefone}
                </p>
                {selectedCliente.email && (
                  <p className="text-xs text-cream/60 flex items-center gap-2 mt-1">
                    <Mail size={13} className="text-highlight" />
                    {selectedCliente.email}
                  </p>
                )}
                <p className="text-[11px] text-cream/40 mt-2">
                  Cadastrado em {formatDate(selectedCliente.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetailOpen(false);
                    openEdit(selectedCliente);
                  }}
                  className="p-2 rounded-xl bg-white/5 text-cream/70 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
                  aria-label="Editar cliente"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-2 rounded-xl bg-danger/10 text-danger hover:bg-danger/20 border border-danger/30 transition-colors"
                  aria-label="Excluir cliente"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Stats Rápidos */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-[#121212] border border-white/10 rounded-xl p-3 text-center">
                <CalendarDays size={16} className="text-highlight mx-auto mb-1" />
                <p className="font-display text-xl text-[#F5F1EA]">{selectedCliente.totalAgendamentos}</p>
                <p className="text-[10px] text-cream/40">Agendamentos</p>
              </div>
              <div className="bg-[#121212] border border-white/10 rounded-xl p-3 text-center">
                <Wallet size={16} className="text-[#81FF4D] mx-auto mb-1" />
                <p className="font-display text-xl text-[#81FF4D]">{formatCurrency(selectedCliente.totalGasto)}</p>
                <p className="text-[10px] text-cream/40">Total gasto</p>
              </div>
              <div className="bg-[#121212] border border-white/10 rounded-xl p-3 text-center">
                <Clock size={16} className="text-purple-400 mx-auto mb-1" />
                <p className="font-display text-xl text-[#F5F1EA]">
                  {selectedCliente.totalAgendamentos > 0
                    ? formatCurrency(selectedCliente.totalGasto / selectedCliente.totalAgendamentos)
                    : 'R$ 0'}
                </p>
                <p className="text-[10px] text-cream/40">Ticket médio</p>
              </div>
            </div>

            {/* Lista de Histórico */}
            <div>
              <p className="text-xs font-semibold text-[#F5F1EA] mb-2.5">Histórico recente</p>
              {clienteAgendamentos.length === 0 ? (
                <p className="text-xs text-cream/40 py-4 text-center bg-white/[0.01] rounded-xl border border-white/5">
                  Nenhum agendamento registrado até o momento.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {clienteAgendamentos.map((ag) => {
                    const sc = statusConfig[ag.status] ?? statusConfig.agendado;
                    return (
                      <div
                        key={ag.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs"
                      >
                        <div className="truncate pr-2">
                          <p className="font-medium text-[#F5F1EA] truncate">{ag.servico?.nome ?? 'Serviço'}</p>
                          <p className="text-[11px] text-cream/40">{formatDateTime(ag.data_inicio)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-highlight">{formatCurrency(ag.valor_servico)}</span>
                          <Badge variant={sc.variant}>{sc.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <Button variant="secondary" size="sm" onClick={() => setDetailOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ===================== MODAL DE CRIAÇÃO / EDIÇÃO ===================== */}
      <Modal
        open={createOpen || editOpen}
        onClose={() => {
          setCreateOpen(false);
          setEditOpen(false);
        }}
        title={editOpen ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Nome Completo *</label>
            <input
              type="text"
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              placeholder="Ex: João da Silva"
              className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Telefone / WhatsApp *</label>
            <input
              type="tel"
              value={formTelefone}
              onChange={(e) => setFormTelefone(maskPhone(e.target.value))}
              placeholder="(11) 99999-9999"
              className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">E-mail (opcional)</label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="cliente@exemplo.com"
              className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCreateOpen(false);
                setEditOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !formNome.trim() || !formTelefone.trim()}
              className="bg-gradient-to-r from-highlight to-[#2bd4ef] text-black font-semibold"
            >
              {saving ? 'Salvando...' : 'Salvar Cliente'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Excluir cliente"
        message="Excluir este cliente e todo seu histórico? Essa ação não pode ser desfeita."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </AdminLayout>
  );
}
