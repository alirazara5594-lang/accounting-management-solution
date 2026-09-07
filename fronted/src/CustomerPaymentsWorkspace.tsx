import React, { useEffect, useState, useMemo } from 'react';
import { useCustomerPaymentsStore } from './stores/useCustomerPaymentsStore';
import { salesApi, type Invoice } from './api/modules/sales.api';
import { customersApi, type Customer } from './api/modules/customers.api';
import { apiClient } from './api/client';
import { useCompanyStore } from './stores';
import { money } from './lib/currency';
import { formatInvoiceNumber } from './lib/invoiceNumbering';
import { downloadExcel, downloadCSV } from './lib/exportUtils';
import { KpiCard, KpiGrid } from './components/ui/kpi-card';
import { StatusChip } from './components/ui/status-chip';
import { EmptyState, TableSkeleton } from './components/ui/empty-state';
import {
  Plus, X, DollarSign, Receipt,
  Search, Download,
  CheckCircle2, Users, RefreshCw, BarChart3
} from 'lucide-react';
import { ExportDropdown } from './components/ExportDropdown';
import { CompactSelect } from './components/CompactSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash', region: 'Global' },
  { value: 'Cheque', label: 'Cheque / Check', region: 'Global' },
  { value: 'BankTransfer', label: 'Bank Transfer', region: 'Global' },
  { value: 'ACH', label: 'ACH', region: 'US / Canada' },
  { value: 'WireTransfer', label: 'Wire Transfer', region: 'Global' },
  { value: 'BACS', label: 'BACS', region: 'UK' },
  { value: 'FasterPayments', label: 'Faster Payments', region: 'UK' },
  { value: 'SEPA', label: 'SEPA Transfer', region: 'Europe' },
  { value: 'CreditCard', label: 'Credit Card', region: 'Global' },
  { value: 'DebitCard', label: 'Debit Card', region: 'Global' },
  { value: 'OnlineBanking', label: 'Online Banking', region: 'Global' },
  { value: 'MobilePayment', label: 'Mobile Payment (JazzCash / EasyPaisa)', region: 'PK' },
  { value: 'PayPal', label: 'PayPal', region: 'Global' },
  { value: 'DirectDebit', label: 'Direct Debit', region: 'UK / EU' },
  { value: 'Other', label: 'Other', region: '' },
];

const NEEDS_BANK_ACCOUNT = [
  'BankTransfer', 'ACH', 'WireTransfer', 'BACS', 'FasterPayments',
  'SEPA', 'OnlineBanking', 'DirectDebit',
];

interface DepositAccount { id: string; code: string; name: string; }

const emptyForm = {
  customerId: '',
  invoiceId: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  amount: '',
  paymentMethod: 'BankTransfer',
  depositToAccountId: '',
  reference: '',
  memo: '',
};

export function CustomerPaymentsWorkspace({
  activeEntityId: propEntityId,
  entities: propEntities = []
}: {
  activeEntityId?: string;
  entities?: any[];
} = {}) {
  const { payments, loading, fetchAll, create } = useCustomerPaymentsStore();
  const companyStore = useCompanyStore();
  const activeEntityId = propEntityId || companyStore.activeEntityId;
  const entities = propEntities.length > 0 ? propEntities : companyStore.entities;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [depositAccounts, setDepositAccounts] = useState<DepositAccount[]>([]);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Listen for 1-click 'Record Payment' from Sales Workspace
  useEffect(() => {
    const raw = localStorage.getItem('ams_pending_customer_payment');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        localStorage.removeItem('ams_pending_customer_payment');
        if (parsed.customerId) {
          setFormData(prev => ({
            ...prev,
            customerId: parsed.customerId,
            invoiceId: parsed.invoiceId || '',
            amount: parsed.amount ? String(parsed.amount) : prev.amount
          }));
          setIsModalOpen(true);
        }
      } catch {}
    }
  }, []);

  const activeCompany = useMemo(() => {
    return entities.find((e) => e.id === activeEntityId) || entities[0];
  }, [entities, activeEntityId]);

  const loadData = () => {
    fetchAll(activeEntityId);
    companyStore.fetchCompanies();
  };

  useEffect(() => {
    loadData();
  }, [activeEntityId]);

  useEffect(() => {
    if (!isModalOpen) return;
    (async () => {
      try {
        const [custs, invs, accts] = await Promise.all([
          customersApi.getCustomers(activeEntityId),
          salesApi.getInvoices(activeEntityId),
          apiClient<DepositAccount[]>('/customer-payments/deposit-accounts'),
        ]);
        setCustomers(custs);
        setInvoices(
          invs.filter(
            (i: any) =>
              i.status !== 0 &&
              i.status !== '0' &&
              String(i.status).toLowerCase() !== 'draft' &&
              String(i.status).toLowerCase() !== 'paid' &&
              i.status !== 2 &&
              String(i.status).toLowerCase() !== 'void' &&
              i.status !== 3
          )
        );
        setDepositAccounts(accts);
        if (accts.length > 0 && !formData.depositToAccountId) {
          setFormData((prev) => ({ ...prev, depositToAccountId: accts[0].id }));
        }
      } catch {
        /* fallback gracefully */
      }
    })();
  }, [isModalOpen, activeEntityId]);

  const filteredInvoices = formData.customerId
    ? invoices.filter((i: any) => i.customerId === formData.customerId)
    : invoices;

  const onCustomerChange = (customerId: string) => {
    setFormData({ ...formData, customerId, invoiceId: '', amount: '' });
  };

  const onInvoiceChange = (invoiceId: string) => {
    const inv = invoices.find((i: any) => i.id === invoiceId);
    setFormData({
      ...formData,
      invoiceId,
      customerId: inv ? inv.customerId : formData.customerId,
      amount: inv ? String(inv.amountDue ?? inv.totalAmount) : formData.amount,
    });
  };

  const onMethodChange = (method: string) => {
    const needsBank = NEEDS_BANK_ACCOUNT.includes(method);
    setFormData({
      ...formData,
      paymentMethod: method,
      depositToAccountId: needsBank
        ? (formData.depositToAccountId || depositAccounts[0]?.id || '')
        : (method === 'Cash'
          ? (depositAccounts.find((a) => a.name.toLowerCase().includes('cash'))?.id || depositAccounts[0]?.id || '')
          : formData.depositToAccountId),
    });
  };

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError('');
    const amt = parseFloat(formData.amount);
    if (!formData.customerId) { setFormError('Please select a customer.'); return; }
    if (!amt || amt <= 0) { setFormError('Amount must be greater than zero.'); return; }
    if (!formData.depositToAccountId) { setFormError('Please select a Deposit To bank/cash account.'); return; }

    setSaving(true);
    try {
      await create({
        companyId: activeEntityId,
        customerId: formData.customerId,
        invoiceId: formData.invoiceId || undefined,
        paymentDate: formData.paymentDate,
        amount: amt,
        paymentMethod: formData.paymentMethod,
        depositToAccountId: formData.depositToAccountId,
        reference: formData.reference || undefined,
        memo: formData.memo || undefined,
      });
      setIsModalOpen(false);
      setFormData({ ...emptyForm, paymentDate: new Date().toISOString().slice(0, 10) });
      fetchAll(activeEntityId);
    } catch (err: any) {
      setFormError(err?.data?.error || err?.message || 'Failed to record customer receipt.');
    } finally {
      setSaving(false);
    }
  };

  const openModal = () => {
    setFormError('');
    setFormData({ ...emptyForm, paymentDate: new Date().toISOString().slice(0, 10) });
    setIsModalOpen(true);
  };

  const filteredPayments = useMemo(() => {
    return payments
      .filter((p: any) => {
        if (methodFilter !== 'all' && p.paymentMethod !== methodFilter) return false;
        if (statusFilter !== 'all' && String(p.status).toLowerCase() !== statusFilter.toLowerCase()) return false;

        if (query.trim()) {
          const q = query.toLowerCase();
          const matchesRef = (p.receiptNumber || '').toLowerCase().includes(q) || (p.reference || '').toLowerCase().includes(q);
          const matchesCust = (p.customerName || p.customerId || '').toLowerCase().includes(q);
          const matchesInv = (p.invoiceNumber || '').toLowerCase().includes(q);
          const matchesBank = (p.depositToAccountName || '').toLowerCase().includes(q);
          if (!matchesRef && !matchesCust && !matchesInv && !matchesBank) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        const dateA = a.date || a.paymentDate || a.createdAt || '';
        const dateB = b.date || b.paymentDate || b.createdAt || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        const numA = a.receiptNumber || a.reference || a.paymentNumber || '';
        const numB = b.receiptNumber || b.reference || b.paymentNumber || '';
        return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [payments, query, methodFilter, statusFilter]);

  const totalReceived = filteredPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const totalCount = filteredPayments.length;
  const avgReceipt = totalCount > 0 ? totalReceived / totalCount : 0;
  const uniqueCustomers = new Set(filteredPayments.map((p: any) => p.customerName || p.customerId)).size;

  const generateReceiptPDF = (p: any) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    const primaryColor: [number, number, number] = [15, 76, 129];
    const darkColor: [number, number, number] = [15, 23, 42];
    const grayColor: [number, number, number] = [100, 116, 139];
    const lightBg: [number, number, number] = [248, 250, 252];
    const borderGray: [number, number, number] = [226, 232, 240];

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL PAYMENT RECEIPT', margin, 14);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt #: ${p.receiptNumber || 'RCPT'}`, margin, 21);
    doc.text(`Receipt Date: ${p.date}`, pageWidth - margin, 14, { align: 'right' });
    doc.text(`Status: ${p.status || 'Posted'}`, pageWidth - margin, 21, { align: 'right' });

    const boxY = 34;
    const boxH = 34;
    const colW = (contentWidth - 6) / 2;

    doc.setFillColor(...lightBg);
    doc.setDrawColor(...borderGray);
    doc.roundedRect(margin, boxY, colW, boxH, 2, 2, 'FD');

    doc.setTextColor(...primaryColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(activeCompany?.name || 'Company ERP', margin + 4, boxY + 7);

    doc.setTextColor(...darkColor);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const compAny = activeCompany as any;
    let compY = boxY + 13;
    if (compAny?.taxId || compAny?.ntn) {
      doc.text(`Tax ID / NTN: ${compAny.taxId || compAny.ntn}`, margin + 4, compY);
      compY += 4.5;
    }
    if (compAny?.country || compAny?.legalName) {
      doc.text(`${compAny.legalName || ''} • ${compAny.country || ''}`.trim(), margin + 4, compY);
      compY += 4.5;
    }
    doc.text(`Base Currency: ${activeCompany?.currencyCode || 'PKR'}`, margin + 4, compY);

    const custX = margin + colW + 6;
    doc.setFillColor(...lightBg);
    doc.roundedRect(custX, boxY, colW, boxH, 2, 2, 'FD');

    doc.setTextColor(...primaryColor);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('RECEIVED FROM (CUSTOMER)', custX + 4, boxY + 7);

    doc.setTextColor(...darkColor);
    doc.setFontSize(10);
    doc.text(p.customerName || p.customerId || 'Customer', custX + 4, boxY + 14);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Mode: ${p.paymentMethod || 'Bank Transfer'}`, custX + 4, boxY + 20);
    doc.text(`Deposit Account: ${p.depositToAccountName || 'Main Operating Account'}`, custX + 4, boxY + 25);
    if (p.reference) {
      doc.text(`Reference / Check #: ${p.reference}`, custX + 4, boxY + 30);
    }

    const bannerY = boxY + boxH + 6;
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(margin, bannerY, contentWidth, 18, 2, 2, 'FD');

    doc.setTextColor(30, 58, 138);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT RECEIVED', margin + 4, bannerY + 6.5);

    doc.setFontSize(14);
    doc.text(money(p.amount || 0), margin + 4, bannerY + 14);

    const tableStartY = bannerY + 24;
    const tableHeaders = ['Invoice Number', 'Payment Date', 'Payment Method', 'Deposit Account', 'Amount Applied'];
    const tableRows = [[
      p.invoiceNumber || 'Unallocated / On-Account',
      p.date,
      p.paymentMethod,
      p.depositToAccountName || 'Operating Bank',
      money(p.amount || 0),
    ]];

    autoTable(doc, {
      startY: tableStartY,
      head: [tableHeaders],
      body: tableRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3, textColor: darkColor },
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        4: { halign: 'right', fontStyle: 'bold' },
      },
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setTextColor(...grayColor);
    doc.setFontSize(7);
    doc.text('Official Customer Receipt Acknowledgement. Generated from ERP Accounts Receivable Module.', margin, pageHeight - 9);

    const cleanReceipt = (p.receiptNumber || 'Receipt').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Customer_Receipt_${cleanReceipt}.pdf`);
  };

  const exportPaymentsExcel = () => {
    const headers = ['Receipt #', 'Date', 'Customer', 'Invoice #', 'Amount', 'Payment Method', 'Deposit Account', 'Reference', 'Status'];
    const rows = filteredPayments.map((p: any) => [
      p.receiptNumber || '',
      p.date,
      p.customerName || p.customerId,
      p.invoiceNumber || 'On-Account',
      p.amount,
      p.paymentMethod,
      p.depositToAccountName || '',
      p.reference || '',
      p.status,
    ]);
    downloadExcel(`Customer_Payments_Register_${new Date().toISOString().slice(0, 10)}`, 'Payments', headers, rows);
  };

  const exportPaymentsCSV = () => {
    const headers = ['Receipt #', 'Date', 'Customer', 'Invoice #', 'Amount', 'Payment Method', 'Deposit Account', 'Reference', 'Status'];
    const rows = filteredPayments.map((p: any) => [
      p.receiptNumber || '',
      p.date,
      p.customerName || p.customerId,
      p.invoiceNumber || 'On-Account',
      p.amount,
      p.paymentMethod,
      p.depositToAccountName || '',
      p.reference || '',
      p.status,
    ]);
    downloadCSV(`Customer_Payments_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-teal-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 shrink-0">
              <div className="absolute inset-[5px] rotate-45 rounded-[10px] shadow-lg bg-gradient-to-br from-teal-500 to-emerald-700" />
              <div className="absolute inset-0 flex items-center justify-center"><DollarSign className="w-5 h-5 text-white" /></div>
            </div>
            <div className="flex flex-col leading-tight gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-[var(--color-text-strong)]">Customer Payments &amp;</h1>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black tracking-tight text-[var(--color-text-strong)]">Receipts</h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-teal-500/25 bg-teal-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 shrink-0"><span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Record customer collections, apply remittances against invoices, and manage bank deposit reconciliations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="flex items-center h-8.5 w-60 px-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200 transition-all shadow-2xs">
              <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search receipt, customer, ref..."
                className="!p-0 !border-0 !outline-none !bg-transparent w-full text-xs text-[var(--color-text)]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-gray-400 hover:text-gray-600 text-sm px-1 leading-none font-bold"
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="h-8.5 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-blue-500 transition-colors"
            >
              <option value="all">⚡ All Methods</option>
              <option value="BankTransfer">🏦 Bank Transfer</option>
              <option value="Cash">💵 Cash</option>
              <option value="Cheque">📜 Cheque</option>
              <option value="CreditCard">💳 Credit Card</option>
              <option value="WireTransfer">🌐 Wire Transfer</option>
              <option value="MobilePayment">📱 Mobile Payment</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8.5 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-blue-500 transition-colors"
            >
              <option value="all">📋 All Statuses</option>
              <option value="posted">Posted</option>
              <option value="draft">Draft</option>
              <option value="void">Void</option>
            </select>

            <ExportDropdown
              onExcel={exportPaymentsExcel}
              onCSV={exportPaymentsCSV}
              variant="outline"
              size="sm"
              align="right"
              label="Export"
            />

            <button
              onClick={openModal}
              className="primary h-8.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Receive Payment
            </button>
          </div>
        </div>
      </div>

      <KpiGrid cols={4}>
        {[
          { label: 'TOTAL COLLECTED', value: money(totalReceived), desc: 'Customer payments received', icon: DollarSign, tone: 'blue' },
          { label: 'TOTAL RECEIPTS', value: totalCount, desc: 'Settlement transactions', icon: Receipt, tone: 'teal' },
          { label: 'PAYING CUSTOMERS', value: uniqueCustomers, desc: 'Active accounts settled', icon: Users, tone: 'violet' },
          { label: 'AVERAGE RECEIPT', value: money(avgReceipt), desc: 'Per receipt average', icon: BarChart3, tone: 'emerald' },
        ].map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </KpiGrid>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">
            <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-teal-500 to-emerald-700" />
            Collections &amp; Receipts Register
          </p>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {filteredPayments.length} receipts · Click <strong>Receipt PDF</strong> on any row to download an official payment receipt slip.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-teal-500/[0.05] dark:bg-teal-400/[0.07] text-[var(--color-text-muted)] border-b border-[var(--color-border)] text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2 px-2.5">Receipt #</th>
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2">Customer</th>
                <th className="py-2 px-2">Invoice Applied</th>
                <th className="py-2 px-2 text-right">Amount Received</th>
                <th className="py-2 px-2">Method</th>
                <th className="py-2 px-2">Deposit To Account</th>
                <th className="py-2 px-2 text-center">Status</th>
                <th className="py-2 px-2.5 text-right">Receipt Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={9}>
                    <TableSkeleton rows={6} />
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[var(--color-text-muted)]">
                    <EmptyState
                      icon={CheckCircle2}
                      title="No customer payments found"
                      hint="Record your first customer receipt or adjust the search and filters."
                    />
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                    <td className="py-2 px-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {p.receiptNumber}
                    </td>
                    <td className="py-2 px-2 text-[var(--color-text)] whitespace-nowrap">{p.date}</td>
                    <td className="py-2 px-2 font-semibold text-[var(--color-text-strong)]">
                      {p.customerName || p.customerId}
                    </td>
                    <td className="py-2 px-2 font-mono text-[var(--color-text)]">
                      {p.invoiceNumber || <span className="text-gray-400 italic">On-Account</span>}
                    </td>
                    <td className="py-2 px-2 text-right font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      {money(p.amount || 0)}
                    </td>
                    <td className="py-2 px-2">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[var(--color-text)] font-semibold text-[10px]">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-[var(--color-text-muted)]">
                      {p.depositToAccountName || 'Bank Account'}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <StatusChip
                        status={String(p.status || 'posted').toLowerCase()}
                        label={p.status || 'Posted'}
                        hex={String(p.status || '').toLowerCase() === 'void' ? '#ef4444' : String(p.status || '').toLowerCase() === 'draft' ? '#94a3b8' : '#10b981'}
                      />
                    </td>
                    <td className="py-2 px-2.5 text-right">
                      <button
                        onClick={() => generateReceiptPDF(p)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] font-semibold transition-all shadow-2xs"
                        title="Download Payment Receipt PDF"
                      >
                        <Download className="w-3 h-3" /> Receipt PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredPayments.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-gray-900 border-t-2 border-[var(--color-border)] font-bold text-xs">
                <tr>
                  <td colSpan={4} className="py-2.5 px-2.5 uppercase tracking-wider text-[var(--color-text-muted)] text-right">
                    Total Collections Received:
                  </td>
                  <td className="py-2.5 px-2 text-right text-sm text-emerald-600 dark:text-emerald-400 font-extrabold">
                    {money(totalReceived)}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-gray-50/50 dark:bg-gray-900/50">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-strong)] flex items-center gap-2">
                  <span className="text-lg">💰</span> Receive Customer Payment
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Record customer collection and reconcile against invoice.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-text-strong)]">Customer *</label>
                <CompactSelect
                  value={formData.customerId}
                  onChange={(val) => onCustomerChange(val)}
                  options={customers.map((c: any) => ({
                    value: c.id,
                    label: `${c.name}${c.customerNumber ? ` (${c.customerNumber})` : ''}`
                  }))}
                  placeholder="Select customer..."
                  className="w-full h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-text-strong)]">Apply to Invoice (Optional)</label>
                <CompactSelect
                  value={formData.invoiceId}
                  onChange={(val) => onInvoiceChange(val)}
                  options={[
                    { value: '', label: 'On-Account (Unapplied collection)' },
                    ...filteredInvoices.map((inv: any, idx: number) => ({
                      value: inv.id,
                      label: `${formatInvoiceNumber(inv.invoiceNumber || inv.reference, idx + 1)} — Due: ${money(inv.amountDue ?? inv.totalAmount)} (${(inv.invoiceDate || inv.date || '').slice(0, 10)})`
                    }))
                  ]}
                  placeholder="Select invoice to apply..."
                  className="w-full h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--color-text-strong)]">Amount Received *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] font-mono font-bold outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--color-text-strong)]">Payment Date *</label>
                  <input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--color-text-strong)]">Payment Method *</label>
                  <CompactSelect
                    value={formData.paymentMethod}
                    onChange={(val) => onMethodChange(val)}
                    options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))}
                    placeholder="Select payment method..."
                    className="w-full h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--color-text-strong)]">Deposit To Account *</label>
                  <CompactSelect
                    value={formData.depositToAccountId}
                    onChange={(val) => setFormData({ ...formData, depositToAccountId: val })}
                    options={depositAccounts.map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` }))}
                    placeholder="Select funding account..."
                    className="w-full h-9"
                  />
                </div>
              </div>

              {/* Reference & Memo */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-text-strong)]">Reference / Transaction ID</label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="e.g. Wire confirmation, cheque #, JazzCash TID"
                  className="w-full h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-text-strong)]">Notes / Memo</label>
                <textarea
                  rows={2}
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="Internal notes regarding this collection..."
                  className="w-full p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Double Entry Preview */}
              {formData.amount && formData.depositToAccountId && (
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-[var(--color-border)]">
                  <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Double-Entry Accounting Preview</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px]">
                        <th className="text-left pb-1">Account</th>
                        <th className="text-right pb-1">Debit</th>
                        <th className="text-right pb-1">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-1 text-[var(--color-text)]">{depositAccounts.find(a => a.id === formData.depositToAccountId)?.name || 'Cash & Bank Asset'}</td>
                        <td className="py-1 text-right font-bold text-emerald-600">{money(parseFloat(formData.amount) || 0)}</td>
                        <td className="py-1 text-right text-[var(--color-text-muted)]">—</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-[var(--color-text)]">Accounts Receivable Asset</td>
                        <td className="py-1 text-right text-[var(--color-text-muted)]">—</td>
                        <td className="py-1 text-right font-bold text-blue-600">{money(parseFloat(formData.amount) || 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="secondary h-9 px-4 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="primary h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Record Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerPaymentsWorkspace;
