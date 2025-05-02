import { useState, useEffect } from 'react';
import { Phone, Wallet, History, ArrowLeftRight, CreditCard, ChevronRight, Clock, CheckCircle2, XCircle, Image, FileText, User, Gift, ChevronLeft, Crown, Trophy, Calendar, BarChart3, TrendingUp, DollarSign, AlertTriangle, Circle, Users, Lock, Star, ShoppingBag, Coins, Activity, Clock3, TrendingDown, LineChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
  total_cashback?: number;
  lifecycle_status?: 'new' | 'engaged' | 'inactive';
}

interface ReportData {
  totalSales: number;
  totalCashbackGenerated: number;
  totalCashbackRedeemed: number;
  totalExpired: number;
  cashbackPercentage: number;
  averagePurchaseAmount: number;
  mostCommonHour: number;
  averageCashbackPerPurchase: number;
  weeklyFrequency: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
  activeUsersThisWeek: number;
  activeUsersLastWeek: number;
  activeUsersThisMonth: number;
  activeUsersLastMonth: number;
}

interface LifecycleStats {
  new: number;
  engaged: number;
  inactive: number;
}

interface CustomerJourney {
  firstUseDate: string;
  totalPurchases: number;
  totalCashbackEarned: number;
  totalCashbackUsed: number;
}

type DateRange = 'day' | 'week' | 'month' | 'custom';

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
  const [topCustomer, setTopCustomer] = useState<CustomerWithLastRedemption | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [reportData, setReportData] = useState<ReportData>({
    totalSales: 0,
    totalCashbackGenerated: 0,
    totalCashbackRedeemed: 0,
    totalExpired: 0,
    cashbackPercentage: 0,
    averagePurchaseAmount: 0,
    mostCommonHour: 0,
    averageCashbackPerPurchase: 0,
    weeklyFrequency: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0,
    activeUsersThisWeek: 0,
    activeUsersLastWeek: 0,
    activeUsersThisMonth: 0,
    activeUsersLastMonth: 0
  });
  const [lifecycleStats, setLifecycleStats] = useState<LifecycleStats>({
    new: 0,
    engaged: 0,
    inactive: 0,
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportPassword, setReportPassword] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [customerJourney, setCustomerJourney] = useState<CustomerJourney | null>(null);
  
  const ITEMS_PER_PAGE = 10;
  const CASHBACK_RATE = 0.05;

  useEffect(() => {
    loadCustomers();
    loadPendingTransactions();
    loadRedemptionStats();
    loadTopCustomer();
    loadReportData();
  }, [currentPage, dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (activeCustomer) {
      loadCustomerJourney(activeCustomer.id);
    }
  }, [activeCustomer]);

  const loadCustomerJourney = async (customerId: string) => {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!transactions?.length) return null;

      const firstTransaction = transactions[0];
      const purchases = transactions.filter(t => t.type === 'purchase' && t.status === 'approved');
      const totalCashbackEarned = purchases.reduce((sum, t) => sum + (t.cashback_amount || 0), 0);
      const redemptions = transactions.filter(t => t.type === 'redemption' && t.status === 'approved');
      const totalCashbackUsed = redemptions.reduce((sum, t) => sum + (t.amount || 0), 0);

      setCustomerJourney({
        firstUseDate: firstTransaction.created_at,
        totalPurchases: purchases.length,
        totalCashbackEarned,
        totalCashbackUsed
      });
    } catch (error) {
      console.error('Error loading customer journey:', error);
      toast.error('Erro ao carregar jornada do cliente');
    }
  };

  const getCustomerLifecycleStatus = (customer: Customer, transactions: Transaction[]): 'new' | 'engaged' | 'inactive' => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const createdAt = new Date(customer.created_at);
    const lastLogin = customer.last_login ? new Date(customer.last_login) : null;

    if (createdAt >= sevenDaysAgo) {
      return 'new';
    }

    if (lastLogin && lastLogin <= thirtyDaysAgo) {
      return 'inactive';
    }

    const purchaseCount = transactions.filter(t => 
      t.type === 'purchase' && t.status === 'approved'
    ).length;

    if (purchaseCount >= 3) {
      return 'engaged';
    }

    return 'inactive';
  };

  const loadReportData = async () => {
    try {
      let startDate: Date;
      let endDate = new Date();

      switch (dateRange) {
        case 'day':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'custom':
          if (!customStartDate || !customEndDate) return;
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        default:
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
      }

      // Get transactions for the selected period
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const approvedPurchases = transactions?.filter(t => 
        t.type === 'purchase' && t.status === 'approved'
      ) || [];

      // Calculate basic metrics
      const totalSales = approvedPurchases.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalCashbackGenerated = approvedPurchases.reduce((sum, t) => sum + (t.cashback_amount || 0), 0);
      const totalCashbackRedeemed = transactions?.filter(t =>
        t.type === 'redemption' && t.status === 'approved'
      ).reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      const totalExpired = transactions?.filter(t =>
        t.type === 'purchase' && 
        t.status === 'approved' && 
        t.expires_at && 
        new Date(t.expires_at) <= new Date()
      ).reduce((sum, t) => sum + (t.cashback_amount || 0), 0) || 0;
      const cashbackPercentage = totalSales > 0 ? (totalCashbackGenerated / totalSales) * 100 : 0;

      // Calculate average purchase amount
      const averagePurchaseAmount = approvedPurchases.length > 0 
        ? totalSales / approvedPurchases.length 
        : 0;

      // Calculate most common purchase hour
      const purchaseHours = approvedPurchases.map(t => new Date(t.created_at).getHours());
      const hourCounts = purchaseHours.reduce((acc, hour) => {
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      const mostCommonHour = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 0;

      // Calculate average cashback per purchase
      const averageCashbackPerPurchase = approvedPurchases.length > 0
        ? totalCashbackGenerated / approvedPurchases.length
        : 0;

      // Calculate weekly frequency
      const daysBetween = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const weeklyFrequency = (approvedPurchases.length / daysBetween) * 7;

      // Calculate growth metrics
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Get active users for different periods
      const { data: thisWeekUsers } = await supabase
        .from('transactions')
        .select('customer_id')
        .gte('created_at', oneWeekAgo.toISOString())
        .eq('type', 'purchase')
        .eq('status', 'approved');

      const { data: lastWeekUsers } = await supabase
        .from('transactions')
        .select('customer_id')
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', oneWeekAgo.toISOString())
        .eq('type', 'purchase')
        .eq('status', 'approved');

      const { data: thisMonthUsers } = await supabase
        .from('transactions')
        .select('customer_id')
        .gte('created_at', oneMonthAgo.toISOString())
        .eq('type', 'purchase')
        .eq('status', 'approved');

      const { data: lastMonthUsers } = await supabase
        .from('transactions')
        .select('customer_id')
        .gte('created_at', twoMonthsAgo.toISOString())
        .lt('created_at', oneMonthAgo.toISOString())
        .eq('type', 'purchase')
        .eq('status', 'approved');

      // Count unique users
      const activeUsersThisWeek = new Set(thisWeekUsers?.map(t => t.customer_id)).size;
      const activeUsersLastWeek = new Set(lastWeekUsers?.map(t => t.customer_id)).size;
      const activeUsersThisMonth = new Set(thisMonthUsers?.map(t => t.customer_id)).size;
      const activeUsersLastMonth = new Set(lastMonthUsers?.map(t => t.customer_id)).size;

      // Calculate growth percentages
      const weeklyGrowth = activeUsersLastWeek > 0 
        ? ((activeUsersThisWeek - activeUsersLastWeek) / activeUsersLastWeek) * 100 
        : 0;
      const monthlyGrowth = activeUsersLastMonth > 0 
        ? ((activeUsersThisMonth - activeUsersLastMonth) / activeUsersLastMonth) * 100 
        : 0;

      setReportData({
        totalSales,
        totalCashbackGenerated,
        totalCashbackRedeemed,
        totalExpired,
        cashbackPercentage,
        averagePurchaseAmount,
        mostCommonHour: parseInt(mostCommonHour),
        averageCashbackPerPurchase,
        weeklyFrequency,
        weeklyGrowth,
        monthlyGrowth,
        activeUsersThisWeek,
        activeUsersLastWeek,
        activeUsersThisMonth,
        activeUsersLastMonth
      });

    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Erro ao carregar relatório');
    }
  };

  const loadTopCustomer = async () => {
    try {
      const { data: topCustomerData, error } = await supabase
        .from('customers')
        .select(`
          *,
          transactions:transactions(
            amount,
            cashback_amount,
            type,
            status,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!topCustomerData?.length) return;

      const customersWithTotalCashback = topCustomerData.map(customer => {
        const totalCashback = customer.transactions
          ?.filter((t: any) => t.type === 'purchase' && t.status === 'approved')
          .reduce((sum: number, t: any) => sum + (t.cashback_amount || 0), 0) || 0;

        return {
          ...customer,
          total_cashback: totalCashback
        };
      });

      const sortedCustomers = customersWithTotalCashback.sort((a, b) => 
        (b.total_cashback || 0) - (a.total_cashback || 0)
      );

      setTopCustomer(sortedCustomers[0]);
    } catch (error) {
      console.error('Error loading top customer:', error);
    }
  };

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
          transactions:transactions(
            amount,
            cashback_amount,
            type,
            status,
            created_at
          )
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

          const lifecycle_status = getCustomerLifecycleStatus(customer, customer.transactions || []);

          return {
            ...customer,
            total_transactions: customer.transactions?.length || 0,
            last_redemption: redemptions?.[0] || null,
            lifecycle_status
          };
        })
      );

      const stats = {
        new: 0,
        engaged: 0,
        inactive: 0
      };

      customersWithData.forEach(customer => {
        if (customer.lifecycle_status) {
          stats[customer.lifecycle_status]++;
        }
      });

      setLifecycleStats(stats);

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

  const handleReportAccess = () => {
    if (reportPassword === 'Gle0103,,#*') {
      setShowReport(true);
      setShowReportModal(false);
      setReportPassword('');
    } else {
      toast.error('Senha incorreta');
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

  const renderLifecycleStatus = (status: 'new' | 'engaged' | 'inactive') => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full text-sm">
            <Circle className="w-2 h-2 fill-green-500" />
            Novo
          </span>
        );
      case 'engaged':
        return (
          <span className="inline-flex items-center gap-1.5 text-yellow-700 bg-yellow-50 px-2.5 py-0.5 rounded-full text-sm">
            <Circle className="w-2 h-2 fill-yellow-500" />
            Engajado
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1.5 text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full text-sm">
            <Circle className="w-2 h-2 fill-red-500" />
            Inativo
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold">Acesso ao Relatório</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Digite a senha
                </label>
                <input
                  type="password"
                  value={reportPassword}
                  onChange={(e) => setReportPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleReportAccess();
                    
                    }
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReportAccess}
                  className="btn-primary flex-1"
                >
                  Acessar
                </button>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportPassword('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReport ? (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="card-header !mb-0">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Relatório Avançado
            </h2>
            <div className="flex gap-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="input-field !py-2 !text-base"
              >
                <option value="day">Hoje</option>
                <option value="week">Últimos 7 dias</option>
                <option value="month">Último mês</option>
                <option value="custom">Personalizado</option>
              </select>
              
              {dateRange === 'custom' && (
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="input-field !py-2 !text-base"
                  />
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="input-field !py-2 !text-base"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="card-header !mb-0">
                <Users className="w-5 h-5 text-purple-600" />
                Perfil de Compra dos Clientes
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <div className="flex items-center gap-2 text-purple-700 mb-2">
                  <DollarSign className="w-5 h-5" />
                  <span className="font-medium">Valor Médio de Compra</span>
                </div>
                <div className="text-2xl font-bold text-purple-700">
                  R$ {reportData.averagePurchaseAmount.toFixed(2)}
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <Coins className="w-5 h-5" />
                  <span className="font-medium">Cashback Médio por Compra</span>
                </div>
                <div className="text-2xl font-bold text-green-700">
                  R$ {reportData.averageCashbackPerPurchase.toFixed(2)}
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Clock3 className="w-5 h-5" />
                  <span className="font-medium">Horário Mais Comum</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {reportData.mostCommonHour}:00h
                </div>
              </div>

              <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                <div className="flex items-center gap-2 text-orange-700 mb-2">
                  <TrendingDown className="w-5 h-5" />
                  <span className="font-medium">Frequência Semanal</span>
                </div>
                <div className="text-2xl font-bold text-orange-700">
                  {reportData.weeklyFrequency.toFixed(1)} compras/semana
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="card-header !mb-0">
                <LineChart className="w-5 h-5 text-purple-600" />
                Crescimento do Sistema
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-blue-700">
                    <TrendingUp className="w-5 h-5" />
                    <span className="font-medium">Crescimento Semanal</span>
                  </div>
                  <div className={`flex items-center gap-1 ${reportData.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {reportData.weeklyGrowth >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    <span className="font-bold">{Math.abs(reportData.weeklyGrowth).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-blue-600">
                  Usuários ativos esta semana: {reportData.activeUsersThisWeek}
                  <br />
                  Usuários ativos semana passada: {reportData.activeUsersLastWeek}
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-purple-700">
                    <TrendingUp className="w-5 h-5" />
                    <span className="font-medium">Crescimento Mensal</span>
                  </div>
                  <div className={`flex items-center gap-1 ${reportData.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {reportData.monthlyGrowth >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    <span className="font-bold">{Math.abs(reportData.monthlyGrowth).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-purple-600">
                  Usuários ativos este mês: {reportData.activeUsersThisMonth}
                  <br />
                  Usuários ativos mês passado: {reportData.activeUsersLastMonth}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="card-header !mb-0">
                <Users className="w-5 h-5 text-purple-600" />
                Ciclo de Vida dos Clientes
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-green-700">
                    <Circle className="w-3 h-3 fill-green-500" />
                    <span className="font-medium">Novos</span>
                  </div>
                  <span className="text-2xl font-bold text-green-700">{lifecycleStats.new}</span>
                </div>
                <p className="text-sm text-green-600">Cadastro há 7 dias ou menos</p>
              </div>

              <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <Circle className="w-3 h-3 fill-yellow-500" />
                    <span className="font-medium">Engajados</span>
                  </div>
                  <span className="text-2xl font-bold text-yellow-700">{lifecycleStats.engaged}</span>
                </div>
                <p className="text-sm text-yellow-600">3 ou mais compras registradas</p>
              </div>

              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-red-700">
                    <Circle className="w-3 h-3 fill-red-500" />
                    <span className="font-medium">Inativos</span>
                  </div>
                  <span className="text-2xl font-bold text-red-700">{lifecycleStats.inactive}</span>
                </div>
                <p className="text-sm text-red-600">Sem acesso há 30 dias ou mais</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="p-4 bg-white rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Total de Vendas</span>
              </div>
              <div className="text-2xl font-bold">
                R$ {reportData.totalSales.toFixed(2)}
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Gift className="w-4 h-4" />
                <span className="text-sm">Cashback Gerado</span>
              </div>
              <div className="text-2xl font-bold">
                R$ {reportData.totalCashbackGenerated.toFixed(2)}
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Coins className="w-4 h-4" />
                <span className="text-sm">Cashback Resgatado</span>
              </div>
              <div className="text-2xl font-bold">
                R$ {reportData.totalCashbackRedeemed.toFixed(2)}
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">Cashback Expirado</span>
              </div>
              <div className="text-2xl font-bold">
                R$ {reportData.totalExpired.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="card-header !mb-0">
            <Clock className="w-5 h-5 text-purple-600" />
            Transações Pendentes
          </h2>
          <button
            onClick={() => setShowReportModal(true)}
            className="btn-primary py-2 px-4 flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Relatório Avançado
          </button>
        </div>

        <div className="space-y-4">
          {pendingTransactions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Nenhuma transação pendente
            </div>
          ) : (
            pendingTransactions.map(transaction => renderTransaction(transaction))
          )}
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="card-header !mb-0">
            <Users className="w-5 h-5 text-purple-600" />
            Clientes
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="btn-secondary py-2 px-4 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {generatingReport ? 'Gerando...' : 'Gerar Relatório'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {customers.map(customer => (
            <div key={customer.id} className="transaction-item">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-primary-600" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.name && (
                    <div className="text-gray-600 flex items-center gap-2 mb-2">
                      <User className="w-4 h-4" />
                      <span>{customer.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">
                      {customer.total_transactions || 0} transações
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderLifecycleStatus(customer.lifecycle_status || 'inactive')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    Saldo: R$ {customer.balance.toFixed(2)}
                  </div>
                  {customer.last_redemption && (
                    <div className="text-sm text-gray-600">
                      Último resgate: R$ {customer.last_redemption.amount.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="btn-secondary py-2 px-4"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="py-2 px-4 text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="btn-secondary py-2 px-4"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}