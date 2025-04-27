import { useState, useEffect } from 'react';
import { Phone, Wallet, History, ArrowLeftRight, CreditCard, ChevronRight, Clock, CheckCircle2, XCircle, Image, FileText, User, Gift, ChevronLeft } from 'lucide-react';
import type { Customer, Transaction } from '../../types';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { sendWhatsAppNotification } from '../../lib/notifications';
import { generateCustomerReport } from '../../utils/reportGenerator';

interface CustomerWithLastRedemption extends Customer {
  last_redemption?: {
    amount: number;
    created_at: string;
  };
  total_transactions?: number;
}

export default function AdminDashboard() {
  const [customers, setCustomers] = useState<CustomerWithLastRedemption[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<CustomerWithLastRedemption | null>(null);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [totalRedemptions, setTotalRedemptions] = useState(0);
  const [todayRedemptions, setTodayRedemptions] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  
  const ITEMS_PER_PAGE = 10;
  const CASHBACK_RATE = 0.05;

  useEffect(() => {
    loadCustomers();
    loadPendingTransactions();
    loadRedemptionStats();
  }, [currentPage]);

  const loadCustomers = async () => {
    try {
      const { count } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      setTotalCustomers(count || 0);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));

      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select(`
          *,
          transactions:transactions(count)
        `)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (customersError) throw customersError;

      const customersWithData = await Promise.all(
        (customersData || []).map(async (customer: any) => {
          const { data: redemptions } = await supabase
            .from('transactions')
            .select('amount, created_at')
            .eq('customer_id', customer.id)
            .eq('type', 'redemption')
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...customer,
            total_transactions: customer.transactions?.[0]?.count || 0,
            last_redemption: redemptions?.[0] || null
          };
        })
      );

      customersWithData.sort((a, b) => 
        (b.total_transactions || 0) - (a.total_transactions || 0)
      );

      setCustomers(customersWithData);
    } catch (error: any) {
      console.error('Error loading customers:', error);
      toast.error('Erro ao carregar clientes');
    }
  };

  const loadRedemptionStats = async () => {
    try {
      const { data: total, error: totalError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'redemption')
        .eq('status', 'approved');

      if (totalError) throw totalError;

      const totalAmount = total?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      setTotalRedemptions(totalAmount);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayData, error: todayError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'redemption')
        .eq('status', 'approved')
        .gte('created_at', today.toISOString());

      if (todayError) throw todayError;

      const todayAmount = todayData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      setTodayRedemptions(todayAmount);
    } catch (error) {
      console.error('Error loading redemption stats:', error);
      toast.error('Erro ao carregar estatísticas de resgates');
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

      const transaction = pendingTransactions.find(t => t.id === transactionId);
      if (transaction && status === 'approved') {
        await sendWhatsAppNotification({
          type: 'purchase',
          customerId: transaction.customer_id,
          amount: transaction.amount || 0,
          cashbackAmount: transaction.cashback_amount || 0
        });
      }

      await Promise.all([
        loadPendingTransactions(),
        loadCustomers(),
        loadRedemptionStats()
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

      await Promise.all([
        loadCustomers(),
        loadPendingTransactions(),
        loadRedemptionStats()
      ]);

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

      await Promise.all([
        loadCustomers(),
        loadPendingTransactions(),
        loadRedemptionStats()
      ]);

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

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Data não disponível';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Data inválida';
    }
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
            Valor da Compra: R$ {(transaction.amount || 0).toFixed(2)}
          </div>
          <div className="text-sm text-green-600">
            Cashback (5%): R$ {(transaction.cashback_amount || 0).toFixed(2)}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <h2 className="card-header">
            <Gift className="w-5 h-5 text-purple-600" />
            Resgates Hoje
          </h2>
          <div className="text-3xl font-bold text-purple-600">
            R$ {todayRedemptions.toFixed(2)}
          </div>
        </div>
        <div className="glass-card p-6">
          <h2 className="card-header">
            <Wallet className="w-5 h-5 text-purple-600" />
            Total de Resgates
          </h2>
          <div className="text-3xl font-bold text-purple-600">
            R$ {totalRedemptions.toFixed(2)}
          </div>
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="card-header !mb-0">
                <Phone className="w-5 h-5 text-primary-600" />
                Clientes ({totalCustomers})
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
                      Saldo: R$ {(customer.balance || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-purple-600">
                      Total de transações: {customer.total_transactions || 0}
                    </div>
                    {customer.last_redemption && (
                      <div className="text-sm text-purple-600 mt-1 flex items-center gap-1">
                        <Gift className="w-3 h-3" />
                        Último resgate: R$ {(customer.last_redemption.amount ||0).toFixed(2)}
                        <span className="text-gray-500 text-xs">
                          ({formatDateTime(customer.last_redemption.created_at)})
                        </span>
                      </div>
                    )}
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary py-2 px-4 flex items-center gap-2 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary py-2 px-4 flex items-center gap-2 disabled:opacity-50"
                >
                  Próxima
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
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
                  R$ {(activeCustomer.balance || 0).toFixed(2)}
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
                              <Gift className="w-4 h-4 text-secondary-600" />
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
                            R$ {(transaction.amount || 0).toFixed(2)}
                          </div>
                          <div className={`text-sm ${
                            transaction.type === 'purchase'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {transaction.type === 'purchase' ? '+' : ''}
                            R$ {Math.abs(transaction.cashback_amount || 0).toFixed(2)} cashback
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