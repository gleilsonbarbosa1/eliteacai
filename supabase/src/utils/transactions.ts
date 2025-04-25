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

export async function redeemCashback(customerId: string, amount: number) {
  try {
    // First check available balance
    const { data: balance, error: balanceError } = await supabase
      .rpc('get_available_balance', { p_customer_id: customerId });

    if (balanceError) throw balanceError;

    // Round values for comparison to avoid floating point precision issues
    const roundedBalance = Math.round((balance || 0) * 100) / 100;
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
      const message = redemptionError.message || '';
      
      // Check for specific error messages from the database
      if (message.includes('Você possui R$') && message.includes('em cashback expirado')) {
        throw new Error(message);
      }
      
      if (message.includes('Saldo insuficiente')) {
        throw new Error(`Saldo insuficiente para resgate. Disponível: R$ ${roundedBalance.toFixed(2)}`);
      }

      throw redemptionError;
    }

    // Get updated balance after redemption
    const { data: updatedBalance } = await supabase
      .rpc('get_available_balance', { p_customer_id: customerId });

    return { 
      redemption, 
      error: null,
      updatedBalance: Math.round((updatedBalance || 0) * 100) / 100
    };
  } catch (error: any) {
    return { 
      redemption: null, 
      error: error.message || 'Erro ao processar resgate',
      updatedBalance: null
    };
  }
}

export async function getAvailableBalance(customerId: string): Promise<number> {
  try {
    const { data: balance, error } = await supabase
      .rpc('get_available_balance', { p_customer_id: customerId });

    if (error) throw error;
    return Math.round((balance || 0) * 100) / 100;
  } catch (error) {
    console.error('Error getting available balance:', error);
    return 0;
  }
}

export async function getNextExpiringCashback(customerId: string): Promise<{ amount: number; date: Date } | null> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('cashback_amount, expires_at')
      .eq('customer_id', customerId)
      .eq('type', 'purchase')
      .eq('status', 'approved')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        amount: Math.round(data[0].cashback_amount * 100) / 100,
        date: new Date(data[0].expires_at)
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting next expiring cashback:', error);
    return null;
  }
}

export async function getExpiredCashback(customerId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('cashback_amount')
      .eq('customer_id', customerId)
      .eq('type', 'purchase')
      .eq('status', 'approved')
      .lte('expires_at', new Date().toISOString());

    if (error) throw error;

    const total = data?.reduce((sum, t) => sum + (t.cashback_amount || 0), 0) || 0;
    return Math.round(total * 100) / 100;
  } catch (error) {
    console.error('Error getting expired cashback:', error);
    return 0;
  }
}