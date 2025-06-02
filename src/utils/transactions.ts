import { supabase } from '../lib/supabase';
import type { Transaction } from '../types';

export async function getAvailableBalance(customerId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('customer_balances')
      .select('saldo_disponivel')
      .eq('customer_id', customerId)
      .single();

    if (error) throw error;

    return Math.max(0, data?.saldo_disponivel || 0);
  } catch (error) {
    console.error('Error getting available balance:', error);
    return 0;
  }
}

export async function getNextExpiringCashback(customerId: string): Promise<{ amount: number; date: Date } | null> {
  try {
    const { data, error } = await supabase
      .from('customer_balances')
      .select('proximo_cashback_expirando, data_expiracao')
      .eq('customer_id', customerId)
      .single();

    if (error) throw error;

    if (data && data.proximo_cashback_expirando > 0 && data.data_expiracao) {
      return {
        amount: data.proximo_cashback_expirando,
        date: new Date(data.data_expiracao)
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting next expiring cashback:', error);
    return null;
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