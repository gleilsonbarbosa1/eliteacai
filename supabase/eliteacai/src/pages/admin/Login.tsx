import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const [loginForm, setLoginForm] = useState({ 
    email: '', 
    password: '' 
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First check if there's an existing session
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        await supabase.auth.signOut();
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) throw error;

      // Check if the user is an admin
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (adminError || !adminData) {
        // If not an admin, sign out and show error
        await supabase.auth.signOut();
        throw new Error('Acesso não autorizado. Apenas administradores podem fazer login.');
      }

      toast.success('Login realizado com sucesso!');
      setLoginForm({ email: '', password: '' });
      navigate('/admin'); // Redirect to admin dashboard
    } catch (error: any) {
      console.error('Error logging in:', error);
      toast.error(error.message || 'Email ou senha inválidos');
      
      // Ensure we're signed out on error
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LogIn className="w-6 h-6 text-primary-600" />
            Login Administrativo
          </h1>
          <Link
            to="/client"
            className="btn-secondary"
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
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}