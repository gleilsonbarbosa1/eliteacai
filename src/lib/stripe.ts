import { loadStripe } from '@stripe/stripe-js';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

if (!stripePublicKey) {
  throw new Error('Missing Stripe public key');
}

export const stripe = loadStripe(stripePublicKey);

export async function createCheckoutSession(
  priceId: string, 
  mode: 'payment' | 'subscription',
  email?: string,
  customerId?: string
) {
  try {
    // Create checkout session
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/payment/cancel`,
          mode,
          customer_email: email,
          customer_id: customerId
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