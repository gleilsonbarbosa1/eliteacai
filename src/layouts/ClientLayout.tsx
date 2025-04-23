import { Outlet, Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';

export default function ClientLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
      <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Elite Açaí
            </h1>
            <Link
              to="/admin"
              className="text-sm btn-secondary !py-2"
            >
              Área Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}