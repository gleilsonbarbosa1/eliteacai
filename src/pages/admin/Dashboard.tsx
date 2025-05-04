import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ShoppingBag, Gift, CheckCircle2, XCircle, Lock, FileText } from 'lucide-react';
import DateRangeFilter from '../../components/DateRangeFilter';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { generateCustomerReport } from '../../utils/reportGenerator';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('purchases');
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentTransactions, setCurrentTransactions] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [advancedReportPassword, setAdvancedReportPassword] = useState('');
  const [showAdvancedReport, setShowAdvancedReport] = useState(false);

  const CORRECT_PASSWORD = 'Gle0103,,#*';

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (advancedReportPassword === CORRECT_PASSWORD) {
      setShowAdvancedReport(true);
      toast.success('Acesso autorizado ao relatório avançado');
    } else {
      toast.error('Senha incorreta');
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);

      let startDate = new Date();
      let endDate = new Date();

      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'yesterday':
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'last7days':
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'last30days':
          startDate.setDate(startDate.getDate() - 30);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'thisMonth':
          startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          endDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        case 'lastMonth':
          startDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
          endDate = new Date(endDate.getFullYear(), endDate.getMonth(), 0, 23, 59, 59, 999);
          break;
        case 'custom':
          startDate = new Date(customStartDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
          break;
      }

      // Load transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          customers (
            id,
            name,
            phone,
            balance
          ),
          stores (
            id,
            name,
            code
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Load all customers for the period
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*');

      if (customersError) throw customersError;

      setReportData({
        customers,
        transactions: transactions.filter(t => 
          activeTab === 'purchases' ? t.type === 'purchase' : t.type === 'redemption'
        )
      });

      setCurrentTransactions(transactions);
      setTotalPages(Math.ceil(transactions.length / 10));

    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Erro ao carregar transações: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (transactionId, newStatus) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', transactionId);

      if (error) throw error;

      toast.success('Status atualizado com sucesso!');
      loadTransactions();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status: ' + error.message);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleGeneratePDF = async () => {
    try {
      if (!reportData?.customers) {
        toast.error('Nenhum dado disponível para gerar relatório');
        return;
      }

      await generateCustomerReport(
        reportData.customers,
        { startDate: customStartDate, endDate: customEndDate },
        'profile'
      );

      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Erro ao gerar relatório: ' + error.message);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [dateRange, activeTab]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <DateRangeFilter
            dateRange={dateRange}
            setDateRange={setDateRange}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
            onDateChange={loadTransactions}
          />
        </div>
        <button
          onClick={() => setShowAdvancedReport(!showAdvancedReport)}
          className="btn-secondary py-2 px-4 flex items-center gap-2"
        >
          {showAdvancedReport ? (
            <>
              <ShoppingBag className="w-4 h-4" />
              Voltar para Transações
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Relatório Avançado
            </>
          )}
        </button>
      </div>

      {!showAdvancedReport ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex border-b">
            <button
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === 'purchases' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('purchases')}
            >
              <div className="flex items-center justify-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Compras
              </div>
            </button>
            <button
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === 'redemptions' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('redemptions')}
            >
              <div className="flex items-center justify-center gap-2">
                <Gift className="w-4 h-4" />
                Resgates
              </div>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b bg-gray-50">
                  <th className="p-4 text-sm font-medium text-gray-500">Data</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Cliente</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Loja</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Valor</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : currentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      Nenhuma transação encontrada
                    </td>
                  </tr>
                ) : (
                  currentTransactions
                    .filter(t => activeTab === 'purchases' ? t.type === 'purchase' : t.type === 'redemption')
                    .map((transaction) => (
                      <tr key={transaction.id} className="border-b">
                        <td className="p-4">
                          {formatDateTime(transaction.created_at)}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-900">
                            {transaction.customers?.name || 'Não informado'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.customers?.phone || 'N/A'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-gray-600">
                            {transaction.stores?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.stores?.code || 'N/A'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-900">
                            {formatCurrency(transaction.amount)}
                          </div>
                          {transaction.type === 'purchase' && (
                            <div className="text-sm text-purple-600">
                              + {formatCurrency(transaction.cashback_amount)} cashback
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeClass(transaction.status)}`}>
                            {transaction.status === 'approved' ? 'Aprovado' :
                             transaction.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="p-4">
                          {transaction.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleStatusChange(transaction.id, 'approved')}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleStatusChange(transaction.id, 'rejected')}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-600" />
              Relatório Avançado
            </h2>
          </div>
          <form onSubmit={handlePasswordSubmit} className="max-w-md">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Digite a senha para acessar
              </label>
              <input
                type="password"
                value={advancedReportPassword}
                onChange={(e) => setAdvancedReportPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="btn-primary py-2 px-4 text-sm"
            >
              Acessar Relatório
            </button>
          </form>
        </div>
      )}
    </div>
  );
}