import { useState } from 'react';
import { createCheckoutSession } from '../lib/stripe';
import { STRIPE_PRODUCTS } from '../stripe-config';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface PaymentButtonProps {
  productId: keyof typeof STRIPE_PRODUCTS;
  className?: string;
  children: React.ReactNode;
}

export default function PaymentButton({ productId, className, children }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Check if user is logged in
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        toast.error('Você precisa estar logado para fazer uma compra');
        navigate('/client');
        return;
      }

      const product = STRIPE_PRODUCTS[productId];
      const url = await createCheckoutSession(product.priceId, product.mode);
      
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      
      if (error.message.includes('logado') || error.message.includes('sessão')) {
        navigate('/client');
        return;
      }
      
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