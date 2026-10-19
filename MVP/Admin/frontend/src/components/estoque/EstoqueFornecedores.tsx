import { useCallback, useEffect, useState } from 'react';
import { Truck, Plus, Pencil, AlertTriangle, X } from 'lucide-react';
import { listarFornecedores, salvarFornecedor, setFornecedorAtivo, type FornecedorForm } from '@/lib/estoqueService';
import type { Fornecedor } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { SearchInput } from '@/components/ui/SearchInput';
import { EstoquePanelProps, inputClass, filtrarPorNome } from './estoqueUi';
import { cn } from '@/lib/utils';

const EmptyForm: FornecedorForm = { nome: '', documento: '', telefone: '', email: '', observacoes: '' };

export function EstoqueFornecedores({ refresh }: EstoquePanelProps) {
  const { isMaster } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FornecedorForm>(EmptyForm);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFornecedores(await listarFornecedores());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!isMaster) return null;

  const openNew = () => {
    setEditId(null);
    setForm(EmptyForm);
    setModalOpen(true);
  };

  const openEdit = (f: Fornecedor) => {
    setEditId(f.id);
    setForm({
      nome: f.nome,
      documento: f.documento ?? '',
      telefone: f.telefone ?? '',
      email: f.email ?? '',
      observacoes: f.observacoes ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      setNotice('Informe o nome do fornecedor.');
      return;
    }
    setBusy(true);
    const payload: FornecedorForm = {
      nome: form.nome.trim(),
      documento: form.documento?.trim() || undefined,
      telefone: form.telefone?.trim() || undefined,
      email: form.email?.trim() || undefined,
      observacoes: form.observacoes?.trim() || undefined,
    };
    const { error } = await salvarFornecedor(payload, editId ?? undefined);
    setBusy(false);
    if (error) {
      setNotice(error);
      return;
    }
    setModalOpen(false);
    refresh();
    load();
  };

  const toggleAtivo = async (f: Fornecedor) => {
    const { error } = await setFornecedorAtivo(f.id, !f.ativo);
    if (!error) load();
  };

  const list = filtrarPorNome(search, fornecedores);

  return (
    <Card className="border-white/10 bg-[#121212]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-lg text-[#F5F1EA] flex items-center gap-2">
            <Truck size={18} className="text-highlight" /> Fornecedores
          </h3>
          <p className="text-xs text-cream/40">Cadastro usado nas entradas de compra de produtos</p>
        </div>
        <Button
          onClick={openNew}
          className="bg-gradient-to-r from-highlight to-[#2bd4ef] text-black font-semibold"
        >
          <Plus size={16} /> Novo Fornecedor
        </Button>
      </div>

      <div className="mb-4 max-w-xs">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar fornecedor..." />
      </div>

      {notice && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-red-900/20 border border-red-500/40 rounded-xl px-4 py-3">
          <p className="text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" /> {notice}
          </p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fechar" className="text-red-300/70 hover:text-red-200">
            <X size={15} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-10 text-center text-cream/40 text-sm animate-pulse">Carregando fornecedores...</div>
      ) : list.length === 0 ? (
        <div className="p-10 text-center text-cream/40 text-sm">
          {fornecedores.length === 0 ? 'Nenhum fornecedor cadastrado ainda.' : 'Nenhum fornecedor encontrado.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map((f) => (
            <div
              key={f.id}
              className={cn(
                'rounded-xl bg-white/[0.02] border px-4 py-3.5 transition-all',
                f.ativo ? 'border-white/5' : 'border-white/5 opacity-55',
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h4 className="font-display text-base text-[#F5F1EA] leading-tight">{f.nome}</h4>
                <Switch
                  checked={f.ativo}
                  onChange={() => toggleAtivo(f)}
                  size="sm"
                  label={`Ativar fornecedor ${f.nome}`}
                />
              </div>
              <div className="space-y-0.5 text-[11px] text-cream/50">
                {f.documento && <p>Doc.: {f.documento}</p>}
                {f.telefone && <p>Tel.: {f.telefone}</p>}
                {f.email && <p className="truncate">E-mail: {f.email}</p>}
                {f.observacoes && <p className="truncate">{f.observacoes}</p>}
                {!f.documento && !f.telefone && !f.email && !f.observacoes && (
                  <p className="text-cream/30">Sem dados adicionais.</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => openEdit(f)}
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-highlight hover:underline"
              >
                <Pencil size={13} /> Editar
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Fornecedor' : 'Novo Fornecedor'} maxWidth="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex.: Distribuidora Premium"
              className={inputClass()}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-cream/60 mb-1.5">CNPJ/CPF</label>
              <input
                type="text"
                value={form.documento ?? ''}
                onChange={(e) => setForm({ ...form, documento: e.target.value })}
                placeholder="00.000.000/0001-00"
                className={inputClass()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cream/60 mb-1.5">Telefone</label>
              <input
                type="text"
                value={form.telefone ?? ''}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
                className={inputClass()}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">E-mail</label>
            <input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contato@fornecedor.com.br"
              className={inputClass()}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Observações</label>
            <textarea
              value={form.observacoes ?? ''}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              rows={2}
              placeholder="Prazos, condições, representante..."
              className={cn(inputClass(), 'resize-none')}
            />
          </div>
          {notice && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">
              <AlertTriangle size={14} className="shrink-0" /> {notice}
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={busy} className="bg-gradient-to-r from-highlight to-[#2bd4ef] text-black font-semibold">
              {busy ? 'Salvando...' : 'Salvar Fornecedor'}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}