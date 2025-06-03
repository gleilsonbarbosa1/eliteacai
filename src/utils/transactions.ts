import { supabase } from '../lib/supabase';
import type { Transaction, CustomerBalance } from '../types';

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

export async function getAvailableBalance(customerId: string): Promise<number> {
  try {
    // Get balance from view
    const { data: balance, error } = await supabase
      .from('customer_balances')
      .select('available_balance')
      .eq('customer_id', customerId)
      .single();

    if (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }

    // Return balance, ensuring it's never negative
    return Math.max(balance?.available_balance || 0, 0);
  } catch (error) {
    console.error('Error getting available balance:', error);
    return 0;
  }
}

export async function getNextExpiringCashback(customerId: string): Promise<{ amount: number; date: Date } | null> {
  try {
    // Get next expiring cashback from view
    const { data: balance, error } = await supabase
      .from('customer_balances')
      .select('expiring_amount, expiration_date')
      .eq('customer_id', customerId)
      .single();

    if (error) {
      console.error('Error fetching expiring cashback:', error);
      throw error;
    }

    if (balance?.expiring_amount && balance?.expiration_date) {
      return {
        amount: Math.max(balance.expiring_amount, 0), // Ensure non-negative
        date: new Date(balance.expiration_date)
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting next expiring cashback:', error);
    return null;
  }
}

export async function redeemCashback(customerId: string, amount: number) {
  try {
    // Get current balance from view
    const { data: balance, error: balanceError } = await supabase
      .from('customer_balances')
      .select('available_balance')
      .eq('customer_id', customerId)
      .single();

    if (balanceError) throw balanceError;

    // Round values for comparison
    const roundedBalance = Math.round((balance?.available_balance || 0) * 100) / 100;
    const roundedAmount = Math.round(amount * 100) / 100;

    if (!roundedBalance || roundedBalance < roundedAmount) {
      throw new Error(`Saldo insuficiente para resgate. Disponível: R$ ${roundedBalance?.toFixed(2)}`);
    }

    // Validate minimum redemption amount
    if (roundedAmount < 1.00) {
      throw new Error('O valor mínimo para resgate é R$ 1,00');
    }

    // Create redemption transaction
    const { data: redemption, error: redemptionError } = await supabase
      .from('transactions')
      .insert({
        customer_id: customerId,
        amount: roundedAmount,
        cashback_amount: -roundedAmount,
        type: 'redemption',
        status: 'approved'
      })
      .select('*')
      .single();

    if (redemptionError) {
      throw redemptionError;
    }

    // Get updated balance
    const updatedBalance = await getAvailableBalance(customerId);

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