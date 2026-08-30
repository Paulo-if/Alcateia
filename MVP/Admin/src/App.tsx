import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { LoginPage } from '@/pages/LoginPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleRoute } from '@/components/auth/RoleRoute';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminAgendamentos } from '@/pages/admin/AdminAgendamentos';
import { AdminServicos } from '@/pages/admin/AdminServicos';
import { AdminFinanceiro } from '@/pages/admin/AdminFinanceiro';
import { AdminClientes } from '@/pages/admin/AdminClientes';
import { AdminUsuarios } from '@/pages/admin/AdminUsuarios';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/admin/reset-password" element={<ResetPasswordPage />} />
          {/* master + barbeiro */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/agendamentos"
            element={
              <ProtectedRoute>
                <AdminAgendamentos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/clientes"
            element={
              <ProtectedRoute>
                <AdminClientes />
              </ProtectedRoute>
            }
          />
          {/* apenas master */}
          <Route
            path="/admin/servicos"
            element={
              <ProtectedRoute>
                <RoleRoute roles={['master']}>
                  <AdminServicos />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/financeiro"
            element={
              <ProtectedRoute>
                <AdminFinanceiro />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute>
                <RoleRoute roles={['master']}>
                  <AdminUsuarios />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
