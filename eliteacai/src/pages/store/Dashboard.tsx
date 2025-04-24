import { useState, useEffect } from 'react';
import { Store, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function StoreDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if store is logged in
    const store = localStorage.getItem('store');
    if (!store) {
      navigate('/store/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('store');
    navigate('/store/login');
    toast.success('Logout realizado com sucesso!');
  };

  const store = JSON.parse(localStorage.getItem('store') || '{}');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
      <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-purple-600" />
              Elite Açaí
            </h1>
            <div className="flex items-center gap-3">
              <Link
                to="/admin"
                className="btn-secondary py-2 px-4 flex items-center gap-2"
              >
                Área Admin
              </Link>
              <button
                onClick={handleLogout}
                className="btn-secondary py-2 px-4 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-lg mx-auto">
          <div className="glass-card p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Bem-vindo, {store.name}!
            </h2>
            <p className="text-gray-600 mb-4">
              O registro de compras agora é feito diretamente pelos clientes através do aplicativo.
            </p>
            <p className="text-sm text-gray-500">
              Código da loja: <span className="font-medium">{store.code}</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}