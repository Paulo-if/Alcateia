import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminAgendaContent } from '@/components/admin/AdminAgendaContent';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export function AdminMinhaAgenda() {
  const { usuario: currentUser } = useAuth();
  const [profissional, setProfissional] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfissional() {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('usuarios')
          .select('profissional_id, nome')
          .eq('id', currentUser.id)
          .single();

        if (fetchError) throw fetchError;

        if (!data?.profissional_id) {
          setError('Você não possui um perfil de profissional vinculado. Entre em contato com o Master.');
        } else {
          const { data: profData, error: profError } = await supabase
            .from('profissionais')
            .select('id, name')
            .eq('id', data.profissional_id)
            .single();

          if (profError) throw profError;
          setProfissional(profData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar seu perfil profissional.');
      } finally {
        setLoading(false);
      }
    }

    fetchProfissional();
  }, [currentUser]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl text-[#F5F1EA] tracking-wide mb-1">
          Minha Agenda
        </h1>
        <p className="text-cream/50 text-sm">
          Gerencie seus horários de trabalho e folgas.
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-cream/40 text-sm animate-pulse flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-highlight" />
          Carregando sua agenda...
        </div>
      ) : error ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
        </div>
      ) : profissional ? (
        <AdminAgendaContent
          profissional={profissional}
          onSaveSuccess={() => {}}
        />
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-cream/40 text-sm">Erro ao localizar perfil profissional.</p>
        </div>
      )}
    </AdminLayout>
  );
}
