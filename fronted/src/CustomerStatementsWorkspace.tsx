import { useEffect, useMemo, useState } from 'react';
import { useSalesStore, useCustomersStore, useCompanyStore } from './stores';
import { useCustomerPaymentsStore } from './stores/useCustomerPaymentsStore';
import { useCreditNotesStore } from './stores/useCreditNotesStore';
import {
  Users, DollarSign, Download, ArrowLeft,
  Search, FileSpreadsheet,
  Building2, Mail, Phone, MapPin, CheckCircle2,
  Clock, ChevronRight,
  RefreshCw, FileCheck, FileText, CreditCard, AlertTriangle
} from 'lucide-react';
import { money } from './lib/currency';
import { formatInvoiceNumber } from './lib/invoiceNumbering';
import { downloadExcel, downloadCSV } from './lib/exportUtils';
import ExportDropdown from './components/ExportDropdown';
import { KpiCard, KpiGrid } from './components/ui/kpi-card';
import { StatusChip } from './components/ui/status-chip';
import { EmptyState, TableSkeleton } from './components/ui/empty-state';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Props = { activeEntityId: string };

interface StatementTransaction {
  id: string;
  date: string;
  type: 'Invoice' | 'Payment' | 'CreditNote';
  typeLabel: string;
  reference: string;
  docNumber: string;
  dueDate?: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  status: string;
}

type DatePreset = 'last30' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'ytd' | 'all';

function getPresetDates(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  
  if (preset === 'last30') {
    const past = new Date(now.getTime() - 30 * 86400000);
    return { from: past.toISOString().slice(0, 10), to: todayStr };
  }
  if (preset === 'thisMonth') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: firstDay.toISOString().slice(0, 10), to: todayStr };
  }
  if (preset === 'lastMonth') {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: firstDay.toISOString().slice(0, 10), to: lastDay.toISOString().slice(0, 10) };
  }
  if (preset === 'thisQuarter') {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const firstDay = new Date(now.getFullYear(), currentQuarter * 3, 1);
    return { from: firstDay.toISOString().slice(0, 10), to: todayStr };
  }
  if (preset === 'ytd') {
    const firstDay = new Date(now.getFullYear(), 0, 1);
    return { from: firstDay.toISOString().slice(0, 10), to: todayStr };
  }
  return { from: '', to: todayStr };
}

export function CustomerStatementsWorkspace({ activeEntityId }: Props) {
  // Stores
  const customers = useCustomersStore((s) => s.customers as any[]);
  const fetchCustomers = useCustomersStore((s) => s.fetchCustomers);

  const invoices = useSalesStore((s) => s.invoices as any[]);
  const fetchInvoices = useSalesStore((s) => s.fetchInvoices);

  const { payments, fetchAll: fetchPayments } = useCustomerPaymentsStore();
  const { creditNotes, fetchAll: fetchCreditNotes } = useCreditNotesStore();
  const { entities, fetchCompanies } = useCompanyStore();

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'outstanding' | 'paid' | 'overdue'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Period / Date filter state for statements
  const [activePreset, setActivePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [typeFilter, setTypeFilter] = useState<'all' | 'Invoice' | 'Payment' | 'CreditNote'>('all');

  // Load all required accounting data
  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCompanies(),
        fetchCustomers(activeEntityId),
        fetchInvoices(activeEntityId),
        fetchPayments(activeEntityId),
        fetchCreditNotes(activeEntityId),
      ]);
    } catch (e) {
      console.error('Failed to load statement data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeEntityId]);

  const activeCompany = useMemo(() => {
    return entities.find((e) => e.id === activeEntityId) || entities[0];
  }, [entities, activeEntityId]);

  const fmt = (n?: number) => money(n || 0);

  // Compute statement data for a given customer and date range
  const computeCustomerStatement = (
    customerId: string,
    fromStr: string,
    toStr: string
  ) => {
    const customer = customers.find((c) => c.id === customerId);
    const customerInvoices = invoices.filter(
      (i: any) =>
        i.customerId === customerId &&
        i.status !== 0 &&
        i.status !== '0' &&
        String(i.status).toLowerCase() !== 'draft' &&
        String(i.status).toLowerCase() !== 'void' &&
        i.status !== 3
    );
    const customerPayments = payments.filter(
      (p: any) => p.customerId === customerId
    );
    const customerCreditNotes = creditNotes.filter(
      (cn: any) => cn.customerId === customerId && cn.status !== 'Void'
    );

    // Calculate opening balance before `fromStr`
    let openingBal = 0;
    if (fromStr) {
      customerInvoices.forEach((inv: any) => {
        const d = (inv.invoiceDate || inv.date || '').slice(0, 10);
        if (d && d < fromStr) {
          openingBal += inv.totalAmount || 0;
        }
      });
      customerPayments.forEach((p: any) => {
        const d = (p.date || p.paymentDate || '').slice(0, 10);
        if (d && d < fromStr) {
          openingBal -= p.amount || 0;
        }
      });
      customerCreditNotes.forEach((cn: any) => {
        const d = (cn.creditNoteDate || cn.date || '').slice(0, 10);
        if (d && d < fromStr) {
          openingBal -= cn.totalAmount || 0;
        }
      });
    }

    // Build line items within period
    const rawLines: {
      id: string;
      date: string;
      type: 'Invoice' | 'Payment' | 'CreditNote';
      typeLabel: string;
      reference: string;
      docNumber: string;
      dueDate?: string;
      description: string;
      debit: number;
      credit: number;
      status: string;
    }[] = [];

    customerInvoices.forEach((inv: any, idx: number) => {
      const d = (inv.invoiceDate || inv.date || '').slice(0, 10);
      if ((!fromStr || d >= fromStr) && (!toStr || d <= toStr)) {
        const st = typeof inv.status === 'number'
          ? ['Draft', 'Sent', 'Paid', 'Void', 'Partly Paid', 'Overdue'][inv.status] || 'Active'
          : String(inv.status || 'Active');
        const cleanInvNum = formatInvoiceNumber(inv.invoiceNumber || inv.reference, idx + 1);
        rawLines.push({
          id: inv.id || inv.invoiceNumber,
          date: d,
          type: 'Invoice',
          typeLabel: 'Sales Invoice',
          reference: cleanInvNum,
          docNumber: cleanInvNum,
          dueDate: (inv.dueDate || '').slice(0, 10),
          description: inv.notes || `Sales Invoice #${cleanInvNum}`,
          debit: inv.totalAmount || 0,
          credit: 0,
          status: st,
        });
      }
    });

    customerPayments.forEach((p: any) => {
      const d = (p.date || p.paymentDate || '').slice(0, 10);
      if ((!fromStr || d >= fromStr) && (!toStr || d <= toStr)) {
        rawLines.push({
          id: p.id || p.receiptNumber,
          date: d,
          type: 'Payment',
          typeLabel: 'Customer Payment',
          reference: p.reference || p.invoiceNumber || '',
          docNumber: p.receiptNumber || 'RCP',
          dueDate: '-',
          description: p.memo || `Payment Received (${p.paymentMethod || 'Standard'})`,
          debit: 0,
          credit: p.amount || 0,
          status: p.status || 'Received',
        });
      }
    });

    customerCreditNotes.forEach((cn: any) => {
      const d = (cn.creditNoteDate || cn.date || '').slice(0, 10);
      if ((!fromStr || d >= fromStr) && (!toStr || d <= toStr)) {
        rawLines.push({
          id: cn.id || cn.creditNoteNumber,
          date: d,
          type: 'CreditNote',
          typeLabel: 'Credit Note',
          reference: cn.reference || '',
          docNumber: cn.creditNoteNumber || 'CN',
          dueDate: '-',
          description: cn.notes || `Credit Note Adjustment #${cn.creditNoteNumber}`,
          debit: 0,
          credit: cn.totalAmount || 0,
          status: cn.status || 'Posted',
        });
      }
    });

    // Sort chronologically by date
    rawLines.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

    // Calculate running balances
    let running = openingBal;
    const lines: StatementTransaction[] = rawLines.map((l) => {
      running = running + l.debit - l.credit;
      return {
        ...l,
        balance: running,
      };
    });

    const totalDebits = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredits = lines.reduce((s, l) => s + l.credit, 0);
    const closingBalance = lines.length > 0 ? lines[lines.length - 1].balance : openingBal;

    // Overdue invoices calculation
    const today = new Date().toISOString().slice(0, 10);
    const overdueAmount = customerInvoices
      .filter((i: any) => (i.amountDue || 0) > 0 && i.dueDate && i.dueDate.slice(0, 10) < today)
      .reduce((s: number, i: any) => s + (i.amountDue || 0), 0);

    // Aging breakdown as of today
    const aging = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      days90Plus: 0,
    };

    customerInvoices
      .filter((i: any) => (i.amountDue || 0) > 0)
      .forEach((inv: any) => {
        const due = new Date(inv.dueDate || inv.invoiceDate || today).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - due) / 86400000);
        const amt = inv.amountDue || 0;
        if (diff <= 0) aging.current += amt;
        else if (diff <= 30) aging.days30 += amt;
        else if (diff <= 60) aging.days60 += amt;
        else if (diff <= 90) aging.days90 += amt;
        else aging.days90Plus += amt;
      });

    return {
      customer,
      openingBalance: openingBal,
      lines,
      totalDebits,
      totalCredits,
      closingBalance,
      overdueAmount,
      aging,
    };
  };

  // Pre-calculate summary statistics for all customers
  const customerSummaries = useMemo(() => {
    return customers.map((c) => {
      const stmt = computeCustomerStatement(c.id, '', '');
      return {
        ...c,
        totalInvoiced: stmt.totalDebits,
        totalPaid: stmt.totalCredits,
        outstandingBalance: stmt.closingBalance,
        overdueAmount: stmt.overdueAmount,
        aging: stmt.aging,
        transactionCount: stmt.lines.length,
      };
    });
  }, [customers, invoices, payments, creditNotes]);

  // Overall KPI metrics
  const totalReceivables = useMemo(
    () => customerSummaries.reduce((s, c) => s + Math.max(0, c.outstandingBalance), 0),
    [customerSummaries]
  );
  const totalOverdue = useMemo(
    () => customerSummaries.reduce((s, c) => s + c.overdueAmount, 0),
    [customerSummaries]
  );
  const outstandingAccountsCount = useMemo(
    () => customerSummaries.filter((c) => c.outstandingBalance > 0.01).length,
    [customerSummaries]
  );
  const currentAccountsCount = useMemo(
    () => customerSummaries.filter((c) => c.outstandingBalance <= 0.01).length,
    [customerSummaries]
  );

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customerSummaries.filter((c) => {
      const q = query.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.customerNumber || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q);

      if (!matchesQuery) return false;

      if (statusFilter === 'outstanding') return c.outstandingBalance > 0.01;
      if (statusFilter === 'paid') return c.outstandingBalance <= 0.01;
      if (statusFilter === 'overdue') return c.overdueAmount > 0.01;
      return true;
    });
  }, [customerSummaries, query, statusFilter]);

  // Selected customer statement computation
  const activeStatement = useMemo(() => {
    if (!selectedCustomerId) return null;
    return computeCustomerStatement(selectedCustomerId, dateFrom, dateTo);
  }, [selectedCustomerId, dateFrom, dateTo, invoices, payments, creditNotes]);

  // Filtered statement lines by type
  const displayedStatementLines = useMemo(() => {
    if (!activeStatement) return [];
    if (typeFilter === 'all') return activeStatement.lines;
    return activeStatement.lines.filter((l) => l.type === typeFilter);
  }, [activeStatement, typeFilter]);

  // Handle Preset Change
  const handlePresetSelect = (preset: DatePreset) => {
    setActivePreset(preset);
    const { from, to } = getPresetDates(preset);
    setDateFrom(from);
    setDateTo(to);
  };

  // ─── PDF Statement Generator ───────────────────────────────────────────────
  const generateCustomerStatementPDF = (customerId: string, from = dateFrom, to = dateTo) => {
    const stmt = computeCustomerStatement(customerId, from, to);
    const cust = stmt.customer;
    if (!cust) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    // Palette
    const primaryColor: [number, number, number] = [15, 76, 129]; // Classic Deep Blue
    const darkColor: [number, number, number] = [30, 41, 59];
    const grayColor: [number, number, number] = [100, 116, 139];
    const lightBg: [number, number, number] = [248, 250, 252];
    const borderGray: [number, number, number] = [226, 232, 240];

    // Header Banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text('STATEMENT OF ACCOUNT', margin, 14);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Period: ${from ? new Date(from).toLocaleDateString() : 'Inception'} to ${new Date(to).toLocaleDateString()}`,
      margin,
      21
    );

    doc.setFontSize(8.5);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 14, { align: 'right' });
    doc.text(`Currency: ${activeCompany?.currencyCode || cust.currencyCode || 'PKR'}`, pageWidth - margin, 21, {
      align: 'right',
    });

    // Company & Customer Two-Column Info Cards
    const boxY = 34;
    const boxH = 34;
    const colW = (contentWidth - 6) / 2;

    // Company Box (Left)
    doc.setFillColor(...lightBg);
    doc.setDrawColor(...borderGray);
    doc.roundedRect(margin, boxY, colW, boxH, 2, 2, 'FD');

    doc.setTextColor(...primaryColor);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(activeCompany?.name || 'Company ERP', margin + 4, boxY + 7);

    doc.setTextColor(...darkColor);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    let compY = boxY + 13;
    const compAny = activeCompany as any;
    if (compAny?.taxId || compAny?.taxNumber || compAny?.ntn) {
      doc.text(`Tax / NTN #: ${compAny.taxId || compAny.taxNumber || compAny.ntn}`, margin + 4, compY);
      compY += 4.5;
    }
    if (compAny?.country || compAny?.legalName) {
      doc.text(`${compAny.legalName || ''} • ${compAny.country || ''}`.trim(), margin + 4, compY);
      compY += 4.5;
    }
    if (compAny?.currencyCode || compAny?.functionalCurrency) {
      doc.text(`Functional Currency: ${compAny.currencyCode || compAny.functionalCurrency || 'PKR'}`, margin + 4, compY);
    }

    // Customer Box (Right)
    const custX = margin + colW + 6;
    doc.setFillColor(...lightBg);
    doc.roundedRect(custX, boxY, colW, boxH, 2, 2, 'FD');

    doc.setTextColor(...primaryColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO / CUSTOMER', custX + 4, boxY + 7);

    doc.setTextColor(...darkColor);
    doc.setFontSize(10);
    doc.text(cust.name || cust.companyName || 'Valued Customer', custX + 4, boxY + 13);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    let custY = boxY + 18;
    if (cust.customerNumber) {
      doc.text(`Customer ID: ${cust.customerNumber}`, custX + 4, custY);
      custY += 4.5;
    }
    if (cust.taxNumber || cust.taxId) {
      doc.text(`Tax ID / VAT: ${cust.taxNumber || cust.taxId}`, custX + 4, custY);
      custY += 4.5;
    }
    if (cust.email || cust.phone) {
      doc.text(`${cust.phone || ''} ${cust.email ? `• ${cust.email}` : ''}`.trim(), custX + 4, custY);
    }

    // 4 Financial Summary KPI Blocks
    const kpiY = boxY + boxH + 5;
    const kpiH = 16;
    const kpiW = (contentWidth - 9) / 4;

    const kpis = [
      { label: 'OPENING BALANCE', value: fmt(stmt.openingBalance), color: [71, 85, 105] as [number, number, number] },
      { label: 'TOTAL INVOICED', value: fmt(stmt.totalDebits), color: [225, 29, 72] as [number, number, number] },
      { label: 'PAYMENTS / CREDITS', value: fmt(stmt.totalCredits), color: [16, 185, 129] as [number, number, number] },
      { label: 'CLOSING BALANCE', value: fmt(stmt.closingBalance), color: primaryColor },
    ];

    kpis.forEach((k, idx) => {
      const x = margin + idx * (kpiW + 3);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(...borderGray);
      doc.roundedRect(x, kpiY, kpiW, kpiH, 1.5, 1.5, 'FD');

      doc.setTextColor(...grayColor);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text(k.label, x + 3, kpiY + 5.5);

      doc.setTextColor(...k.color);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text(k.value, x + 3, kpiY + 12.5);
    });

    // Transaction Details Table
    const tableStartY = kpiY + kpiH + 6;

    const tableHeaders = [
      'Date',
      'Type',
      'Ref / Doc #',
      'Due Date',
      'Description',
      'Debit (Inv)',
      'Credit (Paid)',
      'Balance',
    ];

    const tableRows = stmt.lines.map((l) => [
      l.date,
      l.typeLabel,
      l.docNumber,
      l.dueDate || '-',
      l.description,
      l.debit > 0 ? fmt(l.debit) : '—',
      l.credit > 0 ? fmt(l.credit) : '—',
      fmt(l.balance),
    ]);

    // Add totals row
    tableRows.push([
      '',
      '',
      '',
      '',
      'PERIOD TOTALS',
      fmt(stmt.totalDebits),
      fmt(stmt.totalCredits),
      fmt(stmt.closingBalance),
    ]);

    autoTable(doc, {
      startY: tableStartY,
      head: [tableHeaders],
      body: tableRows,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.2,
        textColor: darkColor,
        lineColor: borderGray,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 24 },
        2: { cellWidth: 22 },
        3: { cellWidth: 18 },
        4: { cellWidth: 44 },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 20, halign: 'right' },
        7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
          if (data.column.index >= 5) {
            data.cell.styles.textColor = primaryColor;
          }
        }
      },
    });

    // Aging Analysis Table on Footer
    const finalY = (doc as any).lastAutoTable.finalY + 6;

    if (finalY + 30 < doc.internal.pageSize.getHeight()) {
      doc.setTextColor(...darkColor);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('AGING BREAKDOWN', margin, finalY + 4);

      const agingHeaders = ['Current (Not Due)', '1 - 30 Days', '31 - 60 Days', '61 - 90 Days', '90+ Days (Overdue)', 'Total Outstanding'];
      const agingRows = [[
        fmt(stmt.aging.current),
        fmt(stmt.aging.days30),
        fmt(stmt.aging.days60),
        fmt(stmt.aging.days90),
        fmt(stmt.aging.days90Plus),
        fmt(stmt.closingBalance),
      ]];

      autoTable(doc, {
        startY: finalY + 6,
        head: [agingHeaders],
        body: agingRows,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          halign: 'right',
          textColor: darkColor,
        },
        headStyles: {
          fillColor: [51, 65, 85],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'right',
        },
      });
    }

    // Remittance Notice & Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...borderGray);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setTextColor(...grayColor);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Thank you for your business. Please remit payments quoting your customer code.',
      margin,
      pageHeight - 9
    );
    doc.text('Confidential Financial Record', pageWidth - margin, pageHeight - 9, { align: 'right' });

    // Trigger download
    const cleanName = (cust.name || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Statement_${cleanName}_${to}.pdf`);
  };

  // ─── Individual Excel Export ───────────────────────────────────────────────
  const exportCustomerExcel = (customerId: string) => {
    const stmt = computeCustomerStatement(customerId, dateFrom, dateTo);
    const cust = stmt.customer;
    if (!cust) return;

    const headers = ['Date', 'Type', 'Reference', 'Doc #', 'Due Date', 'Description', 'Debit', 'Credit', 'Balance', 'Status'];
    const rows = [
      ['OPENING BALANCE', '', '', '', '', 'Balance forward', '', '', stmt.openingBalance, ''],
      ...stmt.lines.map((l) => [
        l.date,
        l.typeLabel,
        l.reference,
        l.docNumber,
        l.dueDate,
        l.description,
        l.debit,
        l.credit,
        l.balance,
        l.status,
      ]),
      ['TOTALS', '', '', '', '', 'Period Total', stmt.totalDebits, stmt.totalCredits, stmt.closingBalance, ''],
    ];

    const cleanName = (cust.name || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadExcel(`Statement_${cleanName}_${dateTo}`, 'Statement', headers, rows);
  };

  // ─── Individual CSV Export ────────────────────────────────────────────────
  const exportCustomerCSV = (customerId: string) => {
    const stmt = computeCustomerStatement(customerId, dateFrom, dateTo);
    const cust = stmt.customer;
    if (!cust) return;

    const headers = ['Date', 'Type', 'Doc Number', 'Due Date', 'Description', 'Debit', 'Credit', 'Balance', 'Status'];
    const rows = stmt.lines.map((l) => [
      l.date,
      l.typeLabel,
      l.docNumber,
      l.dueDate,
      l.description,
      l.debit,
      l.credit,
      l.balance,
      l.status,
    ]);

    const cleanName = (cust.name || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadCSV(`Statement_${cleanName}_${dateTo}.csv`, headers, rows);
  };

  // ─── Export All Customers Summary ─────────────────────────────────────────
  const exportAllSummaryExcel = () => {
    const headers = ['Customer Code', 'Customer Name', 'Email', 'Phone', 'Total Invoiced', 'Total Paid', 'Outstanding Balance', 'Overdue Amount', 'Status'];
    const rows = filteredCustomers.map((c) => [
      c.customerNumber || '-',
      c.name || c.companyName,
      c.email || '-',
      c.phone || '-',
      c.totalInvoiced,
      c.totalPaid,
      c.outstandingBalance,
      c.overdueAmount,
      c.outstandingBalance > 0 ? 'Outstanding' : 'Paid Up',
    ]);
    downloadExcel(`Customer_Statements_Summary_${new Date().toISOString().slice(0, 10)}`, 'Summary', headers, rows);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // ─── VIEW 2: DETAILED CUSTOMER STATEMENT VIEW ──────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  if (selectedCustomerId && activeStatement && activeStatement.customer) {
    const cust = activeStatement.customer;

    return (
      <div className="space-y-4 max-w-7xl mx-auto pb-10">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[var(--color-surface)] p-3.5 rounded-xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCustomerId(null)}
              className="h-8.5 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
            </button>
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
            <div>
              <h1 className="text-base font-bold text-[var(--color-text-strong)] tracking-tight flex items-center gap-2">
                <span className="text-lg">📄</span> {cust.name || cust.companyName}
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono">
                  {cust.customerNumber || 'CUST'}
                </span>
              </h1>
              <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                Customer account statement with complete double-entry transaction trail and running balance.
              </p>
            </div>
          </div>

          {/* Statement Export Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <ExportDropdown
              label="Export Statement"
              onPDF={() => generateCustomerStatementPDF(cust.id)}
              onExcel={() => exportCustomerExcel(cust.id)}
              onCSV={() => exportCustomerCSV(cust.id)}
              onPrint={() => window.print()}
            />
          </div>
        </div>

        {/* Customer Profile & Info Header Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-2xs space-y-2">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-600" /> Customer Information
            </span>
            <p className="text-sm font-bold text-[var(--color-text-strong)]">{cust.name || cust.companyName}</p>
            <div className="text-xs text-[var(--color-text-muted)] space-y-1">
              {cust.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {cust.email}</div>}
              {cust.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {cust.phone}</div>}
              {(cust.addressLine1 || cust.city) && (
                <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {[cust.addressLine1, cust.city, cust.country].filter(Boolean).join(', ')}</div>
              )}
              {cust.taxNumber && <div className="font-mono text-[11px]">Tax/NTN: {cust.taxNumber}</div>}
            </div>
          </div>

          <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-2xs space-y-2">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3 h-3 text-emerald-600" /> Issuing Entity & Terms
            </span>
            <p className="text-sm font-bold text-[var(--color-text-strong)]">{activeCompany?.name || 'Main Entity'}</p>
            <div className="text-xs text-[var(--color-text-muted)] space-y-1">
              <div>Currency: <strong className="text-[var(--color-text)]">{cust.currencyCode || activeCompany?.currencyCode || 'PKR'}</strong></div>
              <div>Payment Terms: <strong className="text-[var(--color-text)]">{cust.paymentTerms || 'Net 30 Days'}</strong></div>
              <div>Credit Limit: <strong className="text-[var(--color-text)]">{cust.creditLimit ? fmt(cust.creditLimit) : 'Unlimited'}</strong></div>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-2xs space-y-2">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" /> Statement Period Controls
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {(['last30', 'thisMonth', 'lastMonth', 'thisQuarter', 'ytd', 'all'] as DatePreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePresetSelect(p)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                    activePreset === p
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {p === 'last30' ? '30 Days' : p === 'thisMonth' ? 'This Mo' : p === 'lastMonth' ? 'Last Mo' : p === 'thisQuarter' ? 'Qtr' : p === 'ytd' ? 'YTD' : 'All'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setActivePreset('all'); }}
                className="h-7 px-2 border border-[var(--color-border)] rounded-md text-[11px] bg-transparent text-[var(--color-text)] outline-none flex-1"
                placeholder="From"
              />
              <span className="text-gray-400 text-[10px]">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setActivePreset('all'); }}
                className="h-7 px-2 border border-[var(--color-border)] rounded-md text-[11px] bg-transparent text-[var(--color-text)] outline-none flex-1"
              />
            </div>
          </div>
        </div>

        {/* 4 Key Financial Summary Cards */}
        <KpiGrid cols={4}>
          {[
            { label: 'OPENING BALANCE', value: fmt(activeStatement.openingBalance), desc: `As of ${dateFrom ? new Date(dateFrom).toLocaleDateString() : 'Beginning'}`, icon: Clock, tone: 'blue' },
            { label: 'TOTAL INVOICED (+)', value: fmt(activeStatement.totalDebits), desc: 'Invoices issued in period', icon: FileText, tone: 'rose' },
            { label: 'PAYMENTS / CREDITS (-)', value: fmt(activeStatement.totalCredits), desc: 'Receipts & credit notes', icon: CreditCard, tone: 'emerald' },
            { label: 'CLOSING BALANCE DUE', value: fmt(activeStatement.closingBalance), desc: 'Net receivable position', icon: DollarSign, tone: 'indigo' },
          ].map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </KpiGrid>

        {/* Statement Transactions Table */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs overflow-hidden">
          {/* Table Header Filter Bar */}
          <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">
                <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-blue-500 to-cyan-700" />
                Statement Transactions
              </p>
              <span className="text-[11px] text-[var(--color-text-muted)]">{displayedStatementLines.length} Entries</span>
            </div>

            {/* Type Tabs */}
            <div className="flex items-center gap-1">
              {(['all', 'Invoice', 'Payment', 'CreditNote'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    typeFilter === t
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'Invoice' ? 'Invoices' : t === 'Payment' ? 'Payments' : 'Credit Notes'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-blue-500/[0.05] dark:bg-blue-400/[0.07] text-[var(--color-text-muted)] border-b border-[var(--color-border)] text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Doc #</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Description & Notes</th>
                  <th className="py-2.5 px-3 text-right">Debit (+)</th>
                  <th className="py-2.5 px-3 text-right">Credit (-)</th>
                  <th className="py-2.5 px-3.5 text-right">Running Balance</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {/* Opening Balance Row */}
                {dateFrom && (
                  <tr className="bg-gray-50/70 dark:bg-gray-900/40 font-semibold">
                    <td className="py-2 px-3.5 text-[var(--color-text-muted)]">{dateFrom}</td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold">
                        B/F
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[var(--color-text-muted)]">—</td>
                    <td className="py-2 px-3 text-[var(--color-text-muted)]">—</td>
                    <td className="py-2 px-3 font-medium text-[var(--color-text-strong)]">Opening Balance Brought Forward</td>
                    <td className="py-2 px-3 text-right text-[var(--color-text-muted)]">—</td>
                    <td className="py-2 px-3 text-right text-[var(--color-text-muted)]">—</td>
                    <td className="py-2 px-3.5 text-right font-bold text-[var(--color-text-strong)]">
                      {fmt(activeStatement.openingBalance)}
                    </td>
                    <td className="py-2 px-3 text-center text-[var(--color-text-muted)]">—</td>
                  </tr>
                )}

                {displayedStatementLines.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[var(--color-text-muted)]">
                      <EmptyState
                        icon={FileCheck}
                        title="No transactions found"
                        hint="No transactions were recorded for this customer within the selected period."
                      />
                    </td>
                  </tr>
                ) : (
                  displayedStatementLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                      <td className="py-2.5 px-3.5 text-[var(--color-text)] whitespace-nowrap">{line.date}</td>
                      <td className="py-2.5 px-3">
                        <StatusChip
                          status={line.type}
                          label={line.typeLabel}
                          hex={line.type === 'Invoice' ? '#f43f5e' : line.type === 'Payment' ? '#10b981' : '#8b5cf6'}
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[var(--color-text-strong)]">
                        {line.docNumber}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--color-text-muted)] whitespace-nowrap">
                        {line.dueDate || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--color-text)] max-w-xs truncate" title={line.description}>
                        {line.description}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                        {line.debit > 0 ? fmt(line.debit) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {line.credit > 0 ? fmt(line.credit) : '—'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-[var(--color-text-strong)]">
                        {fmt(line.balance)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusChip status={line.status} label={line.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {displayedStatementLines.length > 0 && (
                <tfoot className="bg-gray-50 dark:bg-gray-900 border-t-2 border-[var(--color-border)] font-bold text-xs">
                  <tr>
                    <td colSpan={5} className="py-3 px-3.5 text-right uppercase tracking-wider text-[var(--color-text-muted)]">
                      Period Totals & Closing Balance:
                    </td>
                    <td className="py-3 px-3 text-right text-rose-600 dark:text-rose-400">
                      {fmt(activeStatement.totalDebits)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">
                      {fmt(activeStatement.totalCredits)}
                    </td>
                    <td className="py-3 px-3.5 text-right text-base text-blue-600 dark:text-blue-400 font-extrabold">
                      {fmt(activeStatement.closingBalance)}
                    </td>
                    <td className="py-3 px-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Aging Breakdown Footer Card */}
        <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Aging Analysis Breakdown (Unpaid Receivables)</p>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              Calculated on invoice due dates
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block">Current (Not Due)</span>
              <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-100 mt-0.5 block">{fmt(activeStatement.aging.current)}</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block">1 - 30 Days</span>
              <span className="text-xs font-extrabold text-amber-900 dark:text-amber-100 mt-0.5 block">{fmt(activeStatement.aging.days30)}</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block">31 - 60 Days</span>
              <span className="text-xs font-extrabold text-amber-900 dark:text-amber-100 mt-0.5 block">{fmt(activeStatement.aging.days60)}</span>
            </div>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 block">61 - 90 Days</span>
              <span className="text-xs font-extrabold text-rose-900 dark:text-rose-100 mt-0.5 block">{fmt(activeStatement.aging.days90)}</span>
            </div>
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700">
              <span className="text-[10px] font-bold text-rose-800 dark:text-rose-200 block">90+ Days (Critical)</span>
              <span className="text-xs font-extrabold text-rose-950 dark:text-rose-100 mt-0.5 block">{fmt(activeStatement.aging.days90Plus)}</span>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 block">Total Due</span>
              <span className="text-xs font-extrabold text-blue-900 dark:text-blue-100 mt-0.5 block">{fmt(activeStatement.closingBalance)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ─── VIEW 1: CUSTOMERS LIST WITH INDIVIDUAL STATEMENT DOWNLOADS ────────────
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-blue-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-blue-500 to-cyan-700" />
              <div className="absolute inset-0 flex items-center justify-center"><FileText className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Customer Statements &amp; Ledger</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400"><span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Generate and download individual customer account statements with comprehensive debit/credit ledgers.
              </p>
            </div>
          </div>

          {/* Search, Filter & Global Export Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Robust Search Box - Icon and Input in normal flow */}
          <div className="flex items-center h-8.5 w-64 px-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200 transition-all shadow-2xs">
            <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customer, ID, phone..."
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                padding: '0 !important',
                width: '100%',
                fontSize: '12px',
                color: 'var(--color-text)',
                boxShadow: 'none',
              }}
              className="!p-0 !border-0 !outline-none !bg-transparent w-full text-xs text-[var(--color-text)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-gray-400 hover:text-gray-600 text-sm px-1 leading-none font-bold"
                title="Clear"
              >
                ×
              </button>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-8.5 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-blue-500 transition-colors"
          >
            <option value="all">⚡ All Customers ({customerSummaries.length})</option>
            <option value="outstanding">🔴 Outstanding Balance Only ({outstandingAccountsCount})</option>
            <option value="overdue">⚠️ Overdue Accounts ({customerSummaries.filter((c) => c.overdueAmount > 0).length})</option>
            <option value="paid">🟢 Fully Paid ({currentAccountsCount})</option>
          </select>

          {/* Export All Summary Button */}
          <button
            onClick={exportAllSummaryExcel}
            className="secondary h-8.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            title="Export all customers summary to Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export Summary
          </button>

          {/* Refresh Data */}
          <button
            onClick={loadData}
            className="secondary h-8.5 w-8.5 rounded-lg flex items-center justify-center text-xs text-[var(--color-text)]"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <KpiGrid cols={4}>
        {[
          { label: 'TOTAL REGISTERED', value: customers.length, desc: 'Customer accounts', icon: Users, tone: 'blue' },
          { label: 'TOTAL RECEIVABLES', value: fmt(totalReceivables), desc: 'Outstanding AR balance', icon: DollarSign, tone: 'indigo' },
          { label: 'OVERDUE RECEIVABLES', value: fmt(totalOverdue), desc: 'Past due invoices', icon: AlertTriangle, tone: 'amber' },
          { label: 'SETTLED ACCOUNTS', value: currentCountAccounts(customerSummaries), desc: 'Zero balance / fully paid', icon: CheckCircle2, tone: 'emerald' },
        ].map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </KpiGrid>

      {/* Customers List Table with Individual Download Buttons */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">
            <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-blue-500 to-cyan-700" />
            Customers Directory
          </p>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {filteredCustomers.length} customers · Click <strong>Download PDF</strong> on any customer to export their individual statement instantly.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-blue-500/[0.05] dark:bg-blue-400/[0.07] text-[var(--color-text-muted)] border-b border-[var(--color-border)] text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Customer &amp; ID</th>
                <th className="py-2.5 px-3">Contact Details</th>
                <th className="py-2.5 px-3 text-right">Total Invoiced</th>
                <th className="py-2.5 px-3 text-right">Total Paid</th>
                <th className="py-2.5 px-3 text-right">Outstanding Balance</th>
                <th className="py-2.5 px-3 text-center">AR Status</th>
                <th className="py-2.5 px-3.5 text-right">Individual Statement Download & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <TableSkeleton rows={6} />
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--color-text-muted)]">
                    <EmptyState
                      icon={Users}
                      title="No customer accounts found"
                      hint="No customer accounts matched your search criteria."
                    />
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const isOutstanding = c.outstandingBalance > 0.01;
                  const isOverdue = c.overdueAmount > 0.01;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-900/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedCustomerId(c.id)}
                    >
                      {/* Customer Code & Name */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {(c.name || c.companyName || 'C').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-[var(--color-text-strong)] hover:text-blue-600 transition-colors block">
                              {c.name || c.companyName}
                            </span>
                            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                              {c.customerNumber || 'CUST'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="py-3 px-3 text-[var(--color-text-muted)]">
                        <div className="space-y-0.5">
                          {c.email && <div className="text-[11px] truncate max-w-[150px]">{c.email}</div>}
                          {c.phone && <div className="text-[10px]">{c.phone}</div>}
                          {!c.email && !c.phone && <span>—</span>}
                        </div>
                      </td>

                      {/* Total Invoiced */}
                      <td className="py-3 px-3 text-right font-medium text-[var(--color-text)]">
                        {fmt(c.totalInvoiced)}
                      </td>

                      {/* Total Paid */}
                      <td className="py-3 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {fmt(c.totalPaid)}
                      </td>

                      {/* Outstanding Balance */}
                      <td className="py-3 px-3 text-right font-bold">
                        <span
                          className={
                            isOutstanding
                              ? 'text-rose-600 dark:text-rose-400 text-sm'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }
                        >
                          {fmt(c.outstandingBalance)}
                        </span>
                        {isOverdue && (
                          <span className="block text-[10px] text-amber-600 font-normal">
                            ({fmt(c.overdueAmount)} overdue)
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 text-center">
                        <StatusChip
                          status={isOverdue ? 'overdue' : isOutstanding ? 'partial' : 'paid'}
                          label={isOverdue ? 'Overdue' : isOutstanding ? 'Outstanding' : 'Paid'}
                          hex={isOverdue ? '#f43f5e' : isOutstanding ? '#f59e0b' : '#10b981'}
                        />
                      </td>

                      {/* INDIVIDUAL ACTION & DOWNLOAD BUTTONS */}
                      <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Click Individual PDF Statement Download Button */}
                          <button
                            onClick={() => generateCustomerStatementPDF(c.id)}
                            className="h-7.5 px-2.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shadow-2xs"
                            title="Download Statement PDF for this customer"
                          >
                            <Download className="w-3 h-3" /> PDF Statement
                          </button>

                          {/* 1-Click Individual Excel Export Button */}
                          <button
                            onClick={() => exportCustomerExcel(c.id)}
                            className="h-7.5 px-2 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shadow-2xs"
                            title="Download Statement Excel for this customer"
                          >
                            <FileSpreadsheet className="w-3 h-3" />
                          </button>

                          {/* View Full Interactive Statement View */}
                          <button
                            onClick={() => setSelectedCustomerId(c.id)}
                            className="h-7.5 px-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                            title="Open interactive statement"
                          >
                            View <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function currentCountAccounts(summaries: any[]) {
  return summaries.filter((c) => c.outstandingBalance <= 0.01).length;
}

export default CustomerStatementsWorkspace;
