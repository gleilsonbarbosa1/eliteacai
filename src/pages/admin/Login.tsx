import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const [loginForm, setLoginForm] = useState(() => {
    const savedData = localStorage.getItem('adminLoginData');
    return savedData ? JSON.parse(savedData) : { 
      email: '', 
      password: '' 
    };
  });
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('adminRememberMe') === 'true';
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);

      if (rememberMe) {
        localStorage.setItem('adminLoginData', JSON.stringify(loginForm));
        localStorage.setItem('adminRememberMe', 'true');
      } else {
        localStorage.removeItem('adminLoginData');
        localStorage.removeItem('adminRememberMe');
      }

      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (signInError) throw signInError;
      if (!session) throw new Error('Erro ao iniciar sessão');

      // Check if the user is an admin
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (adminError) {
        console.error('Error checking admin status:', adminError);
        throw new Error('Erro ao verificar permissões de administrador');
      }
      
      if (!adminData) {
        await supabase.auth.signOut();
        throw new Error('Acesso não autorizado. Esta área é exclusiva para administradores. Use a área do cliente para fazer login.');
      }

      toast.success('Login realizado com sucesso!');
      navigate('/admin');
    } catch (error: any) {
      console.error('Error logging in:', error);
      toast.error(error.message || 'Email ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LogIn className="w-6 h-6 text-purple-600" />
            Login Administrativo
          </h1>
          <Link
            to="/client"
            className="btn-secondary py-2 px-4"
          >
            Área do Cliente
          </Link>
        </div>
        <form onSubmit={handleAdminLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={loginForm.email}
              onChange={e => setLoginForm({...loginForm, email: e.target.value})}
              className="input-field"
              placeholder="admin@exemplo.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <input
              type="password"
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              className="input-field"
              required
              disabled={loading}
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
              Lembrar dados
            </label>
          </div>
          <button
            type="submit"
            className="btn-primary w-full flex items-center justify-center gap-2 text-lg py-4"
            disabled={loading}
          >
            <LogIn className="w-5 h-5" />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}