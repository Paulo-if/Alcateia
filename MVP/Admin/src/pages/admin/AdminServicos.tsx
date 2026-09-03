import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Scissors,
  Tag,
  Plus,
  Trash2,
  Sparkles,
  Wand2,
  Eye,
  Clock,
  AlertTriangle,
  Image as ImageIcon,
  Upload,
  Flame,
  Crown,
  Shield,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Servico, Produto } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { SearchInput } from '@/components/ui/SearchInput';

const iconMap: Record<string, any> = {
  scissors: Scissors,
  sparkles: Sparkles,
  wand: Wand2,
  eye: Eye,
  flame: Flame,
  crown: Crown,
  shield: Shield,
  tag: Tag,
};

const iconOptions = [
  { key: 'scissors', label: 'Tesoura', icon: Scissors },
  { key: 'sparkles', label: 'Brilho', icon: Sparkles },
  { key: 'flame', label: 'Fogo', icon: Flame },
  { key: 'crown', label: 'Coroa', icon: Crown },
  { key: 'shield', label: 'Navalha', icon: Shield },
  { key: 'wand', label: 'Varinha', icon: Wand2 },
  { key: 'eye', label: 'Olho', icon: Eye },
  { key: 'tag', label: 'Etiqueta', icon: Tag },
];

type Tab = 'servicos' | 'produtos' | 'bumps';

export function AdminServicos() {
  const [tab, setTab] = useState<Tab>('servicos');
  // 'bumps' ainda configura produtos, então trata como modo produto.
  const servicoMode = tab === 'servicos';
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Servico | Produto | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Pesquisa por aba
  const [search, setSearch] = useState('');
  // Mensagem de erro amigável (fila de requisições de ativação/desativação)
  const [notice, setNotice] = useState<string | null>(null);
  // Lock assíncrono para evitar mutações duplicadas (ex.: duplo clique)
  const toggleLockRef = useRef<Set<string>>(new Set());

  // Listas já filtradas pela pesquisa da aba ativa (sem refetch; filtragem instantânea)
  const q = search.trim().toLowerCase();
  const filteredServicos = q ? servicos.filter((s) => s.nome.toLowerCase().includes(q)) : servicos;
  const filteredProdutos = q ? produtos.filter((p) => p.nome.toLowerCase().includes(q)) : produtos;

  // Form representation type
  const [repType, setRepType] = useState<'icon' | 'image'>('icon');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFileName, setImageFileName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string>('scissors');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Servico form fields
  const [sNome, setSNome] = useState('');
  const [sDescricao, setSDescricao] = useState('');
  const [sPreco, setSPreco] = useState('');
  const [sDuracao, setSDuracao] = useState('');
  const [sOrdem, setSOrdem] = useState('0');

  // Produto form fields
  const [pNome, setPNome] = useState('');
  const [pDescricao, setPDescricao] = useState('');
  const [pPrecoOriginal, setPPrecoOriginal] = useState('');
  const [pPrecoBump, setPPrecoBump] = useState('');

  // Limpeza de memory leak de ObjectURL
  const cleanupObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: servData }, { data: prodData }] = await Promise.all([
      supabase.from('servicos').select('*').order('ordem'),
      supabase.from('produtos').select('*').order('created_at', { ascending: false }),
    ]);
    setServicos((servData as Servico[]) ?? []);
    setProdutos((prodData as Produto[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    return () => cleanupObjectUrl();
  }, [fetchData]);

  // Limpa a mensagem de erro amigável após alguns segundos
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // Troca de aba limpa a pesquisa para não misturar filtros entre listas
  const changeTab = (next: Tab) => {
    setSearch('');
    setTab(next);
  };

  const openNew = () => {
    cleanupObjectUrl();
    setEditingItem(null);
    setIsNew(true);
    setConfirmDeleteOpen(false);
    setUploadError(null);
    setImageFileName('');

    if (servicoMode) {
      setSNome('');
      setSDescricao('');
      setSPreco('');
      setSDuracao('30');
      setSOrdem('0');
      setSelectedIcon('scissors');
      setRepType('icon');
      setImagePreview('');
    } else {
      setPNome('');
      setPDescricao('');
      setPPrecoOriginal('');
      setPPrecoBump('');
      setSelectedIcon('tag');
      setRepType('icon');
      setImagePreview('');
    }
    setModalOpen(true);
  };

  const openEdit = (item: Servico | Produto) => {
    cleanupObjectUrl();
    setEditingItem(item);
    setIsNew(false);
    setConfirmDeleteOpen(false);
    setUploadError(null);

    if (servicoMode) {
      const s = item as Servico;
      setSNome(s.nome);
      setSDescricao(s.descricao ?? '');
      setSPreco(s.preco.toString());
      setSDuracao(s.duracao_minutos.toString());
      setSOrdem(s.ordem.toString());

      if (s.icone && (s.icone.startsWith('http') || s.icone.startsWith('data:image') || s.icone.startsWith('blob:'))) {
        setRepType('image');
        setImagePreview(s.icone);
        setImageFileName('foto_servico.jpg');
        setSelectedIcon('scissors');
      } else {
        setRepType('icon');
        setSelectedIcon(s.icone || 'scissors');
        setImagePreview('');
        setImageFileName('');
      }
    } else {
      const p = item as Produto;
      setPNome(p.nome);
      setPDescricao(p.descricao ?? '');
      setPPrecoOriginal(p.preco_original.toString());
      setPPrecoBump(p.preco_bump.toString());

      if (p.imagem_url && (p.imagem_url.startsWith('http') || p.imagem_url.startsWith('data:image') || p.imagem_url.startsWith('blob:'))) {
        setRepType('image');
        setImagePreview(p.imagem_url);
        setImageFileName('foto_produto.jpg');
        setSelectedIcon('tag');
      } else if (p.imagem_url && p.imagem_url.startsWith('icon:')) {
        setRepType('icon');
        setSelectedIcon(p.imagem_url.replace('icon:', ''));
        setImagePreview('');
        setImageFileName('');
      } else {
        setRepType('icon');
        setSelectedIcon('tag');
        setImagePreview('');
        setImageFileName('');
      }
    }
    setModalOpen(true);
  };

  // Upload local de imagem com validação de 2MB e tipo MIME
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tipo MIME
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      setUploadError('Formato inválido. Por favor, envie uma imagem JPG ou PNG.');
      return;
    }

    // Validação de tamanho máximo de 2MB
    const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError('A imagem deve ter no máximo 2MB.');
      return;
    }

    cleanupObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setImagePreview(objectUrl);
    setImageFileName(file.name);

    // Converter para base64 internamente para persistência no banco
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Armazena silenciosamente para o salvamento
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    cleanupObjectUrl();
    setImagePreview('');
    setImageFileName('');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (servicoMode) {
      if (!sNome.trim()) return;
      const representationValue = repType === 'image' && imagePreview ? imagePreview : selectedIcon;

      const payload = {
        nome: sNome.trim(),
        descricao: sDescricao.trim() || null,
        preco: parseFloat(sPreco) || 0,
        duracao_minutos: parseInt(sDuracao) || 30,
        icone: representationValue,
        ordem: parseInt(sOrdem) || 0,
      };

      if (isNew) {
        await supabase.from('servicos').insert({ ...payload, ativo: true });
      } else if (editingItem) {
        await supabase.from('servicos').update(payload).eq('id', (editingItem as Servico).id);
      }
    } else {
      if (!pNome.trim()) return;
      const representationValue = repType === 'image' && imagePreview ? imagePreview : `icon:${selectedIcon}`;

      const payload = {
        nome: pNome.trim(),
        descricao: pDescricao.trim() || null,
        preco_original: parseFloat(pPrecoOriginal) || 0,
        preco_bump: parseFloat(pPrecoBump) || 0,
        imagem_url: representationValue,
      };

      if (isNew) {
        await supabase.from('produtos').insert({ ...payload, ativo: true });
      } else if (editingItem) {
        await supabase.from('produtos').update(payload).eq('id', (editingItem as Produto).id);
      }
    }
    setModalOpen(false);
    fetchData();
  };

  const toggleAtivo = async (table: 'servicos' | 'produtos', id: string, ativoAtual: boolean) => {
    const lockKey = `ativo:${table}:${id}`;
    if (toggleLockRef.current.has(lockKey)) return;
    toggleLockRef.current.add(lockKey);

    const proximo = !ativoAtual;
    const rollback = () => {
      if (table === 'servicos') {
        setServicos((prev) => prev.map((s) => (s.id === id ? { ...s, ativo: ativoAtual } : s)));
      } else {
        setProdutos((prev) => prev.map((p) => (p.id === id ? { ...p, ativo: ativoAtual } : p)));
      }
    };

    // optimistic: altera visual imediatamente, sem refetch nem spinner
    if (table === 'servicos') {
      setServicos((prev) => prev.map((s) => (s.id === id ? { ...s, ativo: proximo } : s)));
    } else {
      setProdutos((prev) => prev.map((p) => (p.id === id ? { ...p, ativo: proximo } : p)));
    }

    try {
      await supabase.from(table).update({ ativo: proximo }).eq('id', id);
    } catch {
      rollback();
      setNotice('Não foi possível salvar a alteração. Tente novamente.');
    } finally {
      toggleLockRef.current.delete(lockKey);
    }
  };

  const toggleOrderBump = async (id: string, isBumpAtual: boolean) => {
    const lockKey = `bump:${id}`;
    if (toggleLockRef.current.has(lockKey)) return;
    toggleLockRef.current.add(lockKey);

    const proximo = !isBumpAtual;

    // optimistic: atualiza o card imediatamente, sem refetch, sem mover posição
    setProdutos((prev) => prev.map((p) => (p.id === id ? { ...p, is_order_bump: proximo } : p)));

    try {
      await supabase.from('produtos').update({ is_order_bump: proximo }).eq('id', id);
    } catch {
      // rollback para o estado anterior
      setProdutos((prev) => prev.map((p) => (p.id === id ? { ...p, is_order_bump: isBumpAtual } : p)));
      setNotice('Não foi possível salvar a alteração. Tente novamente.');
    } finally {
      toggleLockRef.current.delete(lockKey);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!editingItem) return;
    const table = servicoMode ? 'servicos' : 'produtos';
    await supabase.from(table).delete().eq('id', editingItem.id);
    setConfirmDeleteOpen(false);
    setModalOpen(false);
    fetchData();
  };

  return (
    <AdminLayout>
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-[#F5F1EA] tracking-wide mb-1">
            Serviços & Produtos
          </h1>
          <p className="text-cream/50 text-sm">
            Catálogo visual de atendimentos e produtos.
          </p>
        </div>
        {tab !== 'bumps' && (
          <Button
            onClick={openNew}
            className="bg-gradient-to-r from-highlight to-[#2bd4ef] text-black font-semibold shadow-lg shadow-highlight/20"
          >
            <Plus size={18} />
            {servicoMode ? 'Novo Serviço' : 'Novo Produto'}
          </Button>
        )}
      </div>

      {/* Abas / Segmentação: Serviços vs Produtos vs Order Bumps */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => changeTab('servicos')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border',
            servicoMode
              ? 'bg-highlight/15 text-highlight border-highlight/40 shadow-sm'
              : 'bg-[#121212] text-cream/60 border-white/10 hover:text-white hover:bg-white/5'
          )}
        >
          <Scissors size={16} />
          Serviços ({servicos.length})
        </button>
        <button
          onClick={() => changeTab('produtos')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border',
            tab === 'produtos'
              ? 'bg-[#81FF4D]/15 text-[#81FF4D] border-[#81FF4D]/40 shadow-sm'
              : 'bg-[#121212] text-cream/60 border-white/10 hover:text-white hover:bg-white/5'
          )}
        >
          <Tag size={16} />
          Produtos ({produtos.length})
        </button>
        <button
          onClick={() => changeTab('bumps')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border',
            tab === 'bumps'
              ? 'bg-[#FFD166]/15 text-[#FFD166] border-[#FFD166]/40 shadow-sm'
              : 'bg-[#121212] text-cream/60 border-white/10 hover:text-white hover:bg-white/5'
          )}
        >
          <Sparkles size={16} />
          Order Bumps ({produtos.filter((p) => p.is_order_bump).length})
        </button>
      </div>

      {/* Aviso amigável de falha na persistência (toggle) */}
      {notice && (
        <div className="mb-4 flex items-start justify-between gap-3 bg-red-900/20 border border-red-500/40 rounded-xl px-4 py-3">
          <p className="text-xs text-red-300 leading-relaxed">{notice}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-red-300/70 hover:text-red-200 transition-colors"
            aria-label="Fechar aviso"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Barra de pesquisa da aba ativa */}
      <div className="mb-6 w-full md:max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={
            servicoMode ? 'Pesquisar serviço...' : tab === 'bumps' ? 'Pesquisar Order Bump...' : 'Pesquisar produto...'
          }
        />
      </div>

      {loading ? (
        <div className="p-16 text-center text-cream/40 text-sm animate-pulse">Carregando catálogo...</div>
      ) : servicoMode ? (
        /* ===================== GRID DE CARDS DE SERVIÇOS (CATÁLOGO VERTICAL) ===================== */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredServicos.length === 0 ? (
            <div className="col-span-full p-16 text-center text-cream/40 text-sm">
              Não encontramos nenhum serviço com esse nome.
            </div>
          ) : filteredServicos.map((servico) => {
            const isImage = servico.icone && (servico.icone.startsWith('http') || servico.icone.startsWith('data:image'));
            const IconComp = (!isImage && servico.icone && iconMap[servico.icone]) ? iconMap[servico.icone] : Scissors;

            return (
              <div
                key={servico.id}
                onClick={() => openEdit(servico)}
                className={cn(
                  'bg-[#141414] border rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.015] hover:shadow-2xl hover:shadow-black/70 flex flex-col group',
                  servico.ativo
                    ? 'border-white/10 hover:border-highlight/50'
                    : 'border-white/5 bg-[#0f0f0f] opacity-60'
                )}
              >
                {/* Área Visual Superior: Imagem OU Ícone */}
                <div className="relative w-full h-36 bg-[#0a0a0a] flex items-center justify-center overflow-hidden border-b border-white/5">
                  {isImage ? (
                    <img
                      src={servico.icone!}
                      alt={servico.nome}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-highlight/10 border border-highlight/20 flex items-center justify-center text-highlight group-hover:scale-110 group-hover:bg-highlight group-hover:text-black transition-all">
                      <IconComp size={30} />
                    </div>
                  )}

                  {/* Badge de Duração sobre a imagem */}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[10px] text-cream/90 flex items-center gap-1 font-mono">
                    <Clock size={11} className="text-highlight" />
                    {servico.duracao_minutos} min
                  </div>
                </div>

                {/* Conteúdo Abaixo da Imagem */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Linha de Título + Switch no topo direito */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-display text-xl text-[#F5F1EA] tracking-wide group-hover:text-highlight transition-colors leading-tight">
                        {servico.nome}
                      </h3>
                      {/* Switch isolado sem disparar edição */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={servico.ativo}
                          onChange={() => toggleAtivo('servicos', servico.id, servico.ativo)}
                          size="md"
                          label={`Status do serviço ${servico.nome}`}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-cream/50 line-clamp-2 mb-4 leading-relaxed">
                      {servico.descricao || 'Sem descrição informada.'}
                    </p>
                  </div>

                  {/* Preço em destaque */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-cream/40 block font-medium">Valor do serviço</span>
                      <span className="font-display text-2xl text-highlight">
                        {formatCurrency(servico.preco)}
                      </span>
                    </div>
                    <span className="text-[11px] text-cream/40 group-hover:text-highlight transition-colors">
                      Editar →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : tab === 'bumps' ? (
        /* ===================== ORDER BUMPS: produtos disponíveis para virarem oferta ===================== */
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 bg-[#121212] border border-[#FFD166]/20 rounded-2xl px-4 py-3">
            <p className="text-xs text-cream/60 leading-relaxed">
              Ative os produtos que deseja oferecer como <span className="text-[#FFD166] font-semibold">Order Bump</span>.
              O cliente vê a oferta antes do pagamento, com preço promocional.
            </p>
          </div>
          {filteredProdutos.filter((p) => p.ativo).length === 0 ? (
            <div className="p-16 text-center text-cream/40 text-sm">
              {q
                ? 'Não encontramos nenhum produto com esse nome.'
                : 'Nenhum produto ativo no catálogo para configurar como Order Bump.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProdutos
                .filter((p) => p.ativo)
                .map((produto) => {
                  const isImage = produto.imagem_url && (produto.imagem_url.startsWith('http') || produto.imagem_url.startsWith('data:image'));
                  const isIconPrefixed = produto.imagem_url && produto.imagem_url.startsWith('icon:');
                  const iconKey = isIconPrefixed ? produto.imagem_url!.replace('icon:', '') : 'tag';
                  const IconComp = iconMap[iconKey] || Tag;
                  const isBump = !!produto.is_order_bump;

                  return (
                    <div
                      key={produto.id}
                      className={cn(
                        'bg-[#141414] border rounded-2xl overflow-hidden transition-all duration-200 flex flex-col',
                        isBump
                          ? 'border-[#FFD166]/40 shadow-lg shadow-[#FFD166]/5'
                          : 'border-white/10'
                      )}
                    >
                      <div className="relative w-full h-24 bg-[#0a0a0a] flex items-center justify-center overflow-hidden border-b border-white/5">
                        {isImage ? (
                          <img
                            src={produto.imagem_url!}
                            alt={produto.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cream/60">
                            <IconComp size={24} />
                          </div>
                        )}
                        <div className={cn(
                          'absolute top-2 left-2 px-2 py-0.5 rounded-md backdrop-blur-md border text-[10px] font-bold uppercase tracking-wider',
                          isBump
                            ? 'bg-[#FFD166]/20 border-[#FFD166]/40 text-[#FFD166]'
                            : 'bg-white/10 border-white/20 text-cream/60'
                        )}>
                          {isBump ? 'Order Bump' : 'Catálogo'}
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="font-display text-lg text-[#F5F1EA] tracking-wide leading-tight">
                            {produto.nome}
                          </h3>
                          <div onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={isBump}
                              onChange={() => toggleOrderBump(produto.id, isBump)}
                              size="md"
                              label={`Ativar ${produto.nome} como Order Bump`}
                            />
                          </div>
                        </div>

                        <p className="text-xs text-cream/50 line-clamp-2 mb-4 leading-relaxed flex-1">
                          {produto.descricao || 'Produto complementar para oferta no agendamento.'}
                        </p>

                        <div className="pt-3 border-t border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-cream/40">Original</span>
                            <span className="text-cream/70">{formatCurrency(produto.preco_original)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#FFD166]/70">Preço da Oferta</span>
                            <span className={isBump && produto.preco_bump > 0 ? 'font-display text-lg text-[#FFD166]' : 'text-cream/40'}>
                              {produto.preco_bump > 0 ? formatCurrency(produto.preco_bump) : '—'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => openEdit(produto)}
                          className="mt-3 w-full py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-cream/80 transition-all border border-white/10"
                        >
                          Editar oferta
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        /* ===================== GRID DE CARDS DE PRODUTOS ORDER BUMP ===================== */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProdutos.length === 0 ? (
            <div className="col-span-full p-16 text-center text-cream/40 text-sm">
              Não encontramos nenhum produto com esse nome.
            </div>
          ) : filteredProdutos.map((produto) => {
            const isImage = produto.imagem_url && (produto.imagem_url.startsWith('http') || produto.imagem_url.startsWith('data:image'));
            const isIconPrefixed = produto.imagem_url && produto.imagem_url.startsWith('icon:');
            const iconKey = isIconPrefixed ? produto.imagem_url!.replace('icon:', '') : 'tag';
            const IconComp = iconMap[iconKey] || Tag;

            return (
              <div
                key={produto.id}
                onClick={() => openEdit(produto)}
                className={cn(
                  'bg-[#141414] border rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.015] hover:shadow-2xl hover:shadow-black/70 flex flex-col group',
                  produto.ativo
                    ? 'border-white/10 hover:border-[#81FF4D]/50'
                    : 'border-white/5 bg-[#0f0f0f] opacity-60'
                )}
              >
                {/* Área Visual Superior */}
                <div className="relative w-full h-36 bg-[#0a0a0a] flex items-center justify-center overflow-hidden border-b border-white/5">
                  {isImage ? (
                    <img
                      src={produto.imagem_url!}
                      alt={produto.nome}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#81FF4D]/10 border border-[#81FF4D]/20 flex items-center justify-center text-[#81FF4D] group-hover:scale-110 group-hover:bg-[#81FF4D] group-hover:text-black transition-all">
                      <IconComp size={30} />
                    </div>
                  )}

                  {/* Badge: Order Bump (somente se is_order_bump) ou Catálogo */}
                  <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md backdrop-blur-md border text-[10px] font-bold uppercase tracking-wider ${
                    produto.is_order_bump
                      ? 'bg-[#81FF4D]/20 border-[#81FF4D]/40 text-[#81FF4D]'
                      : 'bg-white/10 border-white/20 text-cream/60'
                  }`}>
                    {produto.is_order_bump ? 'Order Bump' : 'Catálogo'}
                  </div>
                </div>

                {/* Informações */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-display text-xl text-[#F5F1EA] tracking-wide group-hover:text-[#81FF4D] transition-colors leading-tight">
                        {produto.nome}
                      </h3>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={produto.ativo}
                          onChange={() => toggleAtivo('produtos', produto.id, produto.ativo)}
                          size="md"
                          label={`Status do produto ${produto.nome}`}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-cream/50 line-clamp-2 mb-4 leading-relaxed">
                      {produto.descricao || 'Produto complementar para oferta no agendamento.'}
                    </p>
                  </div>

                  {/* Preços: catálogo (preco_original) OU bump (preco_bump destacado) */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div>
                      {produto.is_order_bump && produto.preco_bump > 0 ? (
                        <>
                          <span className="text-[10px] text-cream/40 block font-medium">Preço de Oferta</span>
                          <span className="font-display text-2xl text-[#81FF4D]">
                            {formatCurrency(produto.preco_bump)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] text-cream/40 block font-medium">Preço</span>
                          <span className="font-display text-2xl text-[#81FF4D]">
                            {formatCurrency(produto.preco_original)}
                          </span>
                        </>
                      )}
                    </div>
                    {produto.is_order_bump && produto.preco_original > produto.preco_bump && (
                      <div className="text-right">
                        <span className="text-[10px] text-cream/30 block">Original</span>
                        <span className="text-xs text-cream/40 line-through">
                          {formatCurrency(produto.preco_original)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== MODAL DE CRIAÇÃO / EDIÇÃO ===================== */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isNew ? (servicoMode ? 'Novo Serviço' : 'Novo Produto') : (servicoMode ? 'Editar Serviço' : 'Editar Produto')}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {/* Seletor de Tipo de Representação: Ícone OU Imagem */}
          <div>
            <label className="block text-xs font-semibold text-cream/70 mb-2">
              Representação Visual do Card
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setRepType('icon')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all border',
                  repType === 'icon'
                    ? 'bg-highlight/15 text-highlight border-highlight/40 font-bold'
                    : 'bg-[#121212] text-cream/60 border-white/10 hover:text-white'
                )}
              >
                <Scissors size={15} />
                Usar Ícone
              </button>
              <button
                type="button"
                onClick={() => setRepType('image')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all border',
                  repType === 'image'
                    ? 'bg-highlight/15 text-highlight border-highlight/40 font-bold'
                    : 'bg-[#121212] text-cream/60 border-white/10 hover:text-white'
                )}
              >
                <ImageIcon size={15} />
                Usar Imagem
              </button>
            </div>

            {/* Configuração de Ícone */}
            {repType === 'icon' ? (
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 p-3 bg-black/40 rounded-xl border border-white/5">
                {iconOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSelectedIcon(opt.key)}
                    className={cn(
                      'p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] transition-all border',
                      selectedIcon === opt.key
                        ? 'bg-highlight text-black font-bold border-highlight shadow-sm'
                        : 'bg-white/5 text-cream/60 border-transparent hover:text-white hover:bg-white/10'
                    )}
                  >
                    <opt.icon size={18} />
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              /* Configuração de Imagem / Upload */
              <div className="space-y-3 p-3.5 bg-black/40 rounded-xl border border-white/5">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {imagePreview ? (
                  /* Estado DEPOIS do upload: preview 1:1, nome do arquivo e botões de ação */
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/20 shrink-0 bg-[#0a0a0a]">
                      <img
                        src={imagePreview}
                        alt="Preview da foto"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-[#F5F1EA] font-medium truncate">
                        <ImageIcon size={14} className="text-highlight shrink-0" />
                        <span className="truncate">{imageFileName || 'imagem_selecionada.jpg'}</span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs py-1.5 px-3"
                        >
                          Alterar foto
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={handleRemoveImage}
                          className="text-xs py-1.5 px-3"
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Estado ANTES do upload: botão grande e instruções */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-white/15 hover:border-highlight/50 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-white/[0.02] hover:bg-white/[0.04] group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-highlight/10 flex items-center justify-center text-highlight mb-2 group-hover:scale-110 transition-transform">
                      <Upload size={18} />
                    </div>
                    <span className="text-xs font-semibold text-[#F5F1EA] mb-1">
                      + Adicionar foto
                    </span>
                    <span className="text-[10px] text-cream/40">
                      JPG ou PNG de até 2MB
                    </span>
                  </div>
                )}

                {uploadError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <p className="text-[10px] text-cream/40 text-center">
                  Tamanho recomendado: 400×400px (proporção 1:1), JPG/PNG de até 2MB.
                </p>
              </div>
            )}
          </div>

          {/* Campos Específicos de Serviço */}
          {servicoMode ? (
            <>
              <div>
                <label className="block text-xs font-medium text-cream/60 mb-1.5">Nome do Serviço *</label>
                <input
                  type="text"
                  value={sNome}
                  onChange={(e) => setSNome(e.target.value)}
                  placeholder="Ex: Corte Degradê Navalhado"
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-cream/60 mb-1.5">Descrição</label>
                <textarea
                  value={sDescricao}
                  onChange={(e) => setSDescricao(e.target.value)}
                  placeholder="Descreva os detalhes do atendimento..."
                  rows={2}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-cream/60 mb-1.5">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sPreco}
                    onChange={(e) => setSPreco(e.target.value)}
                    placeholder="45.00"
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-cream/60 mb-1.5">Duração (minutos) *</label>
                  <input
                    type="number"
                    value={sDuracao}
                    onChange={(e) => setSDuracao(e.target.value)}
                    placeholder="30"
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Campos Específicos de Produto */
            <>
              <div>
                <label className="block text-xs font-medium text-cream/60 mb-1.5">Nome do Produto *</label>
                <input
                  type="text"
                  value={pNome}
                  onChange={(e) => setPNome(e.target.value)}
                  placeholder="Ex: Pomada Modeladora Efeito Matte"
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-cream/60 mb-1.5">Descrição</label>
                <textarea
                  value={pDescricao}
                  onChange={(e) => setPDescricao(e.target.value)}
                  placeholder="Benefícios e instruções de uso..."
                  rows={2}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-cream/60 mb-1.5">Preço Original (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pPrecoOriginal}
                    onChange={(e) => setPPrecoOriginal(e.target.value)}
                    placeholder="45.00"
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-cream/60 mb-1.5">Preço Order Bump (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pPrecoBump}
                    onChange={(e) => setPPrecoBump(e.target.value)}
                    placeholder="25.00"
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Confirmação de Exclusão */}
        {confirmDeleteOpen ? (
          <div className="mt-6 p-4 rounded-xl bg-danger/10 border border-danger/30 animate-fade-in">
            <div className="flex items-center gap-2 text-danger text-xs font-bold mb-1">
              <AlertTriangle size={16} />
              <span>Excluir {servicoMode ? 'serviço' : 'produto'}?</span>
            </div>
            <p className="text-[11px] text-cream/70 mb-3">
              Essa ação não poderá ser desfeita. O item será removido permanentemente do catálogo.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmDeleteOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirmed}
              >
                Sim, Excluir
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 mt-6 pt-4 border-t border-white/10">
            {!isNew && editingItem ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmDeleteOpen(true)}
                className="w-full sm:w-auto"
              >
                <Trash2 size={15} />
                Excluir {servicoMode ? 'Serviço' : 'Produto'}
              </Button>
            ) : (
              <div />
            )}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="w-full sm:w-auto bg-gradient-to-r from-highlight to-[#2bd4ef] text-black font-semibold"
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
