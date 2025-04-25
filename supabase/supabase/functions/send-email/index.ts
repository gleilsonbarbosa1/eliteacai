import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface EmailPayload {
  to: string;
  type: 'reset_password' | 'test';
  token?: string;
}

interface ConfigError {
  missingVars: string[];
}

function validateConfig(): ConfigError | null {
  const requiredVars = ['SENDGRID_API_KEY', 'SMTP_FROM'];
  const missingVars = requiredVars.filter(varName => !Deno.env.get(varName));
  
  return missingVars.length > 0 ? { missingVars } : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate configuration
    const configError = validateConfig();
    if (configError) {
      const missingVarsStr = configError.missingVars.join(', ');
      console.error(`Missing required environment variables: ${missingVarsStr}`);
      throw new Error(
        `Email service configuration error: Missing ${missingVarsStr}. Please configure these variables in your Supabase project settings.`
      );
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')!;
    const FROM_EMAIL = Deno.env.get('SMTP_FROM')!;

    const payload: EmailPayload = await req.json();
    const { to, type, token } = payload;

    // Validate email payload
    if (!to || !type) {
      throw new Error('Missing required fields: "to" and "type" are required');
    }

    let subject = '';
    let content = '';

    switch (type) {
      case 'reset_password':
        if (!token) {
          throw new Error('Token is required for password reset emails');
        }
        subject = 'Recuperação de Senha - Elite Açaí';
        content = `
          <h2>Recuperação de Senha</h2>
          <p>Você solicitou a recuperação de senha da sua conta Elite Açaí.</p>
          <p>Use o código abaixo para redefinir sua senha:</p>
          <p style="font-size: 24px; font-weight: bold; color: #9333ea; padding: 10px; background: #f3e8ff; border-radius: 8px; text-align: center;">
            ${token}
          </p>
          <p>Este código expira em 1 hora.</p>
          <p>Se você não solicitou esta recuperação, ignore este email.</p>
        `;
        break;
      case 'test':
        subject = 'Teste de Configuração - Elite Açaí';
        content = `
          <h2>Teste de Configuração de Email</h2>
          <p>Este é um email de teste para verificar a configuração do sistema de envio de emails.</p>
          <p>Se você recebeu este email, significa que a configuração está funcionando corretamente!</p>
        `;
        break;
      default:
        throw new Error('Tipo de email inválido');
    }

    const sendgridPayload = {
      personalizations: [{
        to: [{ email: to }],
      }],
      from: {
        email: FROM_EMAIL,
        name: 'Elite Açaí',
      },
      subject,
      content: [{
        type: 'text/html',
        value: content,
      }],
    };

    console.log('Sending email with payload:', {
      to,
      type,
      subject,
      hasToken: !!token
    });

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendgridPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('SendGrid API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`SendGrid API error: ${response.status} ${response.statusText}`);
    }

    console.log('Email sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Email function error:', error);
    
    // Determine if this is a configuration error
    const isConfigError = error.message.includes('configuration error');
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        type: isConfigError ? 'configuration' : 'runtime'
      }),
      {
        status: isConfigError ? 503 : 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});