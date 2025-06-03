import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Tag, Calendar, Clock } from 'lucide-react';

export default function Promotions() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card p-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/client"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-7 h-7 text-purple-600" />
            Promoções Atuais
          </h1>
        </div>

        <div className="space-y-8">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl">
            <div className="flex items-center gap-2 text-xl font-bold mb-2">
              <Sparkles className="w-6 h-6" />
              Cashback Garantido
            </div>
            <p className="text-white/90 text-lg">
              Ganhe 5% de cashback em todas as compras!
            </p>
            <p className="text-white/80 mt-2">
              Compre na loja e receba 5% de volta para usar nas próximas compras! 🤑
            </p>
          </div>

          <div className="border-2 border-purple-100 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-purple-600">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Segunda-feira</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Copo de 300g SEM PESO – R$9,99
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>🥣 Válida toda Segunda-feira</li>
                <li>🥣 Porção prática com valor fixo</li>
                <li>🥣 Também gera 5% de cashback!</li>
              </ul>
            </div>
          </div>

          <div className="border-2 border-purple-100 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-purple-600">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Terça-feira</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Copo de 500g SEM PESO – R$15,99
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>✅ Valor fixo, sem cobrança por peso</li>
                <li>✅ Promoção válida toda terça-feira</li>
                <li>✅ Cashback de 5% garantido!</li>
              </ul>
            </div>
          </div>

          <div className="border-2 border-purple-100 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-purple-600">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Quarta-feira</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Copo de 400g SEM PESO – R$12,99
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>🥣 Válida toda Quarta-feira</li>
                <li>🥣 Porção prática com valor fixo</li>
                <li>🥣 Também gera 5% de cashback!</li>
              </ul>
            </div>
          </div>

          <div className="border-2 border-purple-100 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-purple-600">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Quinta-feira</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Promoção Elite - Quilo por R$37,99
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>⭐ Válida toda quinta-feira</li>
                <li>⭐ Preço promocional por quilo</li>
                <li>⭐ E ainda ganha 5% de cashback!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}