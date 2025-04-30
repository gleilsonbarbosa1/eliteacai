import { supabase } from './supabase';

export async function createPixPayment(amount: number, email?: string, customerId?: string) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-pix`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          email,
          customerId
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao gerar pagamento PIX');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error creating PIX payment:', error);
    throw error;
  }
}