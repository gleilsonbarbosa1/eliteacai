import { supabase } from './supabase';
import type { Transaction } from '../types';

export async function uploadReceipt(file: File, transactionId: string) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('transactionId', transactionId);

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-receipt`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error uploading receipt');
    }

    const data = await response.json();
    return data.url;
  } catch (error: any) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
}

export async function createTransaction(data: Partial<Transaction>) {
  try {
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert(data)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23514') {
        throw new Error('Valor inválido para a transação');
      }
      if (error.code === '23503') {
        throw new Error('Cliente não encontrado');
      }
      if (error.code === '23505') {
        throw new Error('Transação duplicada. Por favor, aguarde alguns minutos antes de tentar novamente.');
      }
      throw error;
    }

    return { transaction, error: null };
  } catch (error: any) {
    return { 
      transaction: null, 
      error: error.message || 'Erro ao processar transação'
    };
  }
}