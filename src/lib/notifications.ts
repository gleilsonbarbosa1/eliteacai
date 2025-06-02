import { supabase } from './supabase';
import type { WhatsAppNotification } from '../types';

export async function sendWhatsAppNotification(notification: WhatsAppNotification) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-notification`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send notification');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
    return { success: false, error: error.message };
  }
}