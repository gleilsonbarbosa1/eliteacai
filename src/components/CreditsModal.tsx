import { useState } from 'react';
import { X, Wallet, CheckCircle2, Scale, CreditCard, Coins, Gift } from 'lucide-react';
import { createCheckoutSession } from '../lib/stripe';
import { STRIPE_PRODUCTS } from '../stripe-config';
import toast from 'react-hot-toast';
import type { Customer } from '../types';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
}

export default function CreditsModal({ isOpen, onClose, customer }: CreditsModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'info' | 'purchase'>('info');
  const [email, setEmail] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<keyof typeof STRIPE_PRODUCTS>('credits_10');

  const handlePurchase = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      if (!customer && !email) {
        toast.error('Por favor, informe seu email');
        return;
      }

      if (!customer && !email.match(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)) {
        toast.error('Por favor, informe um email válido');
        return;
      }

      const product = STRIPE_PRODUCTS[selectedProduct];
      const url = await createCheckoutSession(
        product.priceId, 
        product.mode,
        customer?.email || email,
        customer?.id
      );
      
      if (url) {
        setStep('info');
        onClose();
        window.location.href = url;
      }
    } catch (error: any) {
      console.error('Error purchasing credits:', error);
      toast.error(error.message || 'Erro ao processar sua compra');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
          {step === 'info' ? (
            <>
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
                      Pague com Cartão de Crédito.
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

                <section>
                  <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    Formas de pagamento
                  </h3>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      Cartão de Crédito
                    </li>
                  </ul>
                </section>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setStep('purchase')}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Wallet className="w-5 h-5" />
                  Comprar Créditos
                </button>
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
            </>
          ) : (
            <>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Escolha o valor dos créditos
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(STRIPE_PRODUCTS).map(([key, product]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedProduct(key as keyof typeof STRIPE_PRODUCTS)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          selectedProduct === key
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-200'
                        }`}
                      >
                        <div className="text-xl font-bold text-purple-600 mb-1">
                          R$ {product.amount.toFixed(2)}
                        </div>
                        <div className="text-sm text-green-600 flex items-center gap-1">
                          <Gift className="w-4 h-4" />
                          + R$ {(product.amount * 0.10).toFixed(2)} de cashback
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {!customer && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seu email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field"
                      placeholder="exemplo@email.com"
                      required
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Informe seu email para receber os créditos
                    </p>
                  </div>
                )}

                <div className="pt-6 border-t border-gray-100">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('info')}
                      className="btn-secondary flex-1"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handlePurchase}
                      disabled={loading}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        'Processando...'
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          Pagar com Cartão
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}