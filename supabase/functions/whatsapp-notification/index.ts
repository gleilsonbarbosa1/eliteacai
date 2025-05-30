import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface WhatsAppNotification {
  type: 'welcome' | 'purchase' | 'redemption';
  customerId: string;
  amount?: number;
  cashbackAmount?: number;
  title?: string;
  date?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const notification: WhatsAppNotification = await req.json();
    const { type, customerId, amount, cashbackAmount, title = 'Elite Açaí', date } = notification;

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Get customer phone number
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('phone, name')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;
    if (!customer?.phone) throw new Error('Customer phone not found');

    // Format message based on notification type
    let messageBody = '';
    switch (type) {
      case 'welcome':
        messageBody = `Olá${customer.name ? ` ${customer.name}` : ''}! 👋\n\nBem-vindo ao sistema de cashback do Elite Açaí! 🎉\n\nA cada compra você acumula 5% de cashback para usar em compras futuras.\n\nAproveite! 😊`;
        break;

      case 'purchase':
        messageBody = `Compra registrada com sucesso! ✅\n\nValor: R$ ${amount?.toFixed(2)}\nCashback: R$ ${cashbackAmount?.toFixed(2)}\n\nSeu cashback já está disponível para uso! 🎉`;
        break;

      case 'redemption':
        messageBody = `Resgate de cashback realizado! ✅\n\nValor resgatado: R$ ${amount?.toFixed(2)}\n\nAproveite seu desconto! 🎉`;
        break;

      default:
        throw new Error('Invalid notification type');
    }

    // Add header with title and date
    const currentDate = date || new Date().toLocaleDateString('pt-BR');
    const fullMessage = `*${title}*\n${currentDate}\n\n${messageBody}`;

    // Send WhatsApp message using WhatsApp Business API
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v17.0/${Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: customer.phone,
          type: 'text',
          text: {
            preview_url: false,
            body: fullMessage,
          },
        }),
      }
    );

    if (!whatsappResponse.ok) {
      const error = await whatsappResponse.json();
      throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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