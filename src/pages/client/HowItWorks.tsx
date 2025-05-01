import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, CheckCircle2, Scale, CreditCard, Gift, Coins, Clock, ShoppingBag } from 'lucide-react';

export default function HowItWorks() {
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
            <Sparkles className="w-7 h-7 text-purple-600" />
            Como Funciona o Sistema
          </h1>
        </div>

        <div className="prose prose-purple max-w-none">
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Gift className="w-6 h-6 text-purple-600" />
                Benefícios do Programa
              </h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Ganhe 5% de cashback em todas as compras na loja
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Use seu cashback como desconto em compras futuras
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Acumule pontos sem limite de valor
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-6 h-6 text-purple-600" />
                Como Participar
              </h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">1.</span>
                  Faça seu cadastro com email e telefone
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">2.</span>
                  Registre suas compras diretamente no sistema
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">3.</span>
                  Aguarde a aprovação do cashback (geralmente imediata)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">4.</span>
                  Use seu saldo em compras futuras
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <ShoppingBag className="w-6 h-6 text-purple-600" />
                Como Registrar Compras
              </h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">1.</span>
                  Faça login na sua conta
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">2.</span>
                  Clique em "Registrar Nova Compra"
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">3.</span>
                  Digite o valor total da compra
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">4.</span>
                  O registro só é permitido quando você estiver na loja
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Scale className="w-6 h-6 text-purple-600" />
                Regras do Programa
              </h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  O cashback é pessoal e intransferível
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  O saldo não é convertido em dinheiro
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Valor mínimo para resgate: R$ 1,00
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  O cashback expira no final do mês seguinte
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Clock className="w-6 h-6 text-purple-600" />
                Prazos e Validade
              </h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  O cashback é creditado após a aprovação da compra
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Cashback de compras expira no final do mês seguinte
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Fique atento às notificações de expiração
                </li>
              </ul>
            </section>

            <div className="pt-6 border-t border-gray-100">
              <Link
                to="/client"
                className="btn-primary flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Começar a Usar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}