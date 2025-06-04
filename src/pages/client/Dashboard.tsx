import { useState, useEffect } from 'react';
import { Phone, Wallet, History, ArrowRight, Sparkles, ShoppingBag, Receipt, ChevronDown, ChevronUp, User, Lock, LogOut, MapPin, Calendar, Mail, AlertCircle, LogIn, Tag, Trophy, CreditCard, Gift, CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { sendWhatsAppNotification } from '../../lib/notifications';
import toast from 'react-hot-toast';
import { getCurrentPosition, isWithinStoreRange, getClosestStore, formatDistance } from '../../utils/geolocation';
import { getAvailableBalance, getNextExpiringCashback } from '../../utils/transactions';
import type { Customer, Transaction, StoreLocation } from '../../types';
import { STORE_LOCATIONS, TEST_STORE } from '../../types';
import PromotionsAlert from '../../components/PromotionsAlert';
import CashbackAnimation from '../../components/CashbackAnimation';
import ConfirmationModal from '../../components/ConfirmationModal';

// Combine visible stores and test store for geolocation checks
const ALL_STORE_LOCATIONS = [...STORE_LOCATIONS, TEST_STORE];

const ITEMS_PER_PAGE = 10;

function PromoMessage() {
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const getPromoMessage = () => {
    switch (today) {
      case 1: // Monday
        return {
          product: 'copo de 300g',
          price: '9,99'
        };
      case 2: // Tuesday
        return {
          product: 'copo de 500g',
          price: '15,99'
        };
      case 3: // Wednesday
        return {
          product: 'copo de 400g',
          price: '12,99'
        };
      case 4: // Thursday
        return {
          product: 'quilo',
          price: '37,99'
        };
      default:
        return {
          product: 'copo de 300g',
          price: '9,99'
        };
    }
  };

  const promo = getPromoMessage();

  return (
    <div className="bg-purple-50 text-purple-700 p-4 rounded-xl text-center font-medium mt-6 border border-purple-100">
      💥 Aproveite! Hoje tem {promo.product} SEM PESO por <span className="font-bold">R${promo.price}</span>! Só na Elite Açaí!
    </div>
  );
}

function ClientDashboard() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [email, setEmail] = useState(() => {
    const savedData = localStorage.getItem('loginData');
    return savedData ? JSON.parse(savedData).email : '';
  });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState(() => {
    const savedData = localStorage.getItem('loginData');
    return savedData ? JSON.parse(savedData).password : '';
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('rememberMe') === 'true';
  });
  const [whatsAppConsent, setWhatsAppConsent] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreLocation | null>(null);
  const [showRedemptionForm, setShowRedemptionForm] = useState(false);
  const [redemptionAmount, setRedemptionAmount] = useState('');
  const [selectedRedemptionStore, setSelectedRedemptionStore] = useState<StoreLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'purchases' | 'redemptions'>('purchases');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextExpiringAmount, setNextExpiringAmount] = useState<{ amount: number; date: Date } | null>(null);
  const [isTopCustomer, setIsTopCustomer] = useState(false);
  const [topCustomerRank, setTopCustomerRank] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showCashbackAnimation, setShowCashbackAnimation] = useState(false);
  const [lastCashbackAmount, setLastCashbackAmount] = useState(0);
  const [showPurchaseConfirmation, setShowPurchaseConfirmation] = useState(false);
  const [showRedemptionConfirmation, setShowRedemptionConfirmation] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (customer) {
      loadTransactions();
      calculateAvailableBalance();
      checkTopCustomerStatus();
      checkLocationAndSetStore();
    }
  }, [customer?.id]);

  useEffect(() => {
    // Reset to first page when changing tabs
    setCurrentPage(1);
  }, [activeTab]);

  // ... (rest of the existing code remains unchanged until the transactions list rendering)

  const filteredTransactions = transactions
    .filter(t => activeTab === 'purchases' ? t.type === 'purchase' : t.type === 'redemption');

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

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

  // ... (rest of the existing code remains unchanged until the transactions list rendering)

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {!customer ? (
        // ... (login/register form code remains unchanged)
      ) : (
        <>
          <PromotionsAlert />
          {/* ... (other components remain unchanged) */}

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
              {currentTransactions.map(transaction => (
                // ... (transaction item code remains unchanged)
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-purple-100">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-purple-600 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-purple-600 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {currentTransactions.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma transação encontrada
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ... (rest of the components remain unchanged) */}
    </div>
  );
}

export default ClientDashboard;