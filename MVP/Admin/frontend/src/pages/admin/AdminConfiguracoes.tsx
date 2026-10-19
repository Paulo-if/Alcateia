import { useEffect, useState, type ReactNode } from 'react';
import { Settings, Save, Loader2, AlertTriangle, CheckCircle2, Scissors, Share2, MapPin, Clock, Link2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { maskPhone, normalizePhone } from '@/lib/phone';

interface ConfigForm {
  nome: string;
  logo_url: string;
  whatsapp: string;
  instagram: string;
  instagram_url: string;
  whatsapp_url: string;
  telefone: string;
  endereco: string;
  horario_funcionamento: string;
  maps_embed_url: string;
}

const EMPTY: ConfigForm = {
  nome: '',
  logo_url: '',
  whatsapp: '',
  instagram: '',
  instagram_url: '',
  whatsapp_url: '',
  telefone: '',
  endereco: '',
  horario_funcionamento: '',
  maps_embed_url: '',
};

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="p-5 border-b border-white/10 last:border-b-0">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[#F5F1EA] mb-4">
        <span className="w-7 h-7 rounded-lg bg-highlight/10 border border-highlight/20 flex items-center justify-center text-highlight">
          {icon}
        </span>
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>
    </section>
  );
}

export function AdminConfiguracoes() {
  const [form, setForm] = useState<ConfigForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('barbearia_config')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) {
      setForm({
        nome: data.nome ?? '',
        logo_url: data.logo_url ?? '',
        whatsapp: data.whatsapp ?? '',
        instagram: data.instagram ?? '',
        instagram_url: data.instagram_url ?? '',
        whatsapp_url: data.whatsapp_url ?? '',
        telefone: data.telefone ?? '',
        endereco: data.endereco ?? '',
        horario_funcionamento: data.horario_funcionamento ?? '',
        maps_embed_url: data.maps_embed_url ?? '',
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const set = (patch: Partial<ConfigForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setSuccess(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const { error: err } = await supabase
      .from('barbearia_config')
      .upsert({
        barbearia_id: '00000000-0000-0000-0000-000000000001',
        nome: form.nome.trim() || null,
        logo_url: form.logo_url.trim() || null,
        whatsapp: normalizePhone(form.whatsapp) || null,
        instagram: form.instagram.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        whatsapp_url: form.whatsapp_url.trim() || null,
        telefone: normalizePhone(form.telefone) || null,
        endereco: form.endereco.trim() || null,
        horario_funcionamento: form.horario_funcionamento.trim() || null,
        maps_embed_url: form.maps_embed_url.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('barbearia_id', '00000000-0000-0000-0000-000000000001');
    setSaving(false);
    if (err) {
      setError('Não foi possível salvar as configurações. Tente novamente.');
      return;
    }
    setSuccess('Configurações salvas com sucesso.');
  };

  const inputCls =
    'w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-4 py-3 text-sm text-cream placeholder:text-cream/25 outline-none transition-colors focus:border-highlight/60';
  const labelCls = 'text-xs font-medium text-cream/60 uppercase tracking-wider mb-1.5 block';
  const hintCls = 'text-[11px] text-cream/35 mt-1.5';

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-highlight/15 border border-highlight/30 flex items-center justify-center">
            <Settings size={22} className="text-highlight" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#F5F1EA] tracking-wide mb-1">
              Configurações
            </h1>
            <p className="text-cream/50 text-sm">Dados públicos da barbearia exibidos no site do cliente.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          <AlertTriangle size={18} className="shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-800/50 bg-green-900/20 px-4 py-3 text-sm text-green-300">
          <CheckCircle2 size={18} className="shrink-0" />
          {success}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-cream/40 gap-2">
            <Loader2 size={20} className="animate-spin" />
            Carregando...
          </div>
        ) : (
          <>
            {/* Identidade */}
            <Section icon={<Scissors size={14} />} title="Identidade">
              <label className="block">
                <span className={labelCls}>Nome da barbearia</span>
                <input className={inputCls} value={form.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Alcateia Barber" />
              </label>
              <label className="block">
                <span className={labelCls}>URL do logo</span>
                <input className={inputCls} value={form.logo_url} onChange={(e) => set({ logo_url: e.target.value })} placeholder="https://..." />
              </label>
            </Section>

            {/* Redes & Contatos */}
            <Section icon={<Share2 size={14} />} title="Redes & Contatos">
              <label className="block">
                <span className={labelCls}>WhatsApp (número com DDI/DDD)</span>
                <input className={inputCls} value={form.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="5511999999999" />
                <span className={hintCls}>Somente dígitos, incluindo o código do país. Usado para agendamento.</span>
              </label>
              <label className="block">
                <span className={labelCls}>Telefone (exibição)</span>
                <input className={inputCls} value={form.telefone} onChange={(e) => set({ telefone: maskPhone(e.target.value) })} placeholder="(11) 99999-9999" />
              </label>
              <label className="block">
                <span className={labelCls}>Instagram (referência)</span>
                <input className={inputCls} value={form.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="@alcateia_barber" />
              </label>
            </Section>

            {/* Localização */}
            <Section icon={<MapPin size={14} />} title="Localização">
              <label className="block">
                <span className={labelCls}>Endereço</span>
                <input className={inputCls} value={form.endereco} onChange={(e) => set({ endereco: e.target.value })} placeholder="Alcatéia Barbearia" />
              </label>
              <label className="block">
                <span className={labelCls}>URL do Google Maps (embed)</span>
                <input className={inputCls} value={form.maps_embed_url} onChange={(e) => set({ maps_embed_url: e.target.value })} placeholder="https://www.google.com/maps/embed?pb=..." />
                <span className={hintCls}>Link de incorporação do mapa exibido na seção de contato.</span>
              </label>
            </Section>

            {/* Horário */}
            <Section icon={<Clock size={14} />} title="Horário">
              <label className="block">
                <span className={labelCls}>Horário de funcionamento</span>
                <input className={inputCls} value={form.horario_funcionamento} onChange={(e) => set({ horario_funcionamento: e.target.value })} placeholder="Seg a Sáb, 9h às 17h" />
              </label>
            </Section>

            {/* Links do Cliente */}
            <Section icon={<Link2 size={14} />} title="Links do Cliente">
              <label className="block">
                <span className={labelCls}>Link do Instagram (rodapé)</span>
                <input className={inputCls} value={form.instagram_url} onChange={(e) => set({ instagram_url: e.target.value })} placeholder="https://www.instagram.com/barbearia_alcateia_/" />
                <span className={hintCls}>URL completa usada no rodapé do site.</span>
              </label>
              <label className="block">
                <span className={labelCls}>Link do WhatsApp (rodapé)</span>
                <input className={inputCls} value={form.whatsapp_url} onChange={(e) => set({ whatsapp_url: e.target.value })} placeholder="https://wa.me/5511999999999" />
                <span className={hintCls}>URL completa do chat usada no rodapé do site.</span>
              </label>
            </Section>

            <div className="flex justify-end gap-2 p-5 bg-[#121212]">
              <Button onClick={handleSave} disabled={saving} className="min-w-[180px]">
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Salvar configurações
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </Card>
    </AdminLayout>
  );
}