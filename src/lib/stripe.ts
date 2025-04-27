import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

if (!stripePublicKey) {
  throw new Error('Missing Stripe public key');
}

export const stripe = loadStripe(stripePublicKey);

export async function createCheckoutSession(priceId: string, mode: 'payment' | 'subscription') {
  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      throw new Error('Você precisa estar logado para fazer uma compra.');
    }

    // Get the current origin for redirect URLs
    const origin = window.location.origin;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/payment/cancel`,
          mode,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao criar sessão de pagamento');
    }

    const { url } = await response.json();
    if (!url) {
      throw new Error('URL de pagamento não gerada');
    }

    return url;
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}