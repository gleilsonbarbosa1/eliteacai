import { Outlet, Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';

export default function ClientLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
      <header className="header">
        <div className="header-container">
          <div className="header-content">
            <h1 className="header-title">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Elite Açaí
            </h1>
            <Link
              to="/admin"
              className="btn-secondary !py-2 text-sm"
            >
              Área Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}