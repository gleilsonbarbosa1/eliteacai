import { useState } from 'react';
import { createCheckoutSession } from '../lib/stripe';
import { STRIPE_PRODUCTS } from '../stripe-config';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface PaymentButtonProps {
  productId: keyof typeof STRIPE_PRODUCTS;
  className?: string;
  children: React.ReactNode;
  email?: string;
}

export default function PaymentButton({ productId, className, children, email }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const product = STRIPE_PRODUCTS[productId];
      const url = await createCheckoutSession(product.priceId, product.mode, email);
      
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      console.error('Erro no pagamento:', error);
      toast.error(error.message || 'Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? 'Processando...' : children}
    </button>
  );
}