import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Customer } from '../types';

const CUSTOMERS_PER_PAGE = 20;

export const generateCustomerReport = async (customers: Customer[]) => {
  // Create new PDF document
  const doc = new jsPDF();

  // Add header with logo
  doc.setFontSize(20);
  doc.setTextColor(147, 51, 234); // Purple color
  doc.text('Sistema de Cashback', 14, 20);
  
  // Add subtitle
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('Relatório de Clientes', 14, 30);

  // Add date and time
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 40);

  // Add summary statistics
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Total de clientes: ${customers.length}`, 14, 50);
  
  const totalBalance = customers.reduce((sum, customer) => sum + customer.balance, 0);
  doc.text(`Saldo total em cashback: R$ ${totalBalance.toFixed(2)}`, 14, 58);

  // Calculate average balance
  const averageBalance = customers.length > 0 ? totalBalance / customers.length : 0;
  doc.text(`Média de saldo por cliente: R$ ${averageBalance.toFixed(2)}`, 14, 66);

  // Prepare table data
  const tableData = customers.map(customer => [
    customer.name || 'Não informado',
    customer.phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'),
    `R$ ${customer.balance.toFixed(2)}`,
    new Date(customer.created_at).toLocaleDateString('pt-BR'),
    customer.last_login 
      ? new Date(customer.last_login).toLocaleDateString('pt-BR')
      : 'Nunca'
  ]);

  // Calculate total pages needed
  const totalPages = Math.ceil(tableData.length / CUSTOMERS_PER_PAGE);

  // Add page number text to first page
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Página 1 de ${totalPages}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

  // Add first table starting at y=80
  addTableToPage(doc, tableData.slice(0, CUSTOMERS_PER_PAGE), 80);

  // Add remaining pages
  for (let page = 1; page < totalPages; page++) {
    doc.addPage();
    
    // Add page number
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Página ${page + 1} de ${totalPages}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );

    // Add table starting at y=20 for subsequent pages
    const startIdx = page * CUSTOMERS_PER_PAGE;
    const endIdx = startIdx + CUSTOMERS_PER_PAGE;
    addTableToPage(doc, tableData.slice(startIdx, endIdx), 20);
  }

  // Save the PDF
  doc.save(`relatorio-clientes-${new Date().toISOString().split('T')[0]}.pdf`);
};

const addTableToPage = (doc: jsPDF, data: string[][], startY: number) => {
  autoTable(doc, {
    head: [['Nome', 'Telefone', 'Saldo', 'Data de Cadastro', 'Último Acesso']],
    body: data,
    startY,
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: [147, 51, 234], // Purple color
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 245, 255], // Light purple
    },
    columnStyles: {
      0: { cellWidth: 50 }, // Nome
      1: { cellWidth: 35 }, // Telefone
      2: { cellWidth: 30 }, // Saldo
      3: { cellWidth: 35 }, // Data de Cadastro
      4: { cellWidth: 35 }, // Último Acesso
    },
    margin: { top: 20 },
    didDrawPage: (data) => {
      // Add header to each page
      if (data.pageNumber > 1) {
        doc.setFontSize(14);
        doc.setTextColor(147, 51, 234);
        doc.text('Sistema de Cashback - Relatório de Clientes', 14, 15);
      }
    }
  });
};