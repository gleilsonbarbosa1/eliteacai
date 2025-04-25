import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import ClientLayout from './layouts/ClientLayout';
import AdminDashboard from './pages/admin/Dashboard';
import ClientDashboard from './pages/client/Dashboard';
import PasswordReset from './pages/client/PasswordReset';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Navigate to="/client" replace />} />
        
        {/* Client Routes */}
        <Route path="/client" element={<ClientLayout />}>
          <Route index element={<ClientDashboard />} />
        </Route>

        {/* Password Reset Route */}
        <Route path="/reset-password" element={<PasswordReset />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/client" replace />} />
      </Routes>
    </>
  );
}

export default App;