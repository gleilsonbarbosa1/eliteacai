import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import Stripe from 'npm:stripe@14.18.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface RequestBody {
  priceId: string;
  mode: 'payment' | 'subscription';
  email?: string;
  successUrl: string;
  cancelUrl: string;
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body
    const { priceId, mode, email, successUrl, cancelUrl }: RequestBody = await req.json();

    if (!priceId || !mode || !successUrl || !cancelUrl) {
      throw new Error('Parâmetros obrigatórios não fornecidos');
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      locale: 'pt-BR', // Set locale to Portuguese
    });

    // Return the checkout URL
    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});