import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicBookingPage } from '@/pages/public/PublicBookingPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminAgendamentos } from '@/pages/admin/AdminAgendamentos';
import { AdminServicos } from '@/pages/admin/AdminServicos';
import { AdminFinanceiro } from '@/pages/admin/AdminFinanceiro';
import { AdminClientes } from '@/pages/admin/AdminClientes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/agendar" replace />} />
        <Route path="/agendar" element={<PublicBookingPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/agendamentos" element={<AdminAgendamentos />} />
        <Route path="/admin/clientes" element={<AdminClientes />} />
        <Route path="/admin/servicos" element={<AdminServicos />} />
        <Route path="/admin/financeiro" element={<AdminFinanceiro />} />
        <Route path="*" element={<Navigate to="/agendar" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
