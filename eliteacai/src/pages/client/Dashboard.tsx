import { useState, useEffect } from 'react';
import { Phone, Wallet, History, CreditCard, Gift, CheckCircle2, Clock, XCircle, ArrowRight, Sparkles, ShoppingBag, Receipt, ChevronDown, ChevronUp, User, Lock, LogOut, MapPin, Calendar, Mail, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Customer, Transaction } from '../../types';
import { supabase } from '../../lib/supabase';
import { sendWhatsAppNotification } from '../../lib/notifications';
import toast from 'react-hot-toast';
import { getCurrentPosition, isWithinStoreRange, getClosestStore, formatDistance } from '../../utils/geolocation';

const CASHBACK_RATE = 0.05; // 5% cashback

function ClientDashboard() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [showRedemptionForm, setShowRedemptionForm] = useState(false);
  const [redemptionAmount, setRedemptionAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'purchases' | 'redemptions'>('purchases');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextExpiringAmount, setNextExpiringAmount] = useState<{ amount: number; date: Date } | null>(null);

  useEffect(() => {
    if (customer) {
      loadTransactions();
      calculateAvailableBalance();
    }
  }, [customer?.id]);

  const calculateAvailableBalance = async () => {
    if (!customer?.id) return;

    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('cashback_amount, expires_at')
        .eq('customer_id', customer.id)
        .eq('type', 'purchase')
        .eq('status', 'approved')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });

      if (error) throw error;

      // Calculate total available balance
      const total = transactions?.reduce((sum, t) => sum + (t.cashback_amount || 0), 0) || 0;
      setAvailableBalance(total);

      // Find next expiring amount
      if (transactions && transactions.length > 0) {
        const nextExpiring = transactions[0];
        setNextExpiringAmount({
          amount: nextExpiring.cashback_amount,
          date: new Date(nextExpiring.expires_at)
        });
      } else {
        setNextExpiringAmount(null);
      }
    } catch (error) {
      console.error('Error calculating balance:', error);
      toast.error('Erro ao calcular saldo disponível');
    }
  };

  const formatExpirationDate = (date: Date) => {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Expira amanhã';
    } else if (diffDays > 1) {
      return `Expira em ${diffDays} dias`;
    } else {
      return 'Expira hoje';
    }
  };

  const loadTransactions = async () => {
    if (!customer) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
      await calculateAvailableBalance();
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      toast.error('Erro ao carregar transações');
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length > 11) {
      value = value.slice(0, 11);
    }
    
    let formattedValue = '';
    if (value.length > 0) {
      formattedValue = `(${value.slice(0, 2)}`;
      if (value.length > 2) {
        formattedValue += `) ${value.slice(2, 7)}`;
        if (value.length > 7) {
          formattedValue += `-${value.slice(7, 11)}`;
        }
      }
    }
    
    setPhoneNumber(formattedValue);
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      if (cleanPhone.length !== 11) {
        toast.error('Por favor, insira um número de telefone válido com DDD');
        return;
      }

      if (isLogin) {
        // Verify the password using RPC function
        const { data: customerId, error: verifyError } = await supabase
          .rpc('verify_customer_password', {
            p_phone: cleanPhone,
            p_password: password
          });

        if (verifyError) {
          console.error('Error verifying password:', verifyError);
          toast.error('Erro ao verificar senha');
          return;
        }

        if (!customerId) {
          toast.error('Telefone ou senha incorretos');
          return;
        }

        // Fetch customer data
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();

        if (customerError || !customerData) {
          throw new Error('Erro ao carregar dados do cliente');
        }

        setCustomer(customerData);
        toast.success('Login realizado com sucesso!');
      } else {
        // Registration flow
        // Check if phone number exists
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', cleanPhone)
          .single();

        if (existingCustomer) {
          toast.error('Este número já está cadastrado', {
            icon: '📱',
            duration: 5000,
          });
          return;
        }

        if (!email.match(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)) {
          toast.error('Por favor, insira um email válido');
          return;
        }

        const { data: existingEmail } = await supabase
          .from('customers')
          .select('id')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (existingEmail) {
          toast.error('Este email já está cadastrado');
          return;
        }

        if (!dateOfBirth) {
          toast.error('Por favor, insira sua data de nascimento');
          return;
        }

        if (!name.trim()) {
          throw new Error('Por favor, insira seu nome');
        }

        if (!password || password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres');
        }

        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem');
        }

        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            name: name.trim(),
            phone: cleanPhone,
            email: email.toLowerCase(),
            date_of_birth: dateOfBirth,
            password_hash: password,
            balance: 0
          })
          .select()
          .single();

        if (createError) throw createError;

        // Send welcome notification
        await sendWhatsAppNotification({
          type: 'welcome',
          customerId: newCustomer.id
        });

        setCustomer(newCustomer);
        toast.success('Cadastro realizado com sucesso!');
      }

      // Clear form
      setPhoneNumber('');
      setName('');
      setEmail('');
      setDateOfBirth('');
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Por favor, insira um valor válido');
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      // Check Supabase connection first
      const { error: healthCheckError } = await supabase.from('transactions').select('id').limit(1);
      if (healthCheckError) {
        console.error('Supabase connection error:', healthCheckError);
        throw new Error('Erro de conexão com o servidor. Por favor, verifique sua conexão com a internet.');
      }

      let position;
      try {
        position = await getCurrentPosition();
      } catch (geoError: any) {
        throw new Error(geoError.message || 'Erro ao obter localização');
      }

      const { latitude, longitude } = position.coords;

      // Check if within range of any store
      if (!isWithinStoreRange(latitude, longitude)) {
        const closestStore = getClosestStore(latitude, longitude);
        if (closestStore) {
          const distanceText = formatDistance(closestStore.distance || 0);
          toast.error(
            <div className="flex flex-col gap-2">
              <p>Você precisa estar em uma loja Elite Açaí para registrar compras.</p>
              <p className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4" />
                Loja mais próxima: {closestStore.name} ({distanceText})
              </p>
            </div>
          );
        } else {
          toast.error('Você precisa estar em uma loja Elite Açaí para registrar compras.');
        }
        return;
      }

      const cashbackAmount = Number((amount * CASHBACK_RATE).toFixed(2));

      // Add a small delay to prevent duplicate submissions
      await new Promise(resolve => setTimeout(resolve, 500));

      // Calculate expiration date (end of next month)
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 2, 0); // Last day of next month
      expirationDate.setHours(23, 59, 59, 999);

      const { error } = await supabase
        .from('transactions')
        .insert({
          customer_id: customer.id,
          amount,
          cashback_amount: cashbackAmount,
          type: 'purchase',
          status: 'pending',
          location: {
            latitude,
            longitude
          },
          expires_at: expirationDate.toISOString()
        });

      if (error) {
        console.error('Transaction insert error:', error);
        if (error.code === 'PGRST301') {
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        } else if (error.code === '23503') {
          throw new Error('Erro de validação. Por favor, tente novamente.');
        } else if (error.code === '23505') {
          throw new Error('Transação duplicada. Por favor, aguarde alguns minutos antes de tentar novamente.');
        } else {
          throw new Error('Erro ao registrar transação. Por favor, tente novamente.');
        }
      }

      setTransactionAmount('');
      await Promise.all([
        loadTransactions(),
        calculateAvailableBalance()
      ]);

      toast.success(
        <div className="flex flex-col gap-2">
          <p>Compra registrada com sucesso! Aguarde a aprovação.</p>
          <p className="text-sm text-green-600">Você está em uma loja Elite Açaí autorizada.</p>
        </div>
      );
    } catch (error: any) {
      console.error('Transaction error:', error);
      toast.error(error.message || 'Erro ao registrar compra. Por favor, tente novamente.');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const redeemCashback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    const amount = parseFloat(redemptionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Por favor, insira um valor válido para resgate');
      return;
    }

    if (amount > availableBalance) {
      toast.error(`Valor máximo para resgate é R$ ${availableBalance.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          customer_id: customer.id,
          amount: amount,
          cashback_amount: -amount,
          type: 'redemption',
          status: 'approved'
        })
        .select('id')
        .single();

      if (error) {
        if (error.message.includes('Insufficient balance for redemption')) {
          toast.error('Você não possui cashback válido suficiente para este resgate. Verifique o saldo disponível e a data de expiração.');
          return;
        }
        throw error;
      }

      await Promise.all([
        loadTransactions(),
        calculateAvailableBalance()
      ]);

      toast.success(`Resgate de R$ ${amount.toFixed(2)} realizado com sucesso!`);
      setShowRedemptionForm(false);
      setRedemptionAmount('');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erro ao resgatar cashback');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCustomer(null);
    setTransactions([]);
    setAvailableBalance(0);
    setActiveTab('purchases');
    toast.success('Logout realizado com sucesso!');
  };

  const toggleTransactionDetails = (transactionId: string) => {
    setExpandedTransactionId(expandedTransactionId === transactionId ? null : transactionId);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  if (!customer) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-purple-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Ganhe 5% de Cashback!
              </h1>
              <p className="text-gray-600 text-lg">
                Compre hoje e ganhe 5% do valor de volta para suas próximas compras!
              </p>
            </div>

            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={() => setIsLogin(false)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  !isLogin
                    ? 'bg-purple-100 text-purple-700 font-medium'
                    : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                Cadastrar
              </button>
              <button
                onClick={() => setIsLogin(true)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  isLogin
                    ? 'bg-purple-100 text-purple-700 font-medium'
                    : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                Entrar
              </button>
            </div>

            <form onSubmit={handleCustomerSubmit} className="space-y-6">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seu nome completo
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input-field text-lg pl-11"
                        placeholder="João da Silva"
                        required={!isLogin}
                      />
                      <User className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seu email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field text-lg pl-11"
                        placeholder="exemplo@email.com"
                        required={!isLogin}
                      />
                      <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Nascimento
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="input-field text-lg pl-11"
                        required={!isLogin}
                      />
                      <Calendar className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seu número do WhatsApp
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneNumberChange}
                    placeholder="(99) 99999-9999"
                    className="input-field text-lg pl-11"
                    maxLength={15}
                    required
                  />
                  <Phone className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Digite seu número com DDD, exemplo: (85) XXXXX-XXXX
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field text-lg pl-11"
                    placeholder="••••••"
                    required
                    minLength={6}
                  />
                  <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
                {!isLogin && (
                  <p className="mt-2 text-sm text-gray-500">
                    Mínimo de 6 caracteres
                  </p>
                )}
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirme sua senha
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-field text-lg pl-11"
                      placeholder="••••••"
                      required={!isLogin}
                    />
                    <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              )}

              {isLogin && (
                <div className="text-right">
                  <Link
                    to="/reset-password"
                    className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    Esqueceu sua senha?
                  </Link>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full text-lg"
                disabled={loading}
              >
                {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Cadastrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <h2 className="text-2xl font-bold">Olá, {customer.name}!</h2>
              <button
                onClick={handleLogout}
                className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
            <p className="text-gray-600 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {customer.phone}
            </p>
          </div>
          <div className="balance-section">
            <div className="balance-decoration"></div>
            <div className="balance-label">Seu saldo disponível</div>
            <div className="balance-amount">
              R$ {availableBalance.toFixed(2)}
            </div>
            {nextExpiringAmount && (
              <div className="balance-expiration">
                <AlertCircle className="w-4 h-4" />
                <span>
                  R$ {nextExpiringAmount.amount.toFixed(2)} - {formatExpirationDate(nextExpiringAmount.date)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="border-t border-b border-purple-100 -mx-8 px-8 py-6">
            <h3 className="font-medium text-gray-900 mb-4">Registrar Nova Compra</h3>
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
                  className="input-field text-lg"
                  placeholder="0,00"
                  required
                />
                {transactionAmount && parseFloat(transactionAmount) > 0 && (
                  <p className="mt-2 text-sm text-purple-600 font-medium flex items-center gap-1">
                    <ArrowRight className="w-4 h-4" />
                    Você receberá R$ {(parseFloat(transactionAmount) * CASHBACK_RATE).toFixed(2)} em cashback
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary w-full text-lg flex items-center justify-center gap-2"
                disabled={loading || isSubmitting}
              >
                <ShoppingBag className="w-5 h-5" />
                {loading ? 'Processando...' : 'Registrar Compra'}
              </button>
            </form>
          </div>

          {availableBalance > 0 && (
            <div className="text-center">
              {showRedemptionForm ? (
                <div className="glass-card p-6 bg-purple-50">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center justify-center gap-2">
                    <Gift className="w-5 h-5 text-purple-600" />
                    Resgatar Cashback
                  </h3>
                  <form onSubmit={redeemCashback} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor para Resgate
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={availableBalance}
                        value={redemptionAmount}
                        onChange={e => setRedemptionAmount(e.target.value)}
                        className="input-field text-lg"
                        placeholder="0,00"
                        required
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Saldo disponível: R$ {availableBalance.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="btn-primary flex-1 text-lg flex items-center justify-center gap-2"
                        disabled={loading}
                      >
                        <Gift className="w-5 h-5" />
                        {loading ? 'Processando...' : 'Confirmar Resgate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRedemptionForm(false);
                          setRedemptionAmount('');
                        }}
                        className="btn-secondary flex-1 text-lg"
                        disabled={loading}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <button
                  onClick={() => setShowRedemptionForm(true)}
                  type="button"
                  className="btn-secondary text-lg inline-flex items-center gap-2"
                  disabled={loading}
                >
                  <Gift className="w-5 h-5" />
                  Resgatar Cashback
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="card-header !mb-0">
            <History className="w-6 h-6 text-purple-600" />
            Minhas Transações
          </h2>
          <div className="flex rounded-lg border border-purple-100 p-1">
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'purchases'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              Compras
            </button>
            <button
              onClick={() => setActiveTab('redemptions')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'redemptions'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              Resgates
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {transactions
            .filter(t => activeTab === 'purchases' ? t.type === 'purchase' : t.type === 'redemption')
            .map(transaction => (
              <div key={transaction.id} className="transaction-item">
                <button 
                  onClick={() => toggleTransactionDetails(transaction.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {transaction.type === 'purchase' ? (
                          <CreditCard className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Gift className="w-4 h-4 text-purple-600" />
                        )}
                        {transaction.type === 'purchase' ?'Compra' : 'Resgate'}
                        {expandedTransactionId === transaction.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-1.5 mt-1">
                        <Clock className="w-4 h-4" />
                        {formatDateTime(transaction.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        R$ {transaction.amount.toFixed(2)}
                      </div>
                      <div className={`text-sm ${
                        transaction.type === 'purchase'
                          ? 'text-green-600'
                          : 'text-purple-600'
                      }`}>
                        {transaction.type === 'purchase' ? '+' : '-'}
                        R$ {Math.abs(transaction.cashback_amount).toFixed(2)} cashback
                      </div>
                    </div>
                  </div>
                </button>

                {expandedTransactionId === transaction.id && (
                  <div className="mt-4 pt-4 border-t border-purple-100">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Status:</span>
                        {renderTransactionStatus(transaction.status)}
                      </div>
                      {transaction.type === 'purchase' && (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Cashback (5%):</span>
                            <span className="text-green-600">
                              R$ {transaction.cashback_amount.toFixed(2)}
                            </span>
                          </div>
                          {transaction.expires_at && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Expira em:</span>
                              <span className="text-orange-600">
                                {new Date(transaction.expires_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {transaction.receipt_url && (
                        <div className="mt-3">
                          <a
                            href={transaction.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1.5"
                          >
                            <Receipt className="w-4 h-4" />
                            Ver comprovante
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

          {transactions.filter(t => 
            activeTab === 'purchases' ? t.type === 'purchase' : t.type === 'redemption'
          ).length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <History className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhuma transação encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientDashboard;