import { supabase } from '../lib/supabase';
import type { Transaction } from '../types';

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

export async function redeemCashback(customerId: string, amount: number) {
  try {
    // First check available balance
    const { data: balance, error: balanceError } = await supabase
      .rpc('get_available_balance', { p_customer_id: customerId });

    if (balanceError) throw balanceError;

    if (!balance || balance < amount) {
      throw new Error(`Saldo insuficiente. Disponível: R$ ${balance?.toFixed(2)}`);
    }

    const { data: redemption, error } = await supabase
      .from('transactions')
      .insert({
        customer_id: customerId,
        amount: amount,
        cashback_amount: -amount,
        type: 'redemption',
        status: 'approved'
      })
      .select('*')
      .single();

    if (error) {
      if (error.message.includes('Insufficient balance')) {
        throw new Error('Saldo insuficiente para resgate');
      }
      throw error;
    }

    // Get updated balance after redemption
    const { data: updatedBalance } = await supabase
      .rpc('get_available_balance', { p_customer_id: customerId });

    return { 
      redemption, 
      error: null,
      updatedBalance 
    };
  } catch (error: any) {
    return { 
      redemption: null, 
      error: error.message || 'Erro ao processar resgate',
      updatedBalance: null
    };
  }
}