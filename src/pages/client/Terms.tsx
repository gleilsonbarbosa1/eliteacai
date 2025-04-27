import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, CheckCircle2, Scale, CreditCard } from 'lucide-react';

export default function Terms() {
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
            Regulamento do Programa de Cashback
          </h1>
        </div>

        <div className="prose prose-purple max-w-none">
          <p className="text-lg text-gray-600 mb-8">
            Ganhe cashback e economize em suas compras!
          </p>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-purple-600" />
                Como Funciona
              </h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  A cada compra realizada, você acumula um percentual de 5% da compra em forma de cashback.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  O saldo de cashback fica disponível apenas dentro do mesmo mês da compra.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  O saldo expira no primeiro dia do mês seguinte.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Após o registro da compra no site ou via QR Code, o valor ficará pendente para confirmação.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Assim que confirmado, o saldo será liberado na sua conta de registro.
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
                  <span className="text-purple-600 mt-1">•</span>
                  Acesse o site: cashbackelite.com ou escaneie o QR Code no caixa.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Cadastre-se informando seus dados e crie uma senha.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Registre o valor de sua nota de compra no site para acumular cashback.
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
                  O saldo de cashback é pessoal e intransferível.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  O cashback não é convertido em dinheiro.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Valor mínimo para resgate: R$ 1,00.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Resgates são permitidos somente dentro do mês de validade.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Formas de pagamento aceitas: Pix, Cartão de Crédito, Débito e Dinheiro.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Utilize seu cashback acumulado em novas compras para garantir ainda mais economia.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  O registro da compra no site é permitido somente dentro da loja.
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