import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import Stripe from "npm:stripe@14.14.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No signature found');
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Update credit status to approved
        const { error: updateError } = await supabaseClient
          .from('credits')
          .update({ status: 'approved' })
          .eq('stripe_session_id', session.id);

        if (updateError) {
          throw updateError;
        }

        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object;
        
        // Update credit status to rejected
        const { error: updateError } = await supabaseClient
          .from('credits')
          .update({ status: 'rejected' })
          .eq('stripe_session_id', session.id);

        if (updateError) {
          throw updateError;
        }

        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }
});