import { Outlet, Link } from 'react-router-dom';
import { CreditCard, MessageCircle, HelpCircle } from 'lucide-react';

export default function ClientLayout() {
  const whatsappNumber = '5585989041010';
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
      <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Elite Açaí
            </h1>
            <div className="flex items-center gap-3">
              <Link
                to="/client/how-it-works"
                className="bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl py-2 px-4 flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow active:scale-95"
                title="Entenda como funciona o sistema"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Como Funciona</span>
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-600 text-white rounded-xl py-2 px-4 flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow active:scale-95"
                title="Fale conosco no WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Fale Conosco</span>
              </a>
              <Link
                to="/admin"
                className="text-sm btn-secondary !py-2"
              >
                Área Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}