import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import Stripe from "npm:stripe@14.14.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    });

    const { 
      price_id, 
      success_url, 
      cancel_url, 
      mode,
      customer_email,
      customer_id
    } = await req.json();

    // If no customer_id is provided but we have an email, create or find the customer
    let finalCustomerId = customer_id;
    if (!finalCustomerId && customer_email) {
      // Try to find existing customer by email
      const { data: existingCustomer } = await supabaseClient
        .from('customers')
        .select('id')
        .eq('email', customer_email)
        .single();

      if (existingCustomer) {
        finalCustomerId = existingCustomer.id;
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabaseClient
          .from('customers')
          .insert({
            email: customer_email,
            balance: 0
          })
          .select()
          .single();

        if (customerError) throw customerError;
        finalCustomerId = newCustomer.id;
      }
    }

    if (!finalCustomerId) {
      throw new Error('Customer ID is required');
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode,
      success_url,
      cancel_url,
      customer_email,
      metadata: {
        customer_id: finalCustomerId,
        customer_email
      },
    });

    // Calculate expiration date (90 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 90);

    // Create pending credit record
    const { error: creditError } = await supabaseClient
      .from('credits')
      .insert({
        amount: 10, // Fixed amount for now
        expires_at: expirationDate.toISOString(),
        status: 'pending',
        payment_method: 'credit_card',
        stripe_session_id: session.id,
        customer_id: finalCustomerId
      });

    if (creditError) {
      throw creditError;
    }

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});