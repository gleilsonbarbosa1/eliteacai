import { supabase } from './supabase';

export async function sendPasswordResetEmail(email: string, token: string) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          type: 'reset_password',
          token,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw { 
        ...data,
        status: response.status,
        statusText: response.statusText 
      };
    }

    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.error || 'Failed to send email',
      type: error.type || 'runtime'
    };
  }
}

export async function sendTestEmail(email: string) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          type: 'test',
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw { 
        ...data,
        status: response.status,
        statusText: response.statusText 
      };
    }

    return data;
  } catch (error) {
    console.error('Error sending test email:', error);
    return {
      success: false,
      error: error.error || 'Failed to send test email',
      type: error.type || 'runtime'
    };
  }
}