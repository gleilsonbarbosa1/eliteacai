import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface NotificationPayload {
  type: 'welcome' | 'purchase' | 'redemption';
  customerId: string;
  amount?: number;
  cashbackAmount?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: NotificationPayload = await req.json();
    
    // Get customer phone number
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('phone')
      .eq('id', payload.customerId)
      .single();

    if (customerError || !customer) {
      throw new Error('Customer not found');
    }

    let message = '';

    switch (payload.type) {
      case 'welcome':
        message = `🎉 Bem-vindo ao nosso programa de cashback!

Aqui você receberá 5% de volta em todas as suas compras.

Benefícios:
✨ 5% de cashback em todas as compras
💰 Resgate seu saldo quando quiser
📱 Acompanhe suas transações pelo app

Comece a economizar agora mesmo! 🚀`;
        break;

      case 'purchase':
        if (payload.amount && payload.cashbackAmount) {
          message = `✨ Compra registrada com sucesso!

💰 Valor da compra: R$ ${payload.amount.toFixed(2)}
🎁 Cashback (5%): R$ ${payload.cashbackAmount.toFixed(2)}

Sua compra está em análise e o cashback será creditado após a aprovação.`;
        }
        break;

      case 'redemption':
        if (payload.amount) {
          message = `🎉 Resgate realizado com sucesso!

💰 Valor resgatado: R$ ${payload.amount.toFixed(2)}

Obrigado por participar do nosso programa de cashback!`;
        }
        break;

      default:
        throw new Error('Invalid notification type');
    }

    // Here you would integrate with your WhatsApp API provider
    // For now, we'll just simulate the message sending
    console.log(`Sending WhatsApp message to ${customer.phone}:`, message);

    return new Response(
      JSON.stringify({ success: true, message }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});