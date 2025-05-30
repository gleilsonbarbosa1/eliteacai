import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      navigate('/client');
      return;
    }

    const checkPaymentStatus = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('Erro ao identificar usuário');
        }

        // Check payment status
        const { data: credit, error } = await supabase
          .from('credits')
          .select('amount, status')
          .eq('stripe_session_id', sessionId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new Error('Pagamento não encontrado');
          }
          throw error;
        }

        if (credit.status === 'approved') {
          setAmount(credit.amount);
          setLoading(false);
        } else if (credit.status === 'rejected') {
          throw new Error('Pagamento não aprovado');
        } else {
          // Keep checking every 2 seconds
          setTimeout(checkPaymentStatus, 2000);
        }
      } catch (error: any) {
        console.error('Error checking payment status:', error);
        
        // Clear session and redirect to login only for session-related errors
        if (error.message?.includes('session')) {
          await supabase.auth.signOut();
          navigate('/client');
          return;
        }
        
        toast.error(error.message || 'Erro ao verificar status do pagamento');
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="glass-card p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento Confirmado!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Seus créditos no valor de R$ {amount?.toFixed(2)} foram adicionados à sua conta.
          </p>

          <Link
            to="/client"
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para o Início
          </Link>
        </div>
      </div>
    </div>
  );
}