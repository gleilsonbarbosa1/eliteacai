import { useState, useEffect } from 'react';
import { Phone, Wallet, History, ArrowLeftRight, CreditCard, ChevronRight, Clock, CheckCircle2, XCircle, Image, FileText, User } from 'lucide-react';
import type { Customer, Transaction } from '../../types';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { sendWhatsAppNotification } from '../../lib/notifications';
import { generateCustomerReport } from '../../utils/reportGenerator';

export default function AdminDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  const CASHBACK_RATE = 0.05; // 5% de cashback

  useEffect(() => {
    loadCustomers();
    loadPendingTransactions();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error loading customers:', error);
      toast.error('Erro ao carregar clientes');
    }
  };

  const loadPendingTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customers (
            phone,
            name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingTransactions(data || []);
    } catch (error: any) {
      console.error('Error loading pending transactions:', error);
      toast.error('Erro ao carregar transações pendentes');
    }
  };

  const handleTransactionStatus = async (transactionId: string, status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (error) throw error;

      // Find the transaction to get customer details
      const transaction = pendingTransactions.find(t => t.id === transactionId);
      if (transaction && status === 'approved') {
        await sendWhatsAppNotification({
          type: 'purchase',
          customerId: transaction.customer_id,
          amount: transaction.amount,
          cashbackAmount: transaction.cashback_amount
        });
      }

      // Reload data
      await Promise.all([
        loadPendingTransactions(),
        loadCustomers()
      ]);

      if (activeCustomer) {
        const updatedCustomer = customers.find(c => c.id === activeCustomer.id);
        if (updatedCustomer) {
          setActiveCustomer(updatedCustomer);
        }
      }

      toast.success(`Transação ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso!`);
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      toast.error('Erro ao atualizar transação');
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Por favor, insira um valor válido');
      return;
    }

    setLoading(true);
    const cashbackAmount = Number((amount * CASHBACK_RATE).toFixed(2));

    try {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
          customer_id: activeCustomer.id,
          amount,
          cashback_amount: cashbackAmount,
          type: 'purchase',
          status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await sendWhatsAppNotification({
        type: 'purchase',
        customerId: activeCustomer.id,
        amount,
        cashbackAmount,
      });

      // Reload data
      await Promise.all([
        loadCustomers(),
        loadPendingTransactions()
      ]);

      // Update active customer
      const updatedCustomer = customers.find(c => c.id === activeCustomer.id);
      if (updatedCustomer) {
        setActiveCustomer(updatedCustomer);
      }

      setTransactionAmount('');
      toast.success('Compra registrada com sucesso!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erro ao registrar compra');
    } finally {
      setLoading(false);
    }
  };

  const redeemCashback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !activeCustomer.balance) return;

    setLoading(true);
    try {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
          customer_id: activeCustomer.id,
          amount: activeCustomer.balance,
          cashback_amount: -activeCustomer.balance,
          type: 'redemption',
          status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await sendWhatsAppNotification({
        type: 'redemption',
        customerId: activeCustomer.id,
        amount: activeCustomer.balance,
      });

      // Reload data
      await Promise.all([
        loadCustomers(),
        loadPendingTransactions()
      ]);

      // Update active customer
      const updatedCustomer = customers.find(c => c.id === activeCustomer.id);
      if (updatedCustomer) {
        setActiveCustomer(updatedCustomer);
      }

      toast.success('Cashback resgatado com sucesso!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erro ao resgatar cashback');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      await generateCustomerReport(customers);
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setGeneratingReport(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const renderTransaction = (transaction: Transaction) => (
    <div key={transaction.id} className="transaction-item">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="font-medium flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-primary-600" />
            {/* @ts-ignore */}
            <span>{transaction.customers?.phone}</span>
          </div>
          {/* @ts-ignore */}
          {transaction.customers?.name && (
            <div className="text-gray-600 flex items-center gap-2 mb-2">
              <User className="w-4 h-4" />
              {/* @ts-ignore */}
              <span>{transaction.customers.name}</span>
            </div>
          )}
          <div className="text-lg font-medium mb-1">
            Valor da Compra: R$ {transaction.amount.toFixed(2)}
          </div>
          <div className="text-sm text-green-600">
            Cashback (5%): R$ {transaction.cashback_amount.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600 mt-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {formatDateTime(transaction.created_at)}
          </div>
          {transaction.receipt_url && (
            <button
              onClick={() => setSelectedImage(transaction.receipt_url)}
              className="mt-2 text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1.5"
            >
              <Image className="w-4 h-4" />
              Ver comprovante
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleTransactionStatus(transaction.id, 'approved')}
            disabled={loading}
            className="btn-primary py-2 px-4"
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleTransactionStatus(transaction.id, 'rejected')}
            disabled={loading}
            className="btn-secondary py-2 px-4 !bg-red-50 !text-red-600 !border-red-100 hover:!bg-red-100 hover:!border-red-200"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="bg-white rounded-3xl overflow-hidden max-w-3xl w-full max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-medium text-gray-900">
                Comprovante da Compra
              </h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="relative aspect-[3/4] bg-gray-50">
              <img
                src={selectedImage}
                alt="Comprovante"
                className="absolute inset-0 w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Pending Transactions Section */}
      {pendingTransactions.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="card-header">
            <Clock className="w-5 h-5 text-yellow-600" />
            Transações Pendentes
          </h2>
          <div className="space-y-4">
            {pendingTransactions.map(transaction => renderTransaction(transaction))}
          </div>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="card-header !mb-0">
                <Phone className="w-5 h-5 text-primary-600" />
                Clientes
              </h2>
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport || customers.length === 0}
                className="btn-secondary py-2 px-4 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {generatingReport ? 'Gerando...' : 'Gerar Relatório'}
              </button>
            </div>
            <div className="space-y-2">
              {customers.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => setActiveCustomer(customer)}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 flex items-center justify-between ${
                    activeCustomer?.id === customer.id
                      ? 'bg-primary-50 border-primary-200 border'
                      : 'hover:bg-white border border-transparent hover:border-gray-200'
                  }`}
                >
                  <div>
                    {customer.name && (
                      <div className="text-gray-900 font-medium flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-primary-600" />
                        {customer.name}
                      </div>
                    )}
                    <div className="font-medium flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary-600" />
                      {customer.phone}
                    </div>
                    <div className="text-sm text-gray-600">
                      Saldo: R$ {customer.balance.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Cadastro: {formatDateTime(customer.created_at)}
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 transition-transform ${
                    activeCustomer?.id === customer.id ? 'rotate-90' : ''
                  }`} />
                </button>
              ))}

              {customers.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Phone className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Nenhum cliente cadastrado</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {activeCustomer ? (
            <>
              <div className="glass-card p-6">
                <h2 className="card-header">
                  <Wallet className="w-5 h-5 text-primary-600" />
                  Saldo do Cliente
                </h2>
                <div className="text-4xl font-bold text-primary-600 mb-6">
                  R$ {activeCustomer.balance.toFixed(2)}
                </div>
                
                <form onSubmit={addTransaction} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor da Compra
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={transactionAmount}
                      onChange={e => setTransactionAmount(e.target.value)}
                      className="input-field"
                      required
                    />
                    {transactionAmount && (
                      <p className="mt-2 text-sm text-green-600">
                        Cashback (5%): R$ {(parseFloat(transactionAmount || '0') * CASHBACK_RATE).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="btn-primary flex-1"
                      disabled={loading}
                    >
                      {loading ? 'Processando...' : 'Registrar Compra'}
                    </button>
                    <button
                      onClick={redeemCashback}
                      disabled={!activeCustomer.balance || loading}
                      className="btn-secondary flex-1"
                    >
                      {loading ? 'Processando...' : 'Resgatar Cashback'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="glass-card p-6">
                <h2 className="card-header">
                  <History className="w-5 h-5 text-primary-600" />
                  Histórico de Transações
                </h2>
                <div className="space-y-4">
                  {activeCustomer.transactions?.map(transaction => (
                    <div
                      key={transaction.id}
                      className="transaction-item"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {transaction.type === 'purchase' ? (
                              <CreditCard className="w-4 h-4 text-primary-600" />
                            ) : (
                              <Wallet className="w-4 h-4 text-secondary-600" />
                            )}
                            {transaction.type === 'purchase' ? 'Compra' : 'Resgate'}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1.5 mt-1">
                            <Clock className="w-4 h-4" />
                            {formatDateTime(transaction.created_at)}
                          </div>
                          {transaction.updated_at !== transaction.created_at && (
                            <div className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              Atualizado em: {formatDateTime(transaction.updated_at)}
                            </div>
                          )}
                          <div className="mt-2">
                            {renderTransactionStatus(transaction.status)}
                          </div>
                          {transaction.receipt_url && (
                            <button
                              onClick={() => setSelectedImage(transaction.receipt_url)}
                              className="mt-2 text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1.5"
                            >
                              <Image className="w-4 h-4" />
                              Ver comprovante
                            </button>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            R$ {transaction.amount.toFixed(2)}
                          </div>
                          <div className={`text-sm ${
                            transaction.type === 'purchase'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {transaction.type === 'purchase' ? '+' : ''}
                            R$ {Math.abs(transaction.cashback_amount).toFixed(2)} cashback
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-6 flex flex-col items-center justify-center h-64">
              <ArrowLeftRight className="w-12 h-12 text-primary-300 mb-4" />
              <p className="text-gray-600 text-center">
                Selecione um cliente para gerenciar transações e ver histórico
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderTransactionStatus(status: Transaction['status']) {
  switch (status) {
    case 'pending':
      return (
        <span className="status-badge pending">
          <Clock className="w-4 h-4" />
          Pendente
        </span>
      );
    case 'approved':
      return (
        <span className="status-badge approved">
          <CheckCircle2 className="w-4 h-4" />
          Aprovado
        </span>
      );
    case 'rejected':
      return (
        <span className="status-badge rejected">
          <XCircle className="w-4 h-4" />
          Rejeitado
        </span>
      );
  }
}