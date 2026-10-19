import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Produto, Fornecedor } from '@/types';
import { listarFornecedores } from '@/lib/estoqueService';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { EstoqueEntradas } from '@/components/estoque/EstoqueEntradas';

export function AdminEntradaEstoque() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: prodData }, forn] = await Promise.all([
      supabase.from('produtos').select('*').order('created_at', { ascending: false }),
      listarFornecedores(),
    ]);
    setProdutos((prodData as Produto[]) ?? []);
    setFornecedores(forn);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-[#F5F1EA] tracking-wide mb-1">
            Entrada de Estoque
          </h1>
          <p className="text-cream/50 text-sm">
            Registre as compras/reposições de produtos. Você vê apenas os registros feitos por você.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-cream/40 text-sm animate-pulse">Carregando produtos...</div>
      ) : (
        <EstoqueEntradas
          produtos={produtos}
          fornecedores={fornecedores}
          refresh={fetchData}
          initialProdutoId={null}
        />
      )}
    </AdminLayout>
  );
}