import { Outlet, useNavigate, Navigate } from 'react-router-dom';
import { CreditCard, LogOut, User, ExternalLink, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Admin } from '../types';
import toast from 'react-hot-toast';

export default function AdminLayout() {
  const [adminData, setAdminData] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
        console.error('Session error:', sessionError);
        throw new Error(`Erro ao recuperar sessão: ${sessionError.message}`);
      }

      if (!session || !session.user) {
        console.log('No active session found');
        setAdminData(null);
        navigate('/admin/login');
        return;
      }

      console.log('Fetching admin data for user:', session.user.id);

      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (adminError) {
        console.error('Admin data fetch error:', adminError);
        if (adminError.code === 'PGRST116') {
          throw new Error('Usuário não tem permissão de administrador');
        } else {
          throw new Error(`Erro ao recuperar dados do administrador: ${adminError.message}`);
        }
      }

      if (!adminData) {
        console.log('No admin data found for user');
        await supabase.auth.signOut();
        toast.error('Acesso não autorizado');
        navigate('/admin/login');
        return;
      }

      console.log('Admin data retrieved successfully');
      setAdminData(adminData as Admin);
    } catch (error: any) {
      console.error('Error in checkSession:', error);
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
      console.error('Logout error:', error);
      toast.error('Erro ao fazer logout: ' + error.message);
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
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-purple-600" />
              Área Administrativa
            </h1>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            {/* Desktop menu */}
            <div className="hidden lg:flex items-center gap-4">
              <a
                href="https://celebrated-khapse-622a0c.netlify.app/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm btn-secondary !py-1.5 !px-3 flex items-center gap-1.5 bg-green-500 text-white border-green-600 hover:bg-green-600"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Sistema de Pedidos
              </a>
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

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="lg:hidden mt-4 py-4 border-t border-gray-100">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{adminData.email}</span>
                </div>
                <a
                  href="https://celebrated-khapse-622a0c.netlify.app/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm btn-secondary !py-1.5 !px-3 flex items-center gap-1.5 bg-green-500 text-white border-green-600 hover:bg-green-600 w-full justify-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Sistema de Pedidos
                </a>
                <button
                  onClick={handleAdminLogout}
                  className="btn-secondary py-2 px-4 flex items-center gap-2 w-full justify-center"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}