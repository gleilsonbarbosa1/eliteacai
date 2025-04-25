import { useState } from 'react';
import { LogIn, Store } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function StoreLogin() {
  const [loginForm, setLoginForm] = useState({ 
    code: '', 
    password: '' 
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStoreLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify store credentials
      const { data: storeId, error: verifyError } = await supabase
        .rpc('verify_store_password', {
          p_code: loginForm.code.toUpperCase(),
          p_password: loginForm.password
        });

      if (verifyError || !storeId) {
        throw new Error('Código ou senha inválidos');
      }

      // Fetch store data
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (storeError || !storeData) {
        throw new Error('Erro ao carregar dados da loja');
      }

      // Store the store data in localStorage
      localStorage.setItem('store', JSON.stringify(storeData));

      toast.success('Login realizado com sucesso!');
      navigate('/store/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login');
      console.error('Error logging in:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-8">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Store className="w-10 h-10 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Elite Açaí
            </h1>
            <p className="text-gray-600">
              Área da Loja
            </p>
          </div>
          <Link
            to="/admin"
            className="btn-secondary py-2 px-4 flex items-center gap-2"
          >
            Área Admin
          </Link>
        </div>

        <form onSubmit={handleStoreLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código da Loja
            </label>
            <input
              type="text"
              value={loginForm.code}
              onChange={e => setLoginForm({...loginForm, code: e.target.value.toUpperCase()})}
              className="input-field"
              placeholder="ELITE01"
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