import { Outlet, useNavigate, Navigate } from 'react-router-dom';
import { CreditCard, LogOut, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Admin } from '../types';
import toast from 'react-hot-toast';

export default function AdminLayout() {
  const [adminData, setAdminData] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setAdminData(null);
        setLoading(false);
        navigate('/admin/login');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const checkSession = async () => {
    try {
      setLoading(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Erro ao recuperar sessão');
      }

      // More specific session check
      if (!session || !session.user) {
        // Don't throw error, just redirect to login
        setAdminData(null);
        navigate('/admin/login');
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (adminError) {
        console.error('Error fetching admin data:', adminError);
        throw new Error('Erro ao recuperar dados do administrador');
      }

      if (!adminData) {
        // User exists but is not an admin
        await supabase.auth.signOut();
        toast.error('Acesso não autorizado');
        navigate('/admin/login');
        return;
      }

      setAdminData(adminData as Admin);
    } catch (error: any) {
      console.error('Error checking session:', error);
      await supabase.auth.signOut();
      toast.error(error.message || 'Erro ao verificar sessão');
      navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await supabase.auth.signOut();
      setAdminData(null);
      navigate('/admin/login');
      toast.success('Sessão encerrada com sucesso');
    } catch (error: any) {
      console.error('Error logging out:', error);
      toast.error('Erro ao fazer logout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!adminData) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
      <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-purple-600" />
              Área Administrativa
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{adminData.email}</span>
              </div>
              <button
                onClick={handleAdminLogout}
                className="btn-secondary py-2 px-4 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}