import { useState } from 'react';
import { X, Wallet, CheckCircle2, Scale, Coins, Gift, Copy, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Customer } from '../types';
import { createPixPayment } from '../lib/pix';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
}

export default function CreditsModal({ isOpen, onClose, customer }: CreditsModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'info' | 'purchase'>('info');
  const [email, setEmail] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number>(10);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-purple-600" />
            Sistema de Venda de Créditos
          </h2>
          <button
            onClick={() => {
              setStep('info');
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Garanta mais praticidade nas suas compras!
          </p>

          <div className="space-y-6">
            <section>
              <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-purple-600" />
                Como funciona
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Escolha o valor que deseja comprar.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Pague diretamente na loja.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Seu saldo de crédito ficará disponível imediatamente para utilizar em compras futuras.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Comprando créditos, você ainda acumula cashback normalmente!
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                <Coins className="w-5 h-5 text-purple-600" />
                Vantagens
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Mais agilidade no pagamento na loja.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Não precisa usar cartão ou dinheiro a cada compra.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Aproveite promoções exclusivas para quem compra créditos.
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                <Scale className="w-5 h-5 text-purple-600" />
                Regras
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Os créditos são pessoais e intransferíveis.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Não são reembolsáveis em dinheiro.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  Validade dos créditos: 90 dias após a compra.
                </li>
              </ul>
            </section>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => {
                setStep('info');
                onClose();
              }}
              className="btn-secondary flex-1"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}