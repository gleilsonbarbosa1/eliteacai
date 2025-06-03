import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Customer, Transaction } from '../types';

interface CustomerMetrics {
  totalPurchases: number;
  totalSpent: number;
  averagePurchase: number;
  lastPurchase: Date | null;
  totalCashback: number;
  redeemedCashback: number;
  expiredCashback: number;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

function filterTransactionsByDateRange(transactions: Transaction[] | undefined, dateRange: DateRange): Transaction[] {
  if (!transactions) return [];
  
  return transactions.filter(t => {
    const transactionDate = new Date(t.created_at);
    return transactionDate >= dateRange.startDate && transactionDate <= dateRange.endDate;
  });
}

function calculateCustomerMetrics(transactions: Transaction[]): CustomerMetrics {
  const metrics: CustomerMetrics = {
    totalPurchases: 0,
    totalSpent: 0,
    averagePurchase: 0,
    lastPurchase: null,
    totalCashback: 0,
    redeemedCashback: 0,
    expiredCashback: 0
  };

  transactions.forEach(t => {
    if (t.type === 'purchase' && t.status === 'approved') {
      metrics.totalPurchases++;
      metrics.totalSpent += Number(t.amount);
      metrics.totalCashback += Number(t.cashback_amount);

      const purchaseDate = new Date(t.created_at);
      if (!metrics.lastPurchase || purchaseDate > metrics.lastPurchase) {
        metrics.lastPurchase = purchaseDate;
      }

      if (t.expires_at && new Date(t.expires_at) < new Date()) {
        metrics.expiredCashback += Number(t.cashback_amount);
      }
    } else if (t.type === 'redemption' && t.status === 'approved') {
      metrics.redeemedCashback += Number(t.amount);
    }
  });

  metrics.averagePurchase = metrics.totalPurchases > 0 ? 
    metrics.totalSpent / metrics.totalPurchases : 0;

  return metrics;
}

function getStatusIndicator(daysSinceLastPurchase: number | null): string {
  if (daysSinceLastPurchase === null) return '🔴';
  if (daysSinceLastPurchase <= 3) return '🟢';
  if (daysSinceLastPurchase <= 7) return '🟡';
  return '🔴';
}

export const generateCustomerReport = async (
  customers: Customer[], 
  dateRange: DateRange,
  section: 'profile' | 'lifecycle' | 'active' = 'profile'
) => {
  // Create new PDF document
  const doc = new jsPDF();
  const now = new Date();

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Helper function to add page header
  const addPageHeader = (title: string) => {
    doc.setFontSize(20);
    doc.setTextColor(147, 51, 234); // Purple color
    doc.text(title, 14, 20);
    
    // Add date range and generation time
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${formatDate(dateRange.startDate)} até ${formatDate(dateRange.endDate)}`, 14, 30);
    doc.text(`Gerado em: ${formatDate(now)} às ${now.toLocaleTimeString('pt-BR')}`, 14, 35);
  };

  switch (section) {
    case 'profile':
      addPageHeader('Perfil de Compra dos Clientes');
      generateProfileReport(doc, customers, dateRange);
      break;
    case 'lifecycle':
      addPageHeader('Ciclo de Vida dos Clientes');
      generateLifecycleReport(doc, customers, dateRange);
      break;
    case 'active':
      addPageHeader('Relatório de Clientes Ativos');
      generateActiveReport(doc, customers, dateRange);
      break;
  }

  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
  }

  // Save the PDF
  const filename = `relatorio-${section}-${dateRange.startDate.toISOString().split('T')[0]}_${dateRange.endDate.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

function generateProfileReport(doc: jsPDF, customers: Customer[], dateRange: DateRange) {
  const purchaseProfileData = customers.map(customer => {
    const filteredTransactions = filterTransactionsByDateRange(customer.transactions, dateRange);
    const metrics = calculateCustomerMetrics(filteredTransactions);

    return [
      customer.name || customer.phone,
      `R$ ${metrics.averagePurchase.toFixed(2)}`,
      metrics.totalPurchases,
      `R$ ${metrics.totalSpent.toFixed(2)}`,
      `R$ ${metrics.totalCashback.toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: 45,
    head: [['Cliente', 'Ticket Médio', 'Total Compras', 'Total Gasto', 'Cashback']],
    body: purchaseProfileData,
    headStyles: {
      fillColor: [147, 51, 234],
      textColor: 255,
      fontStyle: 'bold'
    }
  });
}

function generateLifecycleReport(doc: jsPDF, customers: Customer[], dateRange: DateRange) {
  const lifecycleData = customers.map(customer => {
    const filteredTransactions = filterTransactionsByDateRange(customer.transactions, dateRange);
    const metrics = calculateCustomerMetrics(filteredTransactions);

    const daysSinceLastPurchase = metrics.lastPurchase ? 
      Math.floor((new Date().getTime() - metrics.lastPurchase.getTime()) / (1000 * 60 * 60 * 24)) : 
      null;

    return [
      getStatusIndicator(daysSinceLastPurchase),
      customer.name || 'Não informado',
      metrics.lastPurchase ? metrics.lastPurchase.toLocaleDateString('pt-BR') : 'Nunca',
      daysSinceLastPurchase !== null ? `${daysSinceLastPurchase} dias` : 'N/A',
      metrics.totalPurchases,
      `R$ ${metrics.redeemedCashback.toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: 45,
    head: [['Status', 'Cliente', 'Última Compra', 'Dias Inativo', 'Total Compras', 'Cashback Resgatado']],
    body: lifecycleData,
    headStyles: {
      fillColor: [147, 51, 234],
      textColor: 255,
      fontStyle: 'bold'
    }
  });

  // Add legend
  const legendY = doc.autoTable.previous.finalY + 10;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('🟢 Verde: Última compra em até 3 dias', 14, legendY);
  doc.text('🟡 Amarelo: Última compra entre 4 e 7 dias', 14, legendY + 5);
  doc.text('🔴 Vermelho: Última compra há mais de 8 dias', 14, legendY + 10);
}

function generateActiveReport(doc: jsPDF, customers: Customer[], dateRange: DateRange) {
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text('Clientes que fizeram login, cadastraram compra ou usaram saldo recentemente.', 14, 45);

  const activeCustomersData = customers
    .map(customer => {
      const filteredTransactions = filterTransactionsByDateRange(customer.transactions, dateRange);
      const metrics = calculateCustomerMetrics(filteredTransactions);

      const daysSinceLastPurchase = metrics.lastPurchase ? 
        Math.floor((new Date().getTime() - metrics.lastPurchase.getTime()) / (1000 * 60 * 60 * 24)) : 
        null;

      return {
        customer,
        metrics,
        daysSinceLastPurchase
      };
    })
    .sort((a, b) => {
      if (!a.metrics.lastPurchase) return 1;
      if (!b.metrics.lastPurchase) return -1;
      return b.metrics.lastPurchase.getTime() - a.metrics.lastPurchase.getTime();
    })
    .map(({ customer, metrics, daysSinceLastPurchase }) => [
      getStatusIndicator(daysSinceLastPurchase),
      customer.name || 'Não informado',
      customer.phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'),
      daysSinceLastPurchase !== null ? `${daysSinceLastPurchase} dias` : 'N/A',
      metrics.totalPurchases
    ]);

  autoTable(doc, {
    startY: 55,
    head: [['Status', 'Nome', 'WhatsApp', 'Dias Inativo', 'Total Compras']],
    body: activeCustomersData,
    headStyles: {
      fillColor: [147, 51, 234],
      textColor: 255,
      fontStyle: 'bold'
    }
  });

  // Add legend
  const legendY = doc.autoTable.previous.finalY + 10;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('🟢 Verde: Última compra em até 3 dias', 14, legendY);
  doc.text('🟡 Amarelo: Última compra entre 4 e 7 dias', 14, legendY + 5);
  doc.text('🔴 Vermelho: Última compra há mais de 8 dias', 14, legendY + 10);
}